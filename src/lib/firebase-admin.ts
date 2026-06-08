import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getMessaging } from "firebase-admin/messaging";

export function isFirebaseAdminConfigured() {
  return Boolean(process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY);
}

function getFirebaseAdminApp() {
  if (!isFirebaseAdminConfigured()) return null;

  return getApps()[0] ?? initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n")
    })
  });
}

export function getFirebaseAdminAuth() {
  const app = getFirebaseAdminApp();
  if (!app) return null;

  return getAuth(app);
}

export function getFirebaseAdminMessaging() {
  const app = getFirebaseAdminApp();
  if (!app) return null;

  return getMessaging(app);
}
