import { z } from 'zod';
export { MarketCompareQuerySchema } from './market-compare';
export { MenuGramajRequestSchema } from './menu-gramaj';

/**
 * Common validation schemas for API endpoints
 */

// ===========================
// Market API Schemas
// ===========================

export const MarketPriceQuerySchema = z.object({
  product: z.string().min(1, 'Product name is required'),
  market: z.enum(['migros', 'a101', 'bim', 'sok', 'carrefoursa']).optional(),
  useCache: z.coerce.boolean().optional().default(true),
});

export const MarketBulkRequestSchema = z.object({
  products: z.array(z.string().min(1)).min(1).max(50, 'Maximum 50 products allowed'),
  markets: z.array(z.string()).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional().default('medium'),
});

export const MenuPlannerRequestSchema = z.object({
  kisilik: z.number().int().positive(),
  gun_sayisi: z.number().int().positive().max(365),
  ogun_sayisi: z.number().int().positive().max(5).optional().default(3),
  diet_preferences: z.array(z.string()).optional(),
  budget_per_person: z.number().positive().optional(),
});

// ===========================
// Analysis API Schemas
// ===========================

export const AnalysisUploadSchema = z.object({
  file: z.instanceof(File).or(z.any()), // FormData file
  analysis_type: z.enum(['tender', 'menu', 'cost', 'market']).optional().default('tender'),
});

export const AnalysisProcessSchema = z.object({
  analysis_id: z.string().uuid(),
  skip_ocr: z.boolean().optional().default(false),
  force_reprocess: z.boolean().optional().default(false),
});

export const ContextualAnalysisSchema = z.object({
  extracted_data: z.object({
    kurum: z.string().optional(),
    ihale_turu: z.string().optional(),
    kisilik: z.union([z.string(), z.number()]).optional(),
    butce: z.string().optional(),
    sure: z.string().optional(),
    lokasyon: z.string().optional(),
  }).passthrough(),
  tables: z.array(z.any()).optional(),
  entities: z.array(z.any()).optional(),
});

// ===========================
// İhale API Schemas
// ===========================

export const IhaleLoginSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const IhaleDetailParamsSchema = z.object({
  id: z.string().min(1, 'Tender ID is required'),
  sessionId: z.string().optional(),
});

export const IhaleListQuerySchema = z.object({
  sessionId: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  refresh: z.coerce.boolean().optional().default(false),
});

// ===========================
// Chat API Schemas
// ===========================

export const ChatRequestSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty').max(5000, 'Message too long'),
  conversationId: z.string().uuid().optional(),
  context: z.object({
    analysis_id: z.string().uuid().optional(),
    tender_id: z.string().optional(),
    menu_id: z.string().optional(),
  }).optional(),
});

export const ChatFeedbackSchema = z.object({
  message_id: z.string().uuid(),
  rating: z.enum(['positive', 'negative']),
  comment: z.string().max(1000).optional(),
});

// ===========================
// Orchestration API Schemas
// ===========================

export const OrchestrationJobSchema = z.object({
  workflow_type: z.enum(['full_analysis', 'menu_only', 'cost_only', 'market_only']),
  input_data: z.object({
    analysis_id: z.string().uuid().optional(),
    file_path: z.string().optional(),
    menu_data: z.array(z.any()).optional(),
  }),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional().default('medium'),
  user_id: z.string().optional(),
});

// ===========================
// Helper Functions
// ===========================

/**
 * Safe parse with error formatting
 */
export function safeValidate<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string; details: z.ZodIssue[] } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return {
    success: false,
    error: result.error.issues[0]?.message || 'Validation failed',
    details: result.error.issues,
  };
}

/**
 * Express/Next.js middleware helper (curried validator)
 */
export function createValidator<T>(schema: z.ZodSchema<T>) {
  return (data: unknown): T => {
    return schema.parse(data);
  };
}

/**
 * Query params validation (converts string to proper types)
 */
export function validateQueryParams<T>(schema: z.ZodSchema<T>, params: URLSearchParams): T {
  const obj: Record<string, string | string[]> = {};

  params.forEach((value, key) => {
    if (obj[key]) {
      // Handle multiple values (arrays)
      obj[key] = Array.isArray(obj[key]) ? [...(obj[key] as string[]), value] : [obj[key] as string, value];
    } else {
      obj[key] = value;
    }
  });

  return schema.parse(obj);
}
