import { z } from "zod";

export const MarketWebRealRequestSchema = z.object({
  product: z.string().min(2, "Ürün adı gereklidir"),
});

export type MarketWebRealRequest = z.infer<typeof MarketWebRealRequestSchema>;

