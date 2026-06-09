import { randomBytes, randomUUID } from "crypto";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { onlyDigits } from "@/lib/formatters";
import { errorResponse, json } from "@/lib/http";
import { validateContactMessageSafety } from "@/lib/message-safety";
import { deliverUserNotice } from "@/lib/notifications";
import { isServicePublicContactEnabled, serviceContactPreferenceFromComplement } from "@/lib/service-contact-disclosure";
import { getSupabaseAdmin } from "@/lib/supabase";
import { userSelect } from "@/lib/supabase-db";

export const dynamic = "force-dynamic";

const contactSchema = z.object({
  name: z.string().trim().min(2).optional(),
  email: z.string().trim().email().optional(),
  phone: z.string().optional().refine((value) => !value || onlyDigits(value).length === 11, "Telefone deve estar no formato (xx) XXXXX-XXXX."),
  message: z.string().trim().min(3).max(280).optional()
});

function requestIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip") ?? "unknown";
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = getSupabaseAdmin();
    const user = await getCurrentUser();
    if (!user) return json({ error: "Entre ou crie sua conta para ver o contato deste profissional." }, 401);
    if (user.accountBlockedAt) return json({ error: "Sua conta está temporariamente impedida de ver contatos. Entre em contato com o suporte do Achei X." }, 403);
    const { data: profile, error } = await supabase
      .from("service_profiles")
      .select("id,user_id,telefone_privado,whatsapp_privado,email_privado,complemento,active,status")
      .eq("id", params.id)
      .maybeSingle();

    if (error) throw error;
    if (!profile || !profile.active || !["ACTIVE", "INACTIVE"].includes(profile.status)) {
      return json({ error: "Serviço não encontrado." }, 404);
    }
    if (!isServicePublicContactEnabled(profile.complemento)) {
      return json({ error: "Contato público não autorizado pelo prestador." }, 403);
    }
    if (user.id === profile.user_id) {
      return json({ error: "Você não precisa ver contato do próprio serviço." }, 422);
    }

    const { error: auditError } = await supabase.from("AuditLog").insert({
      id: randomUUID(),
      userId: user.id,
      action: "service.public_contact.viewed",
      metadata: {
        profileId: profile.id,
        targetUserId: profile.user_id,
        viewerUserId: user.id,
        viewerName: user.name,
        viewerEmail: user.email,
        viewerPhone: user.phone ?? user.whatsapp ?? null,
        revealedEmail: profile.email_privado ?? null,
        ip: requestIp(request),
        userAgent: request.headers.get("user-agent") ?? "unknown"
      }
    });
    if (auditError) throw auditError;

    const preference = serviceContactPreferenceFromComplement(profile.complemento);
    return json({
      contact: {
        phone: preference === "PHONE" || preference === "BOTH" ? profile.telefone_privado ? onlyDigits(profile.telefone_privado) : null : null,
        whatsapp: preference === "WHATSAPP" || preference === "BOTH" ? profile.whatsapp_privado ? onlyDigits(profile.whatsapp_privado) : null : null,
        email: profile.email_privado ?? null
      }
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = getSupabaseAdmin();
    const user = await getCurrentUser();
    if (user?.accountBlockedAt) return json({ error: "Sua conta está temporariamente impedida de enviar interesses. Entre em contato com o suporte do Achei X." }, 403);
    const data = contactSchema.parse(await request.json());

    const { data: profile, error: profileError } = await supabase
      .from("service_profiles")
      .select("id,user_id,name,nome_fantasia,categoria_servico")
      .eq("id", params.id)
      .maybeSingle();
    if (profileError) throw profileError;

    if (profile) {
      if (user?.id === profile.user_id) return json({ error: "Você não pode fazer contato no próprio serviço." }, 422);
      if (!user && (!data.name || !data.phone)) return json({ error: "Informe nome e telefone/WhatsApp para enviar seu interesse." }, 422);

      const { data: provider, error: providerError } = await supabase
        .from("User")
        .select(userSelect())
        .eq("id", profile.user_id)
        .maybeSingle();
      if (providerError) throw providerError;
      if (!provider) return json({ error: "Prestador de Serviços não encontrado." }, 404);

      const safety = await validateContactMessageSafety({
        request,
        sender: user,
        targetUserId: profile.user_id,
        message: data.message ?? "Tenho interesse neste serviço.",
        context: { type: "SERVICE", profileId: profile.id }
      });
      if (!safety.allowed) return json({ error: safety.message }, safety.status ?? 403);

      const sampled = Math.random() < 0.1;
      const contact = {
        id: randomUUID(),
        profileId: profile.id,
        interestedUserId: user?.id ?? null,
        name: user?.name ?? data.name ?? null,
        email: user?.email ?? data.email ?? "",
        phone: (user?.phone ?? user?.whatsapp ?? onlyDigits(data.phone)) || null,
        message: data.message ?? "Tenho interesse neste serviço.",
        reviewSampled: sampled,
        reviewToken: sampled ? randomBytes(24).toString("hex") : null
      };
      const { data: created, error } = await supabase.from("ServiceContact").insert(contact).select("id,name").single();
      if (error) throw error;

      const { error: leadAuditError } = await supabase.from("AuditLog").insert({
        id: randomUUID(),
        userId: user?.id ?? null,
        action: "service.lead.sent",
        metadata: {
          profileId: profile.id,
          contactId: created.id,
          targetUserId: profile.user_id,
          ip: requestIp(request),
          userAgent: request.headers.get("user-agent") ?? "unknown"
        }
      });
      if (leadAuditError) throw leadAuditError;

      const title = profile.nome_fantasia ?? profile.name ?? "Serviço";
      const appUrl = getAppBaseUrl(request);
      const responseUrl = `${appUrl}/dashboard?serviceContact=${created.id}#interesses`;
      const notificationMessage = `${created.name ?? "Um usuário"} quer falar sobre ${title}.`;
      await deliverUserNotice(provider as any, "Novo interessado em serviço", notificationMessage, {
        linkLabel: title,
        linkUrl: responseUrl,
        primaryActionLabel: "Ver interessado",
        primaryActionUrl: responseUrl,
        contactLeadId: created.id
      });

      return json({ ok: true, message: "Interesse enviado. O prestador recebeu seu contato e em breve poderá retornar." });
    }

    return json({ error: "Serviço não encontrado." }, 404);
  } catch (error) {
    return errorResponse(error);
  }
}

function getAppBaseUrl(request: Request) {
  const forwardedHost = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
  const forwardedBaseUrl = forwardedHost
    ? `${forwardedProto.split(",")[0].trim()}://${forwardedHost.split(",")[0].trim()}`
    : undefined;
  return (process.env.APP_URL || forwardedBaseUrl || "http://localhost:3000").replace(/\/$/, "");
}

