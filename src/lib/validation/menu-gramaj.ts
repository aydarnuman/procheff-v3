import { z } from "zod";

const institutionTypes = [
  "hastane",
  "okul",
  "fabrika",
  "belediye",
  "askeri",
  "yurt",
  "universite",
] as const;

export const MenuGramajRequestSchema = z.object({
  items: z.array(z.number().int().positive()).min(1, "En az bir ürün seçilmelidir"),
  institution_type: z
    .enum(institutionTypes)
    .or(z.string().min(2))
    .transform((value) => value.toString()),
  persons: z.coerce
    .number()
    .int()
    .positive()
    .max(100_000, "Kişi sayısı 100.000'i aşamaz"),
});

export type MenuGramajRequest = z.infer<typeof MenuGramajRequestSchema>;

