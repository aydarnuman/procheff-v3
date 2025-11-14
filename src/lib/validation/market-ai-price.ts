import { PriceRequestSchema } from "@/lib/market/schema";
import { z } from "zod";

export const MarketAIPriceSchema = PriceRequestSchema;

export type MarketAIPriceRequest = z.infer<typeof MarketAIPriceSchema>;

