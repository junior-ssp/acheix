import { z } from "zod";

export const contactLeadSchema = z.object({
  name: z.string().min(2).optional().or(z.literal("")),
  email: z.string().email(),
  phone: z.string().min(8)
});
