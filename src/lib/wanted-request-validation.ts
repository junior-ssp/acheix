import { z } from "zod";
import { hasPublicContactInText, publicContactDescriptionMessage } from "@/lib/public-contact-guard";

export const wantedRequestSchema = z.object({
  title: z.string()
    .trim()
    .transform(stripWantedRequestPrefix)
    .pipe(z.string().min(1, "Informe o titulo.")),
  description: z.string()
    .trim()
    .min(1, "Informe a descrição.")
    .refine((value) => !hasPublicContactInText(value), publicContactDescriptionMessage),
  durationDays: z.coerce.number().int().refine((value) => value === 7 || value === 15 || value === 30, "Escolha 7, 15 ou 30 dias.")
});

export const wantedRequestUpdateSchema = wantedRequestSchema.pick({
  title: true,
  description: true
});

function stripWantedRequestPrefix(value: string) {
  return value
    .replace(/^\s*(procuro|procura-se|procura se)\s*[:\-–—,]?\s*/i, "")
    .trim();
}
