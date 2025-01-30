import { getApps, initializeApp, cert } from 'firebase-admin/app';

export const initAdmin = () => {
  if (getApps().length === 0) {
    // Initialize Firebase Admin with service account
    const serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    };

    initializeApp({
      credential: cert(serviceAccount),
    });
  }
}; 