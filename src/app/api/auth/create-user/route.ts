import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/firebaseAdmin';

export async function POST(request: Request) {
  try {
    const { email, password, displayName } = await request.json();

    // First check if user exists
    try {
      const userRecord = await adminAuth.getUserByEmail(email);
      
      // If we get here, user exists
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    } catch (error: any) {
      // User doesn't exist, proceed with creation
      if (error.code === 'auth/user-not-found') {
        // Create the user with Firebase Admin
        const newUserRecord = await adminAuth.createUser({
          email,
          password,
          displayName,
          emailVerified: true, // Set email as verified so they can sign in immediately
        });

        // Update custom claims to mark as employee
        await adminAuth.setCustomUserClaims(newUserRecord.uid, {
          employee: true
        });

        return NextResponse.json({ uid: newUserRecord.uid });
      }
      
      // Some other error occurred during check
      throw error;
    }
  } catch (error: any) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to create user',
        code: error.code || 'unknown_error'
      },
      { status: 500 }
    );
  }
} 