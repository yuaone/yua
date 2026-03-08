import { initializeApp, getApps } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? '',
};

if (!firebaseConfig.apiKey) {
  throw new Error(
    '[yua-desktop] VITE_FIREBASE_API_KEY is missing. ' +
      'Create a .env file in yua-desktop/ with VITE_FIREBASE_* variables.',
  );
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
let _auth: Auth | null = null;

export function getFirebaseAuth(): Auth {
  if (!_auth) {
    _auth = getAuth(app);
  }
  return _auth;
}
