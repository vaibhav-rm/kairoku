import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

export const isFirebaseConfigured = Boolean(
  config.apiKey && config.projectId && config.appId
);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

if (isFirebaseConfigured && getApps().length === 0) {
  try {
    app = initializeApp(config as Record<string, string>);
    auth = getAuth(app);
    db = getFirestore(app);
  } catch {
    app = null;
  }
} else if (getApps().length > 0) {
  app = getApps()[0]!;
  try {
    auth = getAuth(app);
    db = getFirestore(app);
  } catch {}
}

export { app, auth, db };

// Analytics is browser-only and optional — never block rendering on it.
export async function initAnalytics(): Promise<void> {
  if (typeof window === "undefined" || !app || !config.measurementId) return;
  try {
    const { getAnalytics, isSupported } = await import("firebase/analytics");
    if (await isSupported()) getAnalytics(app);
  } catch {
    // analytics unavailable (e.g. ad-block) — app works without it
  }
}
