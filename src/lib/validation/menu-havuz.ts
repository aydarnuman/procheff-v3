import { z } from "zod";

export const MenuHavuzQuerySchema = z.object({
  category: z.string().min(1).optional(),
  meal_type: z
    .enum(["sabah", "ogle", "aksam", "ara_ogun", "tum"])
    .or(z.string().min(1))
    .optional(),
  institution_type: z.string().min(1).optional(),
});

export type MenuHavuzQuery = z.infer<typeof MenuHavuzQuerySchema>;

