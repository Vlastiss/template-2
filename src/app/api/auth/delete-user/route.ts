import { NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getFirebaseAdminApp } from '@/lib/firebase/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

export async function POST(request: Request) {
  try {
    const { uid } = await request.json();

    if (!uid) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Initialize Firebase Admin
    const app = getFirebaseAdminApp();
    const adminAuth = getAuth(app);
    const adminDb = getFirestore(app);

    try {
      // First delete the user from Firebase Auth
      await adminAuth.deleteUser(uid);
      
      // Then delete the user document from Firestore using admin SDK
      await adminDb.collection('users').doc(uid).delete();

      return NextResponse.json({ success: true });
    } catch (deleteError: any) {
      console.error('Error during deletion:', deleteError);
      
      if (deleteError.code === 'auth/user-not-found') {
        // If auth user doesn't exist, try to delete Firestore document anyway
        try {
          await adminDb.collection('users').doc(uid).delete();
          return NextResponse.json({ success: true });
        } catch (firestoreError) {
          console.error('Error deleting Firestore document:', firestoreError);
          throw firestoreError;
        }
      }
      
      throw deleteError;
    }
  } catch (error: any) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to delete user',
        code: error.code
      },
      { status: 500 }
    );
  }
} 