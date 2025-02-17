import { NextResponse } from 'next/server';
import { seedExampleData } from '@/lib/firebase/seedData';

export async function POST() {
  try {
    const result = await seedExampleData();
    
    if (result.success) {
      return NextResponse.json({ message: 'Data seeded successfully' }, { status: 200 });
    } else {
      return NextResponse.json({ message: 'Failed to seed data', error: result.error }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({ message: 'Error seeding data', error }, { status: 500 });
  }
} 