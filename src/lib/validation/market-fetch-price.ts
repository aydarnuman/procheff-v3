import { z } from "zod";

export const MarketFetchPriceSchema = z
  .object({
    productCardId: z.string().min(1).optional(),
    productName: z.string().min(2).optional(),
    institution: z
      .enum(["hastane", "okul", "fabrika", "belediye", "askeri"])
      .optional(),
  })
  .refine(
    (data) => Boolean(data.productCardId || data.productName),
    "productCardId veya productName alanlarından biri zorunludur"
  );

export type MarketFetchPriceRequest = z.infer<typeof MarketFetchPriceSchema>;

