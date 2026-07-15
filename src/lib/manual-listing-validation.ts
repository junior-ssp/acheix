import { z } from "zod";
import { manualListingDurations } from "@/lib/manual-listings";

const categories = ["VEHICLE", "REAL_ESTATE", "COMPANY", "SERVICE", "PRODUCT"] as const;
const manualListingCategorySchema = z.enum(categories);

export const manualListingSchema = z.object({
  title: z.string().trim().optional().default(""),
  address: z.string().trim().optional().default(""),
  priceCents: z.number().int().nonnegative().nullable().optional().default(null),
  phone: z.string().trim().optional().default(""),
  tollFree: z.string().trim().optional().default(""),
  whatsapp: z.string().trim().optional().default(""),
  whatsapp2: z.string().trim().optional().default(""),
  website: z.string().trim().optional().default(""),
  facebook: z.string().trim().optional().default(""),
  instagram: z.string().trim().optional().default(""),
  youtube: z.string().trim().optional().default(""),
  tiktok: z.string().trim().optional().default(""),
  vidiu: z.string().trim().optional().default(""),
  category: manualListingCategorySchema.optional().default("SERVICE"),
  categories: z.array(manualListingCategorySchema).optional().default([]),
  durationDays: z.coerce
    .number()
    .int()
    .optional()
    .default(30)
    .refine((value) => manualListingDurations.includes(value as any), "Escolha um prazo válido."),
  photos: z.array(z.string().url()).max(5, "Envie no máximo 5 fotos.").default([])
});
