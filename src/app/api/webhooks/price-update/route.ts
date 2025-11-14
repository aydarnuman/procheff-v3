import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import Database from 'better-sqlite3';
import { join } from 'path';
import { queueManager } from '@/lib/market/queue/queue-manager';
import { AILogger } from '@/lib/ai/logger';

interface WebhookPayload {
  event: 'price.updated' | 'product.availability_changed' | 'product.new';
  timestamp: string;
  market: string;
  data: {
    productId?: string;
    barcode?: string;
    name: string;
    price: number;
    discountPrice?: number;
    inStock: boolean;
    unit?: string;
    weight?: number;
    weightUnit?: string;
    imageUrl?: string;
  };
}

interface WebhookSubscription {
  id: number;
  market_name: string;
  webhook_url: string;
  secret_key: string;
  events: string[];
  is_active: boolean;
}

/**
 * Verify webhook signature
 */
function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * Process incoming webhook
 */
async function processWebhook(
  payload: WebhookPayload,
  subscription: WebhookSubscription
): Promise<void> {
  AILogger.info('[Webhook] Processing incoming webhook', {
    event: payload.event,
    market: payload.market,
    productName: payload.data.name
  });
  
  // Add to processing queue based on event type
  switch (payload.event) {
    case 'price.updated':
      await queueManager.add('price_update', {
        productId: payload.data.productId,
        productName: payload.data.name,
        barcode: payload.data.barcode,
        markets: [payload.market],
        webhookData: payload.data
      }, {
        defaultPriority: 8 // Higher priority for webhook updates
      });
      break;
    
    case 'product.availability_changed':
      // Update availability in database
      await updateProductAvailability(
        payload.data.productId || payload.data.barcode!,
        payload.market,
        payload.data.inStock
      );
      break;
    
    case 'product.new':
      // Add new product discovery job
      await queueManager.add('market_search', {
        query: payload.data.name,
        markets: getAllMarkets(),
        options: {
          limit: 10
        }
      });
      break;
  }
}

/**
 * Update product availability
 */
async function updateProductAvailability(
  productIdentifier: string,
  market: string,
  inStock: boolean
): Promise<void> {
  const db = new Database(join(process.cwd(), 'procheff.db'));
  
  try {
    db.prepare(`
      UPDATE market_prices_v2 
      SET in_stock = ?, updated_at = datetime('now')
      WHERE (product_id = ? OR barcode = ?) AND source = ?
    `).run(inStock, productIdentifier, productIdentifier, market);
  } catch (error) {
    AILogger.error('[Webhook] Failed to update availability', { error });
  } finally {
    db.close();
  }
}

/**
 * Get all active markets
 */
function getAllMarkets(): string[] {
  return ['Migros', 'CarrefourSA', 'A101', 'BİM', 'Getir', 'Trendyol'];
}

/**
 * Handle incoming webhook POST request
 */
export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await request.text();
    
    // Parse JSON
    let payload: WebhookPayload;
    try {
      payload = JSON.parse(rawBody);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }
    
    // Validate required fields
    if (!payload.event || !payload.market || !payload.data) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Get signature from headers
    const signature = request.headers.get('x-webhook-signature');
    if (!signature) {
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 401 }
      );
    }
    
    // Look up subscription
    const db = new Database(join(process.cwd(), 'procheff.db'));
    let subscription: WebhookSubscription | null = null;
    
    try {
      const row = db.prepare(`
        SELECT * FROM webhook_subscriptions 
        WHERE market_name = ? AND is_active = 1
        LIMIT 1
      `).get(payload.market) as any;
      
      if (row) {
        subscription = {
          ...row,
          events: JSON.parse(row.events)
        };
      }
    } finally {
      db.close();
    }
    
    if (!subscription) {
      return NextResponse.json(
        { error: 'Unknown market or inactive subscription' },
        { status: 404 }
      );
    }
    
    // Verify signature
    if (!verifyWebhookSignature(rawBody, signature, subscription.secret_key)) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }
    
    // Check if event is subscribed
    if (!subscription.events.includes(payload.event) && 
        !subscription.events.includes('*')) {
      return NextResponse.json(
        { error: 'Event not subscribed' },
        { status: 400 }
      );
    }
    
    // Process webhook
    await processWebhook(payload, subscription);
    
    // Update last delivery timestamp
    const updateDb = new Database(join(process.cwd(), 'procheff.db'));
    try {
      updateDb.prepare(`
        UPDATE webhook_subscriptions 
        SET last_delivery_at = ?, failure_count = 0
        WHERE id = ?
      `).run(Date.now(), subscription.id);
    } finally {
      updateDb.close();
    }
    
    return NextResponse.json({
      success: true,
      message: 'Webhook processed successfully'
    });
    
  } catch (error) {
    AILogger.error('[Webhook] Processing failed', { error });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Handle webhook verification (some providers use GET for verification)
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const challenge = searchParams.get('challenge');
  const market = searchParams.get('market');
  
  if (!challenge || !market) {
    return NextResponse.json(
      { error: 'Missing challenge or market parameter' },
      { status: 400 }
    );
  }
  
  // Verify market exists
  const db = new Database(join(process.cwd(), 'procheff.db'));
  let exists = false;
  
  try {
    const row = db.prepare(`
      SELECT 1 FROM webhook_subscriptions 
      WHERE market_name = ? AND is_active = 1
      LIMIT 1
    `).get(market);
    
    exists = !!row;
  } finally {
    db.close();
  }
  
  if (!exists) {
    return NextResponse.json(
      { error: 'Unknown market' },
      { status: 404 }
    );
  }
  
  // Return challenge for verification
  return NextResponse.json({ challenge });
}

/**
 * Register a new webhook subscription (internal use)
 * Note: This function is not exported as it's for internal use only
 */
async function registerWebhook(
  market: string,
  webhookUrl: string,
  events: string[] = ['*']
): Promise<{ success: boolean; secret?: string }> {
  const db = new Database(join(process.cwd(), 'procheff.db'));
  
  try {
    // Generate secret
    const secret = crypto.randomBytes(32).toString('hex');
    
    // Insert or update subscription
    db.prepare(`
      INSERT OR REPLACE INTO webhook_subscriptions 
      (market_name, webhook_url, secret_key, events, is_active, created_at)
      VALUES (?, ?, ?, ?, 1, ?)
    `).run(
      market,
      webhookUrl,
      secret,
      JSON.stringify(events),
      Date.now()
    );
    
    return { success: true, secret };
  } catch (error) {
    AILogger.error('[Webhook] Registration failed', { error });
    return { success: false };
  } finally {
    db.close();
  }
}
