/**
 * Menu System Seed Script
 * Seeds database with categories, items, recipes, and gramaj standards
 */

import { getDB } from './sqlite-client';
import fs from 'fs';
import path from 'path';

interface SeedData {
  categories: Array<{
    id: number;
    name: string;
    name_tr: string;
    institution_type: string;
    icon: string;
    display_order: number;
  }>;
  gramaj_standards: Array<{
    institution_type: string;
    meal_type: string;
    category: string;
    recommended_gramaj: number;
    min_gramaj?: number;
    max_gramaj?: number;
    notes?: string;
  }>;
  items: Array<{
    name: string;
    category_id: number;
    meal_type: string;
    default_gramaj: number;
    unit_cost: number;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    season: string;
    tags: string;
    institution_types: string;
    recipe?: {
      instructions: string;
      prep_time: number;
      cook_time: number;
      difficulty: string;
      ingredients: Array<{
        ingredient_name: string;
        quantity: number;
        unit: string;
        cost_per_unit: number;
      }>;
    };
  }>;
}

export async function seedMenuDatabase() {
  const db = getDB();

  console.log('🌱 Starting menu database seed...');

  try {
    // Read seed data
    const seedPath = path.join(process.cwd(), 'src/data/menu-seed.json');
    const seedData: SeedData = JSON.parse(fs.readFileSync(seedPath, 'utf-8'));

    // Begin transaction
    db.exec('BEGIN TRANSACTION');

    // 1. Seed Categories
    console.log('📂 Seeding categories...');
    const categoryStmt = db.prepare(`
      INSERT OR REPLACE INTO menu_categories (id, name, name_tr, institution_type, icon, display_order)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    for (const cat of seedData.categories) {
      categoryStmt.run(
        cat.id,
        cat.name,
        cat.name_tr,
        cat.institution_type,
        cat.icon,
        cat.display_order
      );
    }
    console.log(`✅ Seeded ${seedData.categories.length} categories`);

    // 2. Seed Gramaj Standards
    console.log('⚖️  Seeding gramaj standards...');
    const gramajStmt = db.prepare(`
      INSERT INTO gramaj_standards
      (institution_type, meal_type, category, recommended_gramaj, min_gramaj, max_gramaj, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const std of seedData.gramaj_standards) {
      gramajStmt.run(
        std.institution_type,
        std.meal_type,
        std.category,
        std.recommended_gramaj,
        std.min_gramaj || null,
        std.max_gramaj || null,
        std.notes || null
      );
    }
    console.log(`✅ Seeded ${seedData.gramaj_standards.length} gramaj standards`);

    // 3. Seed Menu Items + Recipes
    console.log('🍽️  Seeding menu items...');
    const itemStmt = db.prepare(`
      INSERT INTO menu_items
      (name, category_id, meal_type, default_gramaj, unit_cost, calories, protein, carbs, fat, season, tags, institution_types)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const recipeStmt = db.prepare(`
      INSERT INTO recipes (menu_item_id, instructions, prep_time, cook_time, difficulty)
      VALUES (?, ?, ?, ?, ?)
    `);

    const ingredientStmt = db.prepare(`
      INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, cost_per_unit)
      VALUES (?, ?, ?, ?, ?)
    `);

    for (const item of seedData.items) {
      // Insert menu item
      const itemResult = itemStmt.run(
        item.name,
        item.category_id,
        item.meal_type,
        item.default_gramaj,
        item.unit_cost,
        item.calories,
        item.protein,
        item.carbs,
        item.fat,
        item.season,
        item.tags,
        item.institution_types
      );

      const menuItemId = itemResult.lastInsertRowid;

      // Insert recipe if exists
      if (item.recipe) {
        const recipeResult = recipeStmt.run(
          menuItemId,
          item.recipe.instructions,
          item.recipe.prep_time,
          item.recipe.cook_time,
          item.recipe.difficulty
        );

        const recipeId = recipeResult.lastInsertRowid;

        // Insert ingredients
        for (const ing of item.recipe.ingredients) {
          ingredientStmt.run(
            recipeId,
            ing.ingredient_name,
            ing.quantity,
            ing.unit,
            ing.cost_per_unit
          );
        }
      }
    }

    console.log(`✅ Seeded ${seedData.items.length} menu items with recipes`);

    // Commit transaction
    db.exec('COMMIT');

    console.log('✨ Menu database seeding completed successfully!');

    return {
      success: true,
      categories: seedData.categories.length,
      items: seedData.items.length,
      standards: seedData.gramaj_standards.length
    };

  } catch (error) {
    db.exec('ROLLBACK');
    console.error('❌ Error seeding menu database:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  seedMenuDatabase()
    .then(result => {
      console.log('📊 Seed Summary:', result);
      process.exit(0);
    })
    .catch(error => {
      console.error('Failed to seed:', error);
      process.exit(1);
    });
}
