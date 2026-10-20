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

/** Turn Firebase Auth error codes into something a person can act on. */
export function authErrorMessage(error: unknown): string {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: unknown }).code)
      : "";

  switch (code) {
    case "auth/unauthorized-domain":
      return "Google sign-in is not enabled for this domain yet. Add it under Firebase Console → Authentication → Settings → Authorized domains.";
    case "auth/popup-blocked":
      return "Your browser blocked the sign-in window. Allow pop-ups for this site and try again.";
    case "auth/popup-closed-by-user":
      return "The sign-in window was closed before finishing. Try again.";
    case "auth/cancelled-popup-request":
      return "Another sign-in window is already open. Finish that one first.";
    case "auth/operation-not-allowed":
      return "Google sign-in is disabled for this Firebase project. Enable it under Authentication → Sign-in method.";
    case "auth/account-exists-with-different-credential":
      return "An account with this email already exists using a different sign-in method.";
    case "auth/network-request-failed":
      return "Network error while contacting Google. Check your connection and try again.";
    default:
      return error instanceof Error && error.message
        ? error.message
        : "Could not sign you in. Please try again.";
  }
}

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
