import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { initAdmin } from '@/lib/firebase/admin';

// Initialize Firebase Admin
initAdmin();

export async function POST(request: NextRequest) {
  try {
    // Get the current user's token from the Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const adminToken = authHeader.split('Bearer ')[1];
    
    // Verify the admin token
    const decodedToken = await getAuth().verifyIdToken(adminToken);
    if (!decodedToken.role || decodedToken.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Get request body
    const { uid, role } = await request.json();
    
    if (!uid || !role || !['admin', 'technician'].includes(role)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    
    // Set custom claims
    await getAuth().setCustomUserClaims(uid, { role });
    
    return NextResponse.json({ 
      success: true, 
      message: `Role ${role} set successfully for user ${uid}` 
    });
    
  } catch (error: any) {
    console.error('Error setting user role:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
} 