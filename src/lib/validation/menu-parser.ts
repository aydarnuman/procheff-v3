import { z } from "zod";

/**
 * Schema for menu parser metadata
 */
export const MenuParserMetadataSchema = z.object({
  totalItems: z.number().int().positive(),
  totalPrice: z.number().positive(),
  averageItemPrice: z.number().positive(),
  createdAt: z.string(),
});

/**
 * Schema for parsed menu item
 */
export const ParsedMenuItemSchema = z.object({
  name: z.string().min(1),
  category: z.string().optional(),
  quantity: z.number().positive().optional(),
  unit: z.string().optional(),
  price: z.number().positive().optional(),
  description: z.string().optional(),
});

/**
 * Schema for menu parser request
 */
export const MenuParserRequestSchema = z.object({
  content: z.string().min(1),
  format: z.enum(["csv", "txt", "json", "pdf"]).optional(),
  options: z.object({
    skipEmpty: z.boolean().optional(),
    parsePrice: z.boolean().optional(),
    parseQuantity: z.boolean().optional(),
  }).optional(),
});

/**
 * Schema for menu parser response
 */
export const MenuParserResponseSchema = z.object({
  success: z.boolean(),
  items: z.array(ParsedMenuItemSchema),
  metadata: MenuParserMetadataSchema,
  errors: z.array(z.string()).optional(),
});

export type MenuParserMetadata = z.infer<typeof MenuParserMetadataSchema>;
export type ParsedMenuItem = z.infer<typeof ParsedMenuItemSchema>;
export type MenuParserRequest = z.infer<typeof MenuParserRequestSchema>;
export type MenuParserResponse = z.infer<typeof MenuParserResponseSchema>;