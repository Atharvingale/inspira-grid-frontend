import { App, ServiceAccount, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

let firebaseAdmin: App | null = null;

/** Initializes Firebase Admin using server-only environment variables. */
export function initAdmin(): App {
  if (firebaseAdmin) return firebaseAdmin;

  const existingApps = getApps();
  if (existingApps.length > 0) {
    firebaseAdmin = existingApps[0];
    return firebaseAdmin;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Firebase Admin credentials are not configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY.'
    );
  }

  const serviceAccount: ServiceAccount = { projectId, clientEmail, privateKey };
  firebaseAdmin = initializeApp({
    credential: cert(serviceAccount),
    projectId,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`,
  });
  return firebaseAdmin;
}

export { getAuth, getFirestore, getStorage };
