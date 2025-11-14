import { NextRequest, NextResponse } from 'next/server';
import { anthropicClient, AILogger } from '@/lib/ai/core';
import { v4 as uuidv4 } from 'uuid';
import { saveProductCard } from '@/lib/db/market-db';

const CATEGORIES = {
  'Sebze': { icon: '🥬', keywords: ['domates', 'biber', 'salatalık', 'patlıcan', 'soğan', 'patates', 'havuç'] },
  'Meyve': { icon: '🍎', keywords: ['elma', 'portakal', 'muz', 'üzüm', 'karpuz', 'çilek', 'kiraz'] },
  'Et & Tavuk': { icon: '🥩', keywords: ['dana', 'kuzu', 'tavuk', 'hindi', 'kıyma', 'but', 'pirzola'] },
  'Balık': { icon: '🐟', keywords: ['hamsi', 'levrek', 'çipura', 'somon', 'mezgit', 'palamut'] },
  'Süt & Kahvaltılık': { icon: '🥛', keywords: ['süt', 'yoğurt', 'peynir', 'ayran', 'tereyağı', 'kaşar'] },
  'Bakliyat': { icon: '🌾', keywords: ['mercimek', 'fasulye', 'nohut', 'bulgur', 'pirinç', 'makarna'] },
  'Yağ & Sos': { icon: '🫒', keywords: ['zeytinyağı', 'ayçiçek', 'mısırözü', 'salça', 'ketçap', 'mayonez'] },
  'İçecek': { icon: '🥤', keywords: ['kola', 'su', 'meyve suyu', 'çay', 'kahve', 'gazoz'] },
  'Atıştırmalık': { icon: '🍿', keywords: ['çikolata', 'bisküvi', 'cips', 'kraker', 'kuruyemiş'] },
  'Temizlik': { icon: '🧹', keywords: ['deterjan', 'sabun', 'şampuan', 'çamaşır', 'bulaşık'] },
  'Kişisel Bakım': { icon: '🧴', keywords: ['diş macunu', 'krem', 'parfüm', 'deodorant', 'tıraş'] }
};

function normalizeProductName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\wığüşöçı\s]/g, '')
    .replace(/\s+/g, '_');
}

function detectCategoryFromName(productName: string): { category: string; icon: string } {
  const nameLower = productName.toLowerCase();
  
  for (const [category, data] of Object.entries(CATEGORIES)) {
    for (const keyword of data.keywords) {
      if (nameLower.includes(keyword)) {
        return { category, icon: data.icon };
      }
    }
  }
  
  return { category: 'Diğer', icon: '📦' };
}

export async function POST(request: NextRequest) {
  try {
    const { productName } = await request.json();
    
    if (!productName) {
      return NextResponse.json(
        { error: 'Product name is required' },
        { status: 400 }
      );
    }

    AILogger.info('[detect-product] Processing product detection', { productName });

    // Quick category detection without AI
    const { category, icon } = detectCategoryFromName(productName);
    const normalizedName = normalizeProductName(productName);
    const productId = `product_${normalizedName}_${Date.now()}`;

    // Try AI for more detailed info (but don't fail if it doesn't work)
    let aiDetails: any = null;
    
    if (anthropicClient) {
      try {
        const prompt = `Aşağıdaki ürün için detaylı bilgi ver. JSON formatında cevap ver:
        
Ürün: ${productName}

{
  "category": "Ana kategori",
  "subcategory": "Alt kategori",
  "brand": "Marka (varsa)",
  "unit": "Birim (kg, lt, adet)",
  "typical_package_sizes": [1, 5, 10],
  "nutrition_category": "healthy/normal/junk",
  "tags": ["etiket1", "etiket2"],
  "has_variants": true/false,
  "variants": ["çeşit1", "çeşit2"],
  "average_price_range": { "min": 10, "max": 50 }
}`;

        const response = await anthropicClient.messages.create({
          model: 'claude-3-haiku-20240307',
          max_tokens: 300,
          messages: [{ role: 'user', content: prompt }]
        });

        const content = response.content[0];
        if (content.type === 'text') {
          const jsonMatch = content.text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            aiDetails = JSON.parse(jsonMatch[0]);
          }
        }
      } catch (aiError) {
        AILogger.error('[detect-product] AI analysis failed', { error: aiError });
        // Continue without AI details
      }
    } else {
      AILogger.warn('[detect-product] Anthropic client not available, skipping AI analysis');
    }

    // Create product card
    const productCard = {
      id: productId,
      name: productName,
      normalized_name: normalizedName,
      category: aiDetails?.category || category,
      subcategory: aiDetails?.subcategory,
      icon: icon,
      brand: aiDetails?.brand,
      tags: aiDetails?.tags || [],
      has_variants: aiDetails?.has_variants || false,
      variants: aiDetails?.variants || [],
      default_variant: aiDetails?.variants?.[0],
      nutrition_category: aiDetails?.nutrition_category,
      barcode: undefined,
      image_url: undefined
    };

    // Save to database
    saveProductCard(productCard);

    AILogger.info('[detect-product] Product detected and saved', { productCard });

    return NextResponse.json({
      success: true,
      product: productCard,
      ai_enhanced: !!aiDetails,
      message: 'Product detected successfully'
    });

  } catch (error) {
    AILogger.error('[detect-product] Request failed', { error });
    
    return NextResponse.json(
      { error: 'Failed to detect product', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
