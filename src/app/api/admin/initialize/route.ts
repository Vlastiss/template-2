import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { initAdmin } from '@/lib/firebase/admin';

// Initialize Firebase Admin
initAdmin();

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Find user by email
    const userRecord = await getAuth().getUserByEmail(email);
    
    // Set custom claims
    await getAuth().setCustomUserClaims(userRecord.uid, { role: 'admin' });
    
    // Force token refresh
    await getAuth().revokeRefreshTokens(userRecord.uid);
    
    return NextResponse.json({ 
      success: true, 
      message: `Admin role set for ${email}`,
      uid: userRecord.uid
    });
    
  } catch (error: any) {
    console.error('Error initializing admin:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
} 