/**
 * Menu Item Detail API
 * Returns complete menu item details with recipe, ingredients, etc.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db/universal-client';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const db = await getDatabase();
    const params = await context.params;
    const itemId = parseInt(params.id);

    if (isNaN(itemId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid item ID' },
        { status: 400 }
      );
    }

    // Get menu item
    const item = await db.queryOne(`
      SELECT
        mi.id,
        mi.name,
        mi.category_id,
        mi.meal_type,
        mi.default_gramaj,
        mi.unit_cost,
        mi.calories,
        mi.protein,
        mi.carbs,
        mi.fat,
        mi.season,
        mi.tags,
        mi.institution_types,
        mc.name_tr as category_name
      FROM menu_items mi
      LEFT JOIN menu_categories mc ON mi.category_id = mc.id
      WHERE mi.id = $1
    `, [itemId]);

    if (!item) {
      return NextResponse.json(
        { success: false, error: 'Menu item not found' },
        { status: 404 }
      );
    }

    // Get recipe if exists
    const recipe = await db.queryOne(`
      SELECT
        id,
        instructions,
        prep_time,
        cook_time,
        difficulty,
        serving_size
      FROM recipes
      WHERE menu_item_id = $1
    `, [itemId]);

    // Get ingredients if recipe exists
    let ingredients: any[] = [];
    if (recipe) {
      ingredients = await db.query(`
        SELECT
          ingredient_name,
          quantity,
          unit,
          cost_per_unit
        FROM recipe_ingredients
        WHERE recipe_id = $1
        ORDER BY ingredient_name
      `, [(recipe as any).id]);
    }

    // Calculate costs for different portion sizes
    const costPerPortion = ((item as any).default_gramaj / 1000) * (item as any).unit_cost;

    const portionSizes = [
      { persons: 100, label: '100 Kişi' },
      { persons: 250, label: '250 Kişi' },
      { persons: 500, label: '500 Kişi' },
      { persons: 1000, label: '1000 Kişi' }
    ];

    const costBreakdown = portionSizes.map(size => ({
      ...size,
      totalKg: ((item as any).default_gramaj * size.persons) / 1000,
      totalCost: costPerPortion * size.persons,
      costPerPerson: costPerPortion
    }));

    // Season info
    const seasonMap: Record<string, string> = {
      'all': 'Tüm Mevsimler',
      'yaz': 'Yaz',
      'kis': 'Kış',
      'ilkbahar': 'İlkbahar',
      'sonbahar': 'Sonbahar'
    };

    const response = {
      success: true,
      item: {
        ...(item as any),
        tags: JSON.parse((item as any).tags || '[]'),
        institution_types: JSON.parse((item as any).institution_types || '[]'),
        season_label: seasonMap[(item as any).season] || 'Bilinmiyor'
      },
      recipe: recipe ? {
        ...(recipe as any),
        ingredients: ingredients.map((ing: any) => ({
          ...ing,
          totalCost: ing.quantity * ing.cost_per_unit
        }))
      } : null,
      costs: {
        per_portion: parseFloat(costPerPortion.toFixed(2)),
        breakdown: costBreakdown.map(item => ({
          ...item,
          totalKg: parseFloat(item.totalKg.toFixed(2)),
          totalCost: parseFloat(item.totalCost.toFixed(2)),
          costPerPerson: parseFloat(item.costPerPerson.toFixed(2))
        }))
      },
      nutrition: {
        calories: (item as any).calories,
        protein: (item as any).protein,
        carbs: (item as any).carbs,
        fat: (item as any).fat,
        per_100g: {
          calories: Math.round(((item as any).calories / (item as any).default_gramaj) * 100),
          protein: parseFloat((((item as any).protein / (item as any).default_gramaj) * 100).toFixed(1)),
          carbs: parseFloat((((item as any).carbs / (item as any).default_gramaj) * 100).toFixed(1)),
          fat: parseFloat((((item as any).fat / (item as any).default_gramaj) * 100).toFixed(1))
        }
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Menu detail error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch menu details'
      },
      { status: 500 }
    );
  }
}
