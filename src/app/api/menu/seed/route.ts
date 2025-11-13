/**
 * Menu Seed API Endpoint
 * Seeds the database with initial menu data
 */

import { NextResponse } from 'next/server';
import { seedMenuDatabase } from '@/lib/db/seed-menu';

export async function POST() {
  try {
    const result = await seedMenuDatabase();

    return NextResponse.json({
      message: 'Menu database seeded successfully',
      ...result
    });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Use POST method to seed menu database',
    endpoint: '/api/menu/seed'
  });
}
