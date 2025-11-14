import { z } from "zod";

export const MenuRobotMetadataSchema = z
  .object({
    institution: z.string().min(2).max(120).optional(),
    source: z.string().min(2).max(120).optional(),
    locale: z.enum(["tr", "en"]).optional(),
  })
  .optional();

export type MenuRobotMetadata = z.infer<typeof MenuRobotMetadataSchema>;

