/**
 * Gramaj Calculator API
 * Calculates portion sizes and totals based on institution type
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db/sqlite-client';

interface GramajRequest {
  items: number[]; // menu item IDs
  institution_type: string;
  persons: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: GramajRequest = await request.json();
    const { items, institution_type, persons } = body;

    if (!items || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No items provided' },
        { status: 400 }
      );
    }

    if (!institution_type || !persons || persons < 1) {
      return NextResponse.json(
        { success: false, error: 'Invalid parameters' },
        { status: 400 }
      );
    }

    const db = getDB();

    // Fetch menu items
    const placeholders = items.map(() => '?').join(',');
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

    const menuItems = db.prepare(itemsQuery).all(...items);

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
    const totalCost = results.reduce((sum, r) => sum + r.totalCost, 0);
    const totalCalories = results.reduce((sum, r) => sum + r.totalCalories, 0);

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
