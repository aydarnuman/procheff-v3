/**
 * Menu Havuz API
 * Returns available menu items from database
 */

import { getDatabase } from '@/lib/db/universal-client';
import { MenuHavuzQuerySchema } from '@/lib/validation/menu-havuz';
import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';

export async function GET(request: NextRequest) {
  try {
    const db = await getDatabase();
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
    let paramIndex = 1;

    if (category) {
      query += ` AND category_id = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    if (meal_type) {
      query += ` AND meal_type = $${paramIndex}`;
      params.push(meal_type);
      paramIndex++;
    }

    if (institution_type) {
      query += ` AND (institution_types ILIKE $${paramIndex} OR institution_types ILIKE $${paramIndex + 1})`;
      params.push(`%"${institution_type}"%`, '%"all"%');
      paramIndex += 2;
    }

    query += ` ORDER BY name ASC`;

    const items = await db.query(query, params);

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
