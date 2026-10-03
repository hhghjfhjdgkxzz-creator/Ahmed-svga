export type Suit = '♠' | '♥' | '♦' | '♣';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  suit: Suit;
  rank: Rank;
  value: number; // 2 to 14 (Ace = 14)
}

export type HandType = 
  | 'Trail'          // Three of a kind
  | 'Pure Sequence'  // Straight Flush
  | 'Sequence'       // Straight
  | 'Color'          // Flush
  | 'Pair'           // Pair
  | 'High Card';     // High Card

export interface HandEvaluation {
  type: HandType;
  score: number;
  rankName: string;
  cards: Card[];
  description: string;
}

export interface Player {
  id: string;
  name: string;
  avatar: string;
  seatIndex: number;
  chips: number;
  currentBet: number;
  cards: Card[]; // Hidden on server until reveal for opponents
  hasFolded: boolean;
  isAutoPlay: boolean;
  isBot: boolean;
  isReady: boolean;
  lastReaction?: 'win' | 'lose' | 'draw' | 'idle';
}

export type SpotId = 'A' | 'B' | 'C';

export interface TableSpot {
  id: SpotId;
  pot: number;
  cards: Card[];
  evaluation?: HandEvaluation;
  isWinner?: boolean;
}

export type RoundPhase = 'COUNTDOWN' | 'DEALING' | 'SHOWDOWN' | 'RESULTS';

export interface TableState {
  id: string;
  name: string;
  maxPlayers: number;
  minBet: number;
  maxBet: number;
  availableChips: number[]; // [100, 1000, 10000, 100000]
  players: (Player | null)[];
  spots: Record<SpotId, TableSpot>;
  userBets: Record<SpotId, number>; // current player's bets on A, B, C
  totalPot: number;
  phase: RoundPhase;
  timerRemaining: number;
  timerTotal: number;
  roundNumber: number;
  winningSpot?: SpotId;
  winningHand?: HandEvaluation;
  isGameActive: boolean;
}

export interface GameHistoryEntry {
  id: string;
  roundNumber: number;
  timestamp: number;
  totalPot: number;
  winningSpot: SpotId;
  winningHandName: string;
  spotsSummary: {
    spot: SpotId;
    pot: number;
    handName: string;
    cards: Card[];
    isWinner: boolean;
  }[];
  userResult?: {
    totalBet: number;
    payout: number;
    netWin: number;
  };
}

export interface TransactionRecord {
  id: string;
  userId: string;
  userName: string;
  type: 'BET' | 'WIN' | 'RECHARGE' | 'REFUND';
  amount: number;
  balanceAfter: number;
  roundNumber: number;
  timestamp: number;
  description: string;
}

export interface GameWinRates {
  global: number;        // Global Player Win Rate % (0-100)
  teenPatti: number;     // 0 - 100
  rocketCrash: number;   // 0 - 100
  mines: number;         // 0 - 100
  horseRacing: number;   // 0 - 100
  happyCake: number;     // 0 - 100
  luckySeven: number;    // 0 - 100
  dragonTiger: number;   // 0 - 100
}

export interface AdminConfig {
  isGameEnabled: boolean;
  defaultChips: number[];
  roundCountdownSeconds: number;
  minBet: number;
  maxBet: number;
  autoFillBots: boolean;
  defaultPlayerBalance: number;
  whatsappNumber?: string;
  // Win / Loss rate controls
  globalWinRate: number;
  gameWinRates: GameWinRates;
  houseMode: 'custom' | 'casino_standard' | 'high_profit' | 'promotional' | 'fair';
}

export interface UserProfile {
  userId: string;
  customId: string;
  email: string;
  displayName: string;
  role: 'admin' | 'player';
  balance: number;
  totalWinnings?: number;
  totalBets?: number;
  createdAt?: string;
  updatedAt?: string;
}
