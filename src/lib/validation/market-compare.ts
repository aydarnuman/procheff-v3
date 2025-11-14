import { z } from "zod";

export const MarketCompareQuerySchema = z.object({
  product: z.string().min(2, "Ürün adı zorunludur"),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  includeOutOfStock: z.coerce.boolean().optional().default(false),
});

export type MarketCompareQuery = z.infer<typeof MarketCompareQuerySchema>;

