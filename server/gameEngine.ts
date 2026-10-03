import { 
  AdminConfig, 
  Card, 
  GameHistoryEntry, 
  HandEvaluation, 
  Player, 
  RoundPhase, 
  SpotId, 
  TableSpot, 
  TableState, 
  TransactionRecord 
} from '../src/types/game.js';
import { createDeck, evaluateThreeCardHand, shuffleDeck } from './deck.js';
import { 
  getFirebaseUserBalance, 
  setFirebaseUserBalance, 
  deleteFirebaseUser,
  saveFirebaseRoundHistory, 
  saveFirebaseTransaction, 
  getFirebaseGameHistory,
  getFirebaseAdminConfig,
  setFirebaseAdminConfig 
} from './firebase.js';

export interface ClientConnection {
  id: string;
  userId: string;
  tableId: string;
  send: (data: string) => void;
}

export class GameManager {
  private static instance: GameManager;
  public tables: Map<string, TableState> = new Map();
  public history: GameHistoryEntry[] = [];
  public transactions: TransactionRecord[] = [];
  public userBalances: Map<string, number> = new Map();
  public connections: Map<string, ClientConnection> = new Map();
  
  // Track all user bets per round: Map<userId, Record<SpotId, number>>
  private activeUserBets: Map<string, Record<SpotId, number>> = new Map();

  // Cards dealt secretly to spots until showdown
  private secretSpotCards: Record<SpotId, Card[]> = {
    A: [],
    B: [],
    C: [],
  };

  public adminConfig: AdminConfig = {
    isGameEnabled: true,
    defaultChips: [100, 1000, 10000, 100000],
    roundCountdownSeconds: 25,
    minBet: 100,
    maxBet: 500000,
    autoFillBots: true,
    defaultPlayerBalance: 0,
    whatsappNumber: '201000000000',
    globalWinRate: 40,
    houseMode: 'casino_standard',
    gameWinRates: {
      global: 40,
      teenPatti: 40,
      rocketCrash: 42,
      mines: 45,
      horseRacing: 38,
      happyCake: 40,
      luckySeven: 44,
      dragonTiger: 45,
    },
  };

  private timerInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.initDefaultTable();
    this.initFirebaseData();
    this.startServerTicker();
  }

  private async initFirebaseData() {
    try {
      // Load game history from Firestore
      const dbHistory = await getFirebaseGameHistory(30);
      if (dbHistory && dbHistory.length > 0) {
        this.history = dbHistory;
      }

      // Load admin config from Firestore if available
      const savedConfig = await getFirebaseAdminConfig();
      if (savedConfig) {
        this.adminConfig = { ...this.adminConfig, ...savedConfig };
      }
    } catch (e) {
      console.error('Failed to initialize Firebase data:', e);
    }
  }

  public static getInstance(): GameManager {
    if (!GameManager.instance) {
      GameManager.instance = new GameManager();
    }
    return GameManager.instance;
  }

  private initDefaultTable() {
    const tableId = 'table-main';

    const defaultSpots: Record<SpotId, TableSpot> = {
      A: { id: 'A', pot: 0, cards: [] },
      B: { id: 'B', pot: 0, cards: [] },
      C: { id: 'C', pot: 0, cards: [] },
    };

    const table: TableState = {
      id: tableId,
      name: 'Teen Patti Royal',
      maxPlayers: 100,
      minBet: this.adminConfig.minBet,
      maxBet: this.adminConfig.maxBet,
      availableChips: [...this.adminConfig.defaultChips],
      players: [],
      spots: defaultSpots,
      userBets: { A: 0, B: 0, C: 0 },
      totalPot: 0,
      phase: 'COUNTDOWN',
      timerRemaining: this.adminConfig.roundCountdownSeconds,
      timerTotal: this.adminConfig.roundCountdownSeconds,
      roundNumber: 1,
      isGameActive: true,
    };

    this.tables.set(tableId, table);
  }

  public async loadUserBalanceFromFirebase(userId: string): Promise<number> {
    if (!userId || typeof userId !== 'string' || !userId.trim() || userId.startsWith('usr_')) {
      return 0;
    }
    const cleanId = userId.trim();
    const bal = await getFirebaseUserBalance(cleanId, 0);
    this.userBalances.set(cleanId, bal);
    return bal;
  }

  public getOrCreateUserBalance(userId: string): number {
    if (!userId || typeof userId !== 'string' || !userId.trim() || userId.startsWith('usr_')) {
      return 0;
    }
    const cleanId = userId.trim();
    if (!this.userBalances.has(cleanId)) {
      this.userBalances.set(cleanId, 0);
      // Asynchronously fetch and sync with Firestore only if a real user id exists
      this.loadUserBalanceFromFirebase(cleanId).catch(console.error);
    }
    return this.userBalances.get(cleanId) ?? 0;
  }

  public rechargeBalance(userId: string, userName: string, amount: number): number {
    const current = this.getOrCreateUserBalance(userId);
    const updated = current + amount;
    this.userBalances.set(userId, updated);

    // Persist to Firebase Firestore
    setFirebaseUserBalance(userId, updated, userName).catch(console.error);

    this.recordTransaction({
      id: 'tx-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      userId,
      userName,
      type: 'RECHARGE',
      amount,
      balanceAfter: updated,
      roundNumber: 0,
      timestamp: Date.now(),
      description: `Recharged ${amount} coins`,
    });

    return updated;
  }

  public async resetUserBalance(userId: string, userName?: string): Promise<number> {
    this.userBalances.set(userId, 0);
    await setFirebaseUserBalance(userId, 0, userName);

    this.recordTransaction({
      id: 'tx-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      userId,
      userName: userName || `Player_${userId.slice(-4)}`,
      type: 'REFUND',
      amount: 0,
      balanceAfter: 0,
      roundNumber: 0,
      timestamp: Date.now(),
      description: 'Admin balance zeroed to 0 coins',
    });

    // Notify user if currently connected
    for (const client of this.connections.values()) {
      if (client.userId === userId) {
        client.send(JSON.stringify({ type: 'BALANCE_UPDATED', balance: 0 }));
      }
    }

    return 0;
  }

  public async deleteUser(userId: string): Promise<boolean> {
    this.userBalances.delete(userId);
    this.activeUserBets.delete(userId);

    // Disconnect any active client connection for this user
    for (const [connId, client] of this.connections.entries()) {
      if (client.userId === userId) {
        client.send(JSON.stringify({ type: 'ACCOUNT_DELETED', message: 'Your account has been deleted by administrator.' }));
        this.connections.delete(connId);
      }
    }

    // Delete document in Firestore
    const cloudDeleted = await deleteFirebaseUser(userId);
    return cloudDeleted;
  }

  public cleanupServer(): { clearedHistory: number; clearedTransactions: number; tablesReset: number; activeSockets: number } {
    const clearedHistory = this.history.length;
    const clearedTransactions = this.transactions.length;
    this.history = [];
    this.transactions = [];

    // Reset all tables to pristine initial countdown state
    let tablesReset = 0;
    for (const [tableId, table] of this.tables.entries()) {
      table.phase = 'COUNTDOWN';
      table.timerRemaining = this.adminConfig.roundCountdownSeconds;
      table.timerTotal = this.adminConfig.roundCountdownSeconds;
      table.totalPot = 0;
      table.winningSpot = undefined;
      table.winningHand = undefined;
      table.userBets = { A: 0, B: 0, C: 0 };
      table.spots = {
        A: { id: 'A', cards: [], pot: 0 },
        B: { id: 'B', cards: [], pot: 0 },
        C: { id: 'C', cards: [], pot: 0 },
      };
      tablesReset++;
      this.broadcastTable(tableId);
    }

    // Clear active user bets in memory
    this.activeUserBets.clear();

    return {
      clearedHistory,
      clearedTransactions,
      tablesReset,
      activeSockets: this.connections.size,
    };
  }

  public recordTransaction(record: TransactionRecord) {
    this.transactions.unshift(record);
    if (this.transactions.length > 500) {
      this.transactions.pop();
    }
    // Save to Firestore transactions collection
    saveFirebaseTransaction(record).catch(console.error);
  }

  public joinTable(tableId: string, playerInfo: { id: string; name: string; avatar?: string }): TableState {
    const table = this.tables.get(tableId) || this.tables.get('table-main')!;
    if (!this.activeUserBets.has(playerInfo.id)) {
      this.activeUserBets.set(playerInfo.id, { A: 0, B: 0, C: 0 });
    }
    return table;
  }

  public leaveTable(tableId: string, playerId: string) {
    this.activeUserBets.delete(playerId);
  }

  public toggleAutoPlay(tableId: string, playerId: string): boolean {
    return true;
  }

  public placeSpotBet(tableId: string, playerId: string, spot: SpotId, amount: number): { success: boolean; message: string } {
    if (!this.adminConfig.isGameEnabled) {
      return { success: false, message: 'Game is currently paused for maintenance' };
    }

    const table = this.tables.get(tableId);
    if (!table) return { success: false, message: 'Table not found' };

    if (table.phase !== 'COUNTDOWN') {
      return { success: false, message: 'Bets can only be placed during the countdown' };
    }

    if (amount < table.minBet || amount > table.maxBet) {
      return { success: false, message: `Bet must be between ${table.minBet} and ${table.maxBet}` };
    }

    const currentBalance = this.getOrCreateUserBalance(playerId);
    if (currentBalance < amount) {
      return { success: false, message: 'Insufficient coin! would you like to recharge?' };
    }

    // Deduct from balance
    const newBalance = currentBalance - amount;
    this.userBalances.set(playerId, newBalance);
    setFirebaseUserBalance(playerId, newBalance).catch(console.error);

    // Update spot pot and user bets
    let userBets = this.activeUserBets.get(playerId);
    if (!userBets) {
      userBets = { A: 0, B: 0, C: 0 };
      this.activeUserBets.set(playerId, userBets);
    }
    userBets[spot] += amount;

    table.spots[spot].pot += amount;
    table.totalPot += amount;

    this.recordTransaction({
      id: 'tx-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      userId: playerId,
      userName: `Player_${playerId.slice(-4)}`,
      type: 'BET',
      amount,
      balanceAfter: newBalance,
      roundNumber: table.roundNumber,
      timestamp: Date.now(),
      description: `Bet ${amount} on Chair ${spot}`,
    });

    this.broadcastTable(tableId);
    return { success: true, message: `Bet placed on ${spot}` };
  }

  private startServerTicker() {
    if (this.timerInterval) clearInterval(this.timerInterval);

    this.timerInterval = setInterval(() => {
      this.tick();
    }, 1000);
  }

  private tick() {
    for (const [tableId, table] of this.tables.entries()) {
      if (!this.adminConfig.isGameEnabled) continue;

      if (table.timerRemaining > 0) {
        table.timerRemaining--;

        // Simulate other live casino players placing community bets on A, B, C
        if (table.phase === 'COUNTDOWN' && table.timerRemaining > 2) {
          this.simulateCommunityBets(table);
        }
      } else {
        this.advancePhase(table);
      }
    }
  }

  private simulateCommunityBets(table: TableState) {
    if (!this.adminConfig.autoFillBots) return;

    // Random chance each second for other connected online players to place bets
    if (Math.random() < 0.6) {
      const spots: SpotId[] = ['A', 'B', 'C'];
      const chosenSpot = spots[Math.floor(Math.random() * spots.length)];
      const randomChips = [100, 100, 1000, 1000, 10000];
      const chip = randomChips[Math.floor(Math.random() * randomChips.length)];
      table.spots[chosenSpot].pot += chip;
      table.totalPot += chip;
      this.broadcastTable(table.id);
    }
  }

  private advancePhase(table: TableState) {
    switch (table.phase) {
      case 'COUNTDOWN': {
        // Deal 3 cards to each spot (A, B, C)
        const deck = shuffleDeck(createDeck());
        this.secretSpotCards = {
          A: [deck.pop()!, deck.pop()!, deck.pop()!],
          B: [deck.pop()!, deck.pop()!, deck.pop()!],
          C: [deck.pop()!, deck.pop()!, deck.pop()!],
        };

        // Initialize spots with cards (face-down initially)
        table.spots.A.cards = this.secretSpotCards.A;
        table.spots.B.cards = this.secretSpotCards.B;
        table.spots.C.cards = this.secretSpotCards.C;

        table.phase = 'DEALING';
        table.timerTotal = 2;
        table.timerRemaining = 2;
        this.broadcastTable(table.id);
        break;
      }

      case 'DEALING': {
        // SHOWDOWN: Reveal cards, evaluate hands, find winning spot!
        table.phase = 'SHOWDOWN';
        table.timerTotal = 4;
        table.timerRemaining = 4;

        let evalA = evaluateThreeCardHand(this.secretSpotCards.A);
        let evalB = evaluateThreeCardHand(this.secretSpotCards.B);
        let evalC = evaluateThreeCardHand(this.secretSpotCards.C);

        // Win/Loss Rate Odds Enforcement for Teen Patti
        let totalUserBetA = 0;
        let totalUserBetB = 0;
        let totalUserBetC = 0;
        for (const bets of this.activeUserBets.values()) {
          totalUserBetA += bets.A || 0;
          totalUserBetB += bets.B || 0;
          totalUserBetC += bets.C || 0;
        }
        const totalUserBets = totalUserBetA + totalUserBetB + totalUserBetC;
        const targetWinRate = this.adminConfig.gameWinRates?.teenPatti ?? this.adminConfig.globalWinRate ?? 40;

        if (totalUserBets > 0 && this.adminConfig.houseMode !== 'fair') {
          const isPlayerWinRoll = (Math.random() * 100) < targetWinRate;
          const userFavoredSpot: SpotId = (totalUserBetA >= totalUserBetB && totalUserBetA >= totalUserBetC) 
            ? 'A' 
            : (totalUserBetB >= totalUserBetC ? 'B' : 'C');
          
          const spots: SpotId[] = ['A', 'B', 'C'];
          const zeroBetSpots = spots.filter(s => {
            if (s === 'A') return totalUserBetA === 0;
            if (s === 'B') return totalUserBetB === 0;
            return totalUserBetC === 0;
          });

          const desiredWinner: SpotId = isPlayerWinRoll 
            ? userFavoredSpot 
            : (zeroBetSpots.length > 0 ? zeroBetSpots[Math.floor(Math.random() * zeroBetSpots.length)] : spots.filter(s => s !== userFavoredSpot)[0]);

          // Find current strongest hand
          const currentEvals: Record<SpotId, HandEvaluation> = { A: evalA, B: evalB, C: evalC };
          const highestSpot = (['A', 'B', 'C'] as SpotId[]).sort((x, y) => currentEvals[y].score - currentEvals[x].score)[0];

          if (highestSpot !== desiredWinner) {
            // Swap cards so desiredWinner gets the highest hand
            const tempCards = this.secretSpotCards[desiredWinner];
            this.secretSpotCards[desiredWinner] = this.secretSpotCards[highestSpot];
            this.secretSpotCards[highestSpot] = tempCards;

            evalA = evaluateThreeCardHand(this.secretSpotCards.A);
            evalB = evaluateThreeCardHand(this.secretSpotCards.B);
            evalC = evaluateThreeCardHand(this.secretSpotCards.C);
          }
        }

        table.spots.A.cards = this.secretSpotCards.A;
        table.spots.B.cards = this.secretSpotCards.B;
        table.spots.C.cards = this.secretSpotCards.C;

        table.spots.A.evaluation = evalA;
        table.spots.B.evaluation = evalB;
        table.spots.C.evaluation = evalC;

        // Compare hands
        const scores = [
          { spot: 'A' as SpotId, eval: evalA },
          { spot: 'B' as SpotId, eval: evalB },
          { spot: 'C' as SpotId, eval: evalC },
        ].sort((x, y) => y.eval.score - x.eval.score);

        const winningItem = scores[0];
        table.winningSpot = winningItem.spot;
        table.winningHand = winningItem.eval;

        table.spots.A.isWinner = winningItem.spot === 'A';
        table.spots.B.isWinner = winningItem.spot === 'B';
        table.spots.C.isWinner = winningItem.spot === 'C';

        // Payout to users who bet on the winning spot (e.g. 3x payout!)
        const payoutMultiplier = 3.0;

        for (const [userId, bets] of this.activeUserBets.entries()) {
          const winningBet = bets[winningItem.spot] || 0;
          if (winningBet > 0) {
            const winAmount = Math.floor(winningBet * payoutMultiplier);
            const currentBal = this.getOrCreateUserBalance(userId);
            const newBal = currentBal + winAmount;
            this.userBalances.set(userId, newBal);

            // Persist winning payout balance to Firestore
            setFirebaseUserBalance(userId, newBal).catch(console.error);

            this.recordTransaction({
              id: 'tx-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
              userId,
              userName: `Player_${userId.slice(-4)}`,
              type: 'WIN',
              amount: winAmount,
              balanceAfter: newBal,
              roundNumber: table.roundNumber,
              timestamp: Date.now(),
              description: `Won ${winAmount} on Chair ${winningItem.spot} (${winningItem.eval.rankName})`,
            });
          }
        }

        // Record history
        const historyItem: GameHistoryEntry = {
          id: 'gh-' + Date.now(),
          roundNumber: table.roundNumber,
          timestamp: Date.now(),
          totalPot: table.totalPot,
          winningSpot: winningItem.spot,
          winningHandName: winningItem.eval.rankName,
          spotsSummary: [
            {
              spot: 'A',
              pot: table.spots.A.pot,
              handName: evalA.rankName,
              cards: this.secretSpotCards.A,
              isWinner: winningItem.spot === 'A',
            },
            {
              spot: 'B',
              pot: table.spots.B.pot,
              handName: evalB.rankName,
              cards: this.secretSpotCards.B,
              isWinner: winningItem.spot === 'B',
            },
            {
              spot: 'C',
              pot: table.spots.C.pot,
              handName: evalC.rankName,
              cards: this.secretSpotCards.C,
              isWinner: winningItem.spot === 'C',
            },
          ],
        };

        this.history.unshift(historyItem);
        if (this.history.length > 50) this.history.pop();

        // Save round to Firebase Firestore game_history
        saveFirebaseRoundHistory(historyItem).catch(console.error);

        this.broadcastTable(table.id);
        break;
      }

      case 'SHOWDOWN': {
        table.phase = 'RESULTS';
        table.timerTotal = 4;
        table.timerRemaining = 4;
        this.broadcastTable(table.id);
        break;
      }

      case 'RESULTS': {
        // Reset for next round
        table.roundNumber++;
        table.phase = 'COUNTDOWN';
        table.timerTotal = this.adminConfig.roundCountdownSeconds;
        table.timerRemaining = this.adminConfig.roundCountdownSeconds;
        table.totalPot = 0;
        table.winningSpot = undefined;
        table.winningHand = undefined;

        table.spots = {
          A: { id: 'A', pot: 0, cards: [] },
          B: { id: 'B', pot: 0, cards: [] },
          C: { id: 'C', pot: 0, cards: [] },
        };

        // Reset user bets
        this.activeUserBets.clear();

        this.broadcastTable(table.id);
        break;
      }
    }
  }

  public registerClient(connection: ClientConnection) {
    this.connections.set(connection.id, connection);
  }

  public unregisterClient(connectionId: string) {
    this.connections.delete(connectionId);
  }

  public broadcastTable(tableId: string) {
    const table = this.tables.get(tableId);
    if (!table) return;

    for (const conn of this.connections.values()) {
      if (conn.tableId === tableId) {
        const userBets = this.activeUserBets.get(conn.userId) || { A: 0, B: 0, C: 0 };
        const canSeeCards = table.phase === 'SHOWDOWN' || table.phase === 'RESULTS';

        const clientTable: TableState = {
          ...table,
          userBets,
          spots: {
            A: {
              ...table.spots.A,
              cards: canSeeCards ? table.spots.A.cards : table.spots.A.cards.map(() => ({ suit: '♠', rank: 'A', value: 0 })),
            },
            B: {
              ...table.spots.B,
              cards: canSeeCards ? table.spots.B.cards : table.spots.B.cards.map(() => ({ suit: '♠', rank: 'A', value: 0 })),
            },
            C: {
              ...table.spots.C,
              cards: canSeeCards ? table.spots.C.cards : table.spots.C.cards.map(() => ({ suit: '♠', rank: 'A', value: 0 })),
            },
          },
        };

        conn.send(JSON.stringify({
          type: 'TABLE_UPDATE',
          table: clientTable,
          balance: conn.userId && conn.userId.trim() ? this.getOrCreateUserBalance(conn.userId.trim()) : this.adminConfig.defaultPlayerBalance,
        }));
      }
    }
  }

  public updateAdminConfig(newConfig: Partial<AdminConfig>) {
    this.adminConfig = { ...this.adminConfig, ...newConfig };
    setFirebaseAdminConfig(this.adminConfig).catch(console.error);
    for (const table of this.tables.values()) {
      table.isGameActive = this.adminConfig.isGameEnabled;
      if (newConfig.defaultChips) {
        table.availableChips = [...this.adminConfig.defaultChips];
      }
      if (newConfig.minBet !== undefined) table.minBet = this.adminConfig.minBet;
      if (newConfig.maxBet !== undefined) table.maxBet = this.adminConfig.maxBet;
      this.broadcastTable(table.id);
    }
  }
}
