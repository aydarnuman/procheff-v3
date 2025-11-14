/**
 * Menu Havuz API
 * Returns available menu items from database
 */

import { getDB } from '@/lib/db/sqlite-client';
import { MenuHavuzQuerySchema } from '@/lib/validation/menu-havuz';
import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';

export async function GET(request: NextRequest) {
  try {
    const db = getDB();
    const { searchParams } = new URL(request.url);

    const { category, meal_type, institution_type } = MenuHavuzQuerySchema.parse({
      category: searchParams.get('category') ?? undefined,
      meal_type: searchParams.get('meal_type') ?? undefined,
      institution_type: searchParams.get('institution_type') ?? undefined,
    });

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

    if (meal_type) {
      query += ` AND meal_type = ?`;
      params.push(meal_type);
    }

    if (institution_type) {
      query += ` AND (institution_types LIKE ? OR institution_types LIKE ?)`;
      params.push(`%"${institution_type}"%`, '%"all"%');
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
    if (error instanceof ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }

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
