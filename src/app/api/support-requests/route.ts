import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { onlyDigits } from "@/lib/formatters";
import { errorResponse, json } from "@/lib/http";
import { db, newDbId, throwDbError } from "@/lib/supabase-db";

export const dynamic = "force-dynamic";

const supportRequestSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome.").max(120, "Nome muito longo.").optional().or(z.literal("")),
  email: z.string().trim().email("Informe um e-mail válido.").max(180, "E-mail muito longo.").optional().or(z.literal("")),
  phone: z.string().trim().max(30, "Telefone muito longo.").optional().or(z.literal("")),
  category: z.enum(["SUPORTE", "CONTA", "ANUNCIO", "PAGAMENTO", "APP", "OUTRO"]).default("SUPORTE"),
  subject: z.string().trim().min(4, "Informe o assunto.").max(120, "Assunto muito longo."),
  message: z.string().trim().min(10, "Escreva uma mensagem com mais detalhes.").max(2500, "Mensagem muito longa."),
  website: z.string().trim().max(0).optional().or(z.literal(""))
});

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    const data = supportRequestSchema.parse(await request.json().catch(() => ({})));

    if (!user && (!data.name || !data.email)) {
      return json({ error: "Informe nome e e-mail para o suporte responder." }, 422);
    }

    const contact = user
      ? {
          userId: user.id,
          name: user.name,
          username: user.username,
          email: user.email,
          phone: user.phone,
          whatsapp: user.whatsapp
        }
      : {
          userId: null,
          name: data.name ?? "",
          username: null,
          email: data.email ?? "",
          phone: data.phone ? onlyDigits(data.phone) : null,
          whatsapp: null
        };

    const { error } = await db().from("SupportRequest").insert({
      id: newDbId(),
      ...contact,
      category: data.category,
      subject: data.subject,
      message: data.message,
      status: "OPEN",
      source: "APP",
      userAgent: request.headers.get("user-agent")?.slice(0, 500) ?? null
    });
    throwDbError(error);

    return json({ ok: true, message: "Mensagem enviada. O suporte do Achei X recebeu sua solicitação." }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
