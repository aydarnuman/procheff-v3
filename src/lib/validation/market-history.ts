import { z } from "zod";

export const MarketHistoryQuerySchema = z.object({
  product: z.string().min(2, "Ürün adı gereklidir"),
  months: z.coerce.number().int().min(1).max(24).optional().default(12),
});

export const MarketHistoryDaysSchema = z.object({
  days: z.coerce.number().int().min(1).max(365).optional().default(30),
});

export type MarketHistoryQuery = z.infer<typeof MarketHistoryQuerySchema>;

