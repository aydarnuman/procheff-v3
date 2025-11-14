import { z } from "zod";

export const MenuParserMetadataSchema = z
  .object({
    institution: z.string().min(2).max(120).optional(),
    source: z.string().min(2).max(120).optional(),
    locale: z.enum(["tr", "en"]).optional(),
  })
  .optional();

export type MenuParserMetadata = z.infer<typeof MenuParserMetadataSchema>;

