import Link from "next/link";
import { QrCode } from "lucide-react";
import { PixCopyBox } from "@/components/pix-copy-box";
import { requireUser } from "@/lib/auth";
import { ensureAsaasPixCharge, isAsaasConfigured } from "@/lib/asaas";
import { formatCurrencyBRL } from "@/lib/formatters";
import { db, throwDbError } from "@/lib/supabase-db";

export const dynamic = "force-dynamic";

export default async function PixPaymentPage({ searchParams }: { searchParams: { paymentId?: string; novo?: string } }) {
  const user = await requireUser().catch(() => null);
  const payment = user && searchParams.paymentId
    ? await findPayment(searchParams.paymentId, user.id)
    : null;
  const asaasConfigured = isAsaasConfigured();
  const pixResult = user && payment && payment.status === "PENDING" && asaasConfigured
    ? await ensureAsaasPixCharge({
        paymentId: payment.id,
        amountCents: payment.amountCents,
        description: `Achei X - ${payment.providerRef ?? "Pagamento de plano"}`,
        forceNew: searchParams.novo === "1",
        customer: {
          name: user.name,
          email: user.email,
          cpfCnpj: user.cnpj ?? user.cpf,
          phone: user.whatsapp ?? user.phone
        }
      })
        .then((pix) => ({ pix, error: null as string | null }))
        .catch((error) => ({ pix: null, error: error instanceof Error ? error.message : "Não foi possível gerar o PIX no Asaas." }))
    : null;
  const pix = pixResult?.pix ?? null;
  const pixError = pixResult?.error ?? null;

  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <section className="soft-card rounded-3xl p-6">
        <div className="mb-4 grid h-12 w-12 place-items-center rounded-full bg-emerald-500/15 text-emerald-300">
          <QrCode size={24} />
        </div>
        <h1 className="text-3xl font-black">Pagamento via PIX</h1>
        {payment ? (
          <div className="mt-4 grid gap-4 text-sm text-neutral-200">
            <p><strong className="text-yellow-300">Valor:</strong> {formatCurrencyBRL(payment.amountCents)}</p>
            <p><strong className="text-yellow-300">Status:</strong> {translatePaymentStatus(payment.status)}</p>
            <div className="grid place-items-center rounded-3xl border border-white/10 bg-white p-6 text-black">
              {pix?.pixQrCodeBase64 ? (
                <img src={`data:image/png;base64,${pix.pixQrCodeBase64}`} alt="QR Code PIX" className="h-52 w-52" />
              ) : (
                <QrCode size={132} />
              )}
              <p className="mt-3 text-center text-xs font-bold uppercase tracking-wide text-neutral-600">
                {payment.status === "PAID" ? "Pagamento já confirmado" : pix ? "PIX gerado pelo Asaas" : asaasConfigured ? "Não foi possível gerar o PIX" : "PIX aguardando configuração do provedor"}
              </p>
            </div>
            {pixError ? (
              <p className="rounded-2xl border border-red-400/30 bg-red-950/30 p-3 text-sm font-bold text-red-100">
                Erro do Asaas: {pixError}
              </p>
            ) : null}
            {pix?.pixCopyPaste ? <PixCopyBox value={pix.pixCopyPaste} /> : null}
            <p className="rounded-2xl border border-emerald-300/25 bg-emerald-300/10 p-3 text-sm text-emerald-100">
              O plano será liberado automaticamente após a confirmação do pagamento pelo Asaas.
            </p>
          </div>
        ) : (
          <p className="mt-4 text-neutral-300">Pagamento não encontrado ou usuário não autenticado.</p>
        )}
        <div className="mt-6 flex flex-wrap gap-2">
          <Link href="/dashboard" className="inline-flex h-11 items-center justify-center rounded-full px-4 text-sm btn-gold">Voltar ao Painel</Link>
          {payment?.status === "PENDING" ? (
            <Link href={`/pagamento/pix?paymentId=${payment.id}&novo=1`} className="inline-flex h-11 items-center justify-center rounded-full border border-white/10 px-4 text-sm font-black text-white">
              Gerar novo PIX
            </Link>
          ) : null}
        </div>
      </section>
    </main>
  );
}

function translatePaymentStatus(status: string) {
  const labels: Record<string, string> = {
    PENDING: "Pendente",
    PAID: "Pago",
    FAILED: "Falhou",
    REFUNDED: "Reembolsado"
  };
  return labels[status] ?? status;
}

async function findPayment(paymentId: string, userId: string) {
  const { data, error } = await db()
    .from("Payment")
    .select("id,amountCents,status,provider,providerRef")
    .eq("id", paymentId)
    .eq("userId", userId)
    .maybeSingle();
  throwDbError(error);
  return data;
}
