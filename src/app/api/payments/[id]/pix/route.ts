import { requireUser } from "@/lib/auth";
import { ensureAsaasPixCharge, isAsaasConfigured } from "@/lib/asaas";
import { formatCurrencyBRL } from "@/lib/formatters";
import { errorResponse, json } from "@/lib/http";
import { db, throwDbError } from "@/lib/supabase-db";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const { data: payment, error } = await db()
      .from("Payment")
      .select("id,amountCents,status,provider,providerRef")
      .eq("id", params.id)
      .eq("userId", user.id)
      .maybeSingle();
    throwDbError(error);
    if (!payment) return json({ error: "Pagamento não encontrado." }, 404);

    if (payment.status === "PAID") {
      return json({
        paymentId: payment.id,
        amount: formatCurrencyBRL(payment.amountCents),
        status: payment.status,
        provider: payment.provider ?? "ASAAS",
        confirmation: "Pagamento já confirmado. Nenhum novo PIX será gerado para esta cobrança."
      });
    }

    if (isAsaasConfigured()) {
      const pix = await ensureAsaasPixCharge({
        paymentId: payment.id,
        amountCents: payment.amountCents,
        description: `Achei X - ${payment.providerRef ?? "Pagamento de plano"}`,
        customer: {
          name: user.name,
          email: user.email,
          cpfCnpj: user.cnpj ?? user.cpf,
          phone: user.whatsapp ?? user.phone
        }
      });

      return json({
        paymentId: payment.id,
        amount: formatCurrencyBRL(payment.amountCents),
        status: payment.status,
        ...pix,
        confirmation: "Após pagar o PIX, o plano será liberado automaticamente quando o Asaas confirmar o pagamento."
      });
    }

    return json({
      paymentId: payment.id,
      amount: formatCurrencyBRL(payment.amountCents),
      status: payment.status,
      provider: process.env.PIX_PROVIDER_NAME ?? "standby",
      pixCopyPaste: `PIX-STANDBY|paymentId=${payment.id}|valor=${formatCurrencyBRL(payment.amountCents)}|chave=${process.env.PIX_KEY ?? "PIX_PROVIDER_NAO_CONFIGURADO"}`,
      confirmation: "A confirmação automática será feita pelo webhook quando um provedor PIX real estiver conectado."
    });
  } catch (error) {
    return errorResponse(error);
  }
}
