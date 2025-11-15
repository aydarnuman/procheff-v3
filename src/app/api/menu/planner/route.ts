/**
 * Menu Planner API
 * AI-powered or manual menu planning for multiple days
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db/universal-client';
import { AIProviderFactory } from '@/lib/ai/provider-factory';
import { cleanClaudeJSON } from '@/lib/ai/utils';
import { AILogger } from '@/lib/ai/logger';

interface PlanRequest {
  mode: 'auto' | 'manual';
  days: number;
  meals: ('kahvalti' | 'ogle' | 'aksam')[];
  institutionType: string;
  persons: number;
  budget?: number;
  season?: string;
}

interface DayPlan {
  day: number;
  meals: {
    [key: string]: {
      item_id: number;
      name: string;
      gramaj: number;
      cost: number;
    };
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: PlanRequest = await request.json();
    const { mode, days, meals, institutionType, persons, budget, season } = body;

    // Validation
    if (!mode || !days || !meals || meals.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid parameters' },
        { status: 400 }
      );
    }

    if (days < 1 || days > 30) {
      return NextResponse.json(
        { success: false, error: 'Days must be between 1 and 30' },
        { status: 400 }
      );
    }

    const db = await getDatabase();

    // Get available menu items
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

    // Filter by institution type
    if (institutionType) {
      query += ` AND (institution_types LIKE ? OR institution_types LIKE ?)`;
      params.push(`%"${institutionType}"%`, '%"all"%');
    }

    // Filter by season
    if (season && season !== 'all') {
      query += ` AND (season = ? OR season = 'all')`;
      params.push(season);
    }

    query += ` ORDER BY name ASC`;

    const availableItems = db.prepare(query).all(...params);

    if (availableItems.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No menu items available with given criteria' },
        { status: 404 }
      );
    }

    AILogger.info('Menu planning started', {
      mode,
      days,
      meals: meals.length,
      availableItems: availableItems.length
    });

    let menuPlan: DayPlan[];

    if (mode === 'auto') {
      // AI-powered menu planning
      menuPlan = await generateAIMenuPlan({
        days,
        meals,
        institutionType,
        persons,
        budget,
        season,
        availableItems
      });
    } else {
      // Manual mode: Return available items for user selection
      return NextResponse.json({
        success: true,
        mode: 'manual',
        availableItems: availableItems.map((item: any) => ({
          ...item,
          tags: JSON.parse(item.tags || '[]'),
          institution_types: JSON.parse(item.institution_types || '[]')
        }))
      });
    }

    // Calculate totals
    let totalCost = 0;
    let totalCalories = 0;

    menuPlan.forEach((dayPlan) => {
      Object.values(dayPlan.meals).forEach((meal: any) => {
        totalCost += meal.cost * persons;

        // Find item for calories
        const item: any = availableItems.find((i: any) => i.id === meal.item_id);
        if (item) {
          totalCalories += item.calories * persons;
        }
      });
    });

    AILogger.success('Menu plan generated', {
      days,
      totalMeals: menuPlan.length * meals.length,
      totalCost: totalCost.toFixed(2),
      avgCostPerDay: (totalCost / days).toFixed(2)
    });

    return NextResponse.json({
      success: true,
      mode: 'auto',
      plan: menuPlan,
      summary: {
        days,
        meals: meals.length,
        totalMealsServed: menuPlan.length * meals.length,
        persons,
        totalCost: parseFloat(totalCost.toFixed(2)),
        costPerDay: parseFloat((totalCost / days).toFixed(2)),
        costPerPerson: parseFloat((totalCost / (days * persons)).toFixed(2)),
        avgCaloriesPerPerson: Math.round(totalCalories / (days * persons))
      }
    });
  } catch (error) {
    AILogger.error('Menu planning failed', { error });
    console.error('Menu planner error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Menu planning failed'
      },
      { status: 500 }
    );
  }
}

async function generateAIMenuPlan(params: {
  days: number;
  meals: string[];
  institutionType: string;
  persons: number;
  budget?: number;
  season?: string;
  availableItems: any[];
}): Promise<DayPlan[]> {
  const { days, meals, institutionType, persons, budget, season, availableItems } = params;

  // Build prompt
  const itemsList = availableItems.map((item: any, idx: number) =>
    `${idx + 1}. ${item.name} (ID: ${item.id}, Kategori: ${item.category_id}, Maliyet: ${item.unit_cost} TL/kg, Kalori: ${item.calories}, Mevsim: ${item.season})`
  ).join('\n');

  const prompt = `Sen bir kurumsal yemek planlama uzmanısın. Aşağıdaki parametrelere göre dengeli, çeşitli ve sağlıklı bir menü planı oluştur:

**PARAMETRELER:**
- Gün sayısı: ${days}
- Öğünler: ${meals.map(m => m === 'kahvalti' ? 'Kahvaltı' : m === 'ogle' ? 'Öğle' : 'Akşam').join(', ')}
- Kurum tipi: ${institutionType}
- Kişi sayısı: ${persons}
${budget ? `- Günlük bütçe limiti: ${budget} TL/kişi` : ''}
${season && season !== 'all' ? `- Mevsim: ${season}` : ''}

**MEVCUT YEMEKLER:**
${itemsList}

**KURALLAR:**
1. **Çeşitlilik**: Aynı yemeği mümkün olduğunca tekrar etme (en az 3 gün ara ver)
2. **Denge**: Her gün dengeli besin değerleri sağla (protein, karbonhidrat, vitamin)
3. **Mevsim**: Mevsim bilgisi "all" olanları her zaman, mevsim spesifik olanları uygun zamanlarda kullan
4. **Maliyet**: ${budget ? `Günlük kişi başı ${budget} TL limitini aşma` : 'Makul maliyetlerde kal'}
5. **Kategori Dengesi**: Her öğünde farklı kategorilerden yemekler seç (çorba + ana yemek + garnitür + salata gibi)
6. **Kurum Uygunluğu**: ${institutionType} kurumu için uygun yemekleri seç

**OUTPUT FORMAT (JSON):**
\`\`\`json
[
  {
    "day": 1,
    "meals": {
      "ogle": {
        "item_id": 5,
        "name": "Mercimek Çorbası",
        "gramaj": 250,
        "cost": 8.5
      }
    }
  }
]
\`\`\`

Her gün için seçili öğünlere (${meals.join(', ')}) göre yemekler ata. Sadece JSON döndür, açıklama ekleme.`;

  const startTime = Date.now();

  try {
    const client = AIProviderFactory.getClaude();
    const result = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      temperature: 0.7,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const duration = Date.now() - startTime;
    const firstBlock = result.content?.[0];
    const text = cleanClaudeJSON((firstBlock && 'text' in firstBlock ? firstBlock.text : null) || '{}');
    const menuPlan: DayPlan[] = JSON.parse(text);

    AILogger.info('AI menu plan generated', {
      duration: `${duration}ms`,
      tokens: result.usage?.input_tokens + result.usage?.output_tokens,
      days: menuPlan.length
    });

    return menuPlan;
  } catch (error) {
    AILogger.error('AI menu planning failed', { error });
    throw new Error('AI menu generation failed');
  }
}
