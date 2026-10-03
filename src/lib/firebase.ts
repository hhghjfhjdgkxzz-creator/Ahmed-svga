import { initializeApp } from 'firebase/app';
import { getFirestore, initializeFirestore, persistentLocalCache } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import config from '../../firebase-applet-config.json';

const firebaseConfig = {
  projectId: config.projectId,
  appId: config.appId,
  apiKey: config.apiKey,
  authDomain: config.authDomain,
  storageBucket: config.storageBucket,
  messagingSenderId: config.messagingSenderId,
};

export const app = initializeApp(firebaseConfig);

// Initialize Firestore with explicit database ID from config
export const db = getFirestore(app, config.firestoreDatabaseId || '(default)');

export const auth = getAuth(app);
export const storage = getStorage(app);

// Ensure user is authenticated anonymously if supported
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';

export function ensureFirebaseAuth(): Promise<void> {
  return new Promise((resolve) => {
    if (auth.currentUser) {
      resolve();
      return;
    }
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        unsub();
        resolve();
      } else {
        signInAnonymously(auth)
          .then(() => {
            unsub();
            resolve();
          })
          .catch((err) => {
            console.warn('Anonymous auth note (proceeding without crash):', err);
            unsub();
            resolve();
          });
      }
    });
  });
}

