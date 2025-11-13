/**
 * Menu Havuz API
 * Returns available menu items from database
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db/sqlite-client';

export async function GET(request: NextRequest) {
  try {
    const db = getDB();
    const { searchParams } = new URL(request.url);

    const category = searchParams.get('category');
    const mealType = searchParams.get('meal_type');
    const institutionType = searchParams.get('institution_type');

    let query = `
      SELECT
        id,
        name,
        category_id,
        meal_type,
        default_gramaj,
        unit_cost,
        calories,
        protein,
        carbs,
        fat,
        season,
        tags,
        institution_types
      FROM menu_items
      WHERE is_active = 1
    `;

    const params: any[] = [];

    if (category) {
      query += ` AND category_id = ?`;
      params.push(category);
    }

    if (mealType) {
      query += ` AND meal_type = ?`;
      params.push(mealType);
    }

    if (institutionType) {
      query += ` AND (institution_types LIKE ? OR institution_types LIKE ?)`;
      params.push(`%"${institutionType}"%`, '%"all"%');
    }

    query += ` ORDER BY name ASC`;

    const stmt = db.prepare(query);
    const items = stmt.all(...params);

    return NextResponse.json({
      success: true,
      items: items.map((item: any) => ({
        ...item,
        tags: JSON.parse(item.tags || '[]'),
        institution_types: JSON.parse(item.institution_types || '[]')
      })),
      count: items.length
    });
  } catch (error) {
    console.error('Menu havuz error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch menu items'
      },
      { status: 500 }
    );
  }
}
