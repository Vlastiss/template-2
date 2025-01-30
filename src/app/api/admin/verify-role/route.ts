import { NextRequest, NextResponse } from 'next/server';
import { getUserRole } from '@/lib/firebase/adminUtils';

export async function POST(request: NextRequest) {
  try {
    const { uid } = await request.json();
    
    if (!uid) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    
    const role = await getUserRole(uid);
    
    return NextResponse.json({ role });
    
  } catch (error: any) {
    console.error('Error verifying role:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
} 