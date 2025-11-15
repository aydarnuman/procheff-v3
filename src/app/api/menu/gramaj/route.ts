/**
 * Gramaj Calculator API
 * Calculates portion sizes and totals based on institution type
 */

import { getDatabase } from '@/lib/db/universal-client';
import { validateRequest } from '@/lib/utils/validate';
import { MenuGramajRequestSchema } from '@/lib/validation/menu-gramaj';
import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';

export async function POST(request: NextRequest) {
  try {
    const { items, institution_type, persons } = await validateRequest(
      request,
      MenuGramajRequestSchema
    );

    const db = await getDatabase();

    // Fetch menu items
    const placeholders = items.map((_, idx) => `$${idx + 1}`).join(',');
    const itemsQuery = `
      SELECT
        id,
        name,
        category_id,
        default_gramaj,
        unit_cost,
        calories,
        protein,
        carbs,
        fat
      FROM menu_items
      WHERE id IN (${placeholders})
    `;

    const menuItems = await db.query(itemsQuery, items);

    if (menuItems.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No menu items found' },
        { status: 404 }
      );
    }

    // Calculate gramaj for each item
    const results = menuItems.map((item: any) => {
      // Use default gramaj as base
      // In future, can adjust based on institution type and category
      const perPerson = item.default_gramaj;
      const total = (perPerson * persons) / 1000; // Convert to kg

      return {
        item,
        perPerson,
        total: parseFloat(total.toFixed(2)),
        totalCost: parseFloat(((item.unit_cost * total)).toFixed(2)),
        totalCalories: item.calories * persons
      };
    });

    // Calculate totals
    const totalCost = results.reduce((sum: number, r: any) => sum + r.totalCost, 0);
    const totalCalories = results.reduce((sum: number, r: any) => sum + r.totalCalories, 0);

    return NextResponse.json({
      success: true,
      results,
      summary: {
        institution_type,
        persons,
        total_cost: parseFloat(totalCost.toFixed(2)),
        total_calories: totalCalories,
        cost_per_person: parseFloat((totalCost / persons).toFixed(2)),
        calories_per_person: Math.round(totalCalories / persons)
      }
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Gramaj calculation error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Calculation failed'
      },
      { status: 500 }
    );
  }
}
