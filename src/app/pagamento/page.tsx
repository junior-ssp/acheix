import Link from "next/link";
import { CreditCard, QrCode } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { formatCurrencyBRL } from "@/lib/formatters";
import { db, throwDbError } from "@/lib/supabase-db";

export const dynamic = "force-dynamic";

export default async function PaymentPage({ searchParams }: { searchParams: { paymentId?: string } }) {
  const user = await requireUser().catch(() => null);
  const payment = user && searchParams.paymentId
    ? await findPayment(searchParams.paymentId, user.id)
    : null;

  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <section className="soft-card rounded-3xl p-6">
        <div className="mb-4 grid h-12 w-12 place-items-center rounded-full bg-yellow-400/15 text-yellow-300">
          <CreditCard size={24} />
        </div>
        <h1 className="text-3xl font-black">Pagamento</h1>
        {payment ? (
          <div className="mt-4 grid gap-3 text-sm text-neutral-200">
            <p><strong className="text-yellow-300">Valor:</strong> {formatCurrencyBRL(payment.amountCents)}</p>
            <p><strong className="text-yellow-300">Status:</strong> {translatePaymentStatus(payment.status)}</p>
            <p className="rounded-2xl border border-yellow-300/25 bg-yellow-300/10 p-3 font-bold text-yellow-100">
              O Plano selecionado será ativado automaticamente assim que o pagamento for confirmado.
            </p>
          </div>
        ) : (
          <p className="mt-4 text-neutral-300">Pagamento não encontrado ou usuário não autenticado.</p>
        )}
        <div className="mt-6 flex flex-wrap gap-2">
          <Link href="/dashboard" className="inline-flex h-11 items-center justify-center rounded-full px-4 text-sm btn-gold">Voltar ao Painel</Link>
          {payment && payment.status === "PENDING" ? (
            <Link href={`/pagamento/pix?paymentId=${payment.id}&novo=1`} className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#22C55E] px-4 text-sm font-black text-black hover:bg-[#34D399]">
              <QrCode size={18} />
              GERAR PIX
            </Link>
          ) : null}
          <Link href="/planos" className="inline-flex h-11 items-center justify-center rounded-full px-4 text-sm btn-gold">Ver Planos</Link>
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
    .select("id,amountCents,status,provider,createdAt")
    .eq("id", paymentId)
    .eq("userId", userId)
    .maybeSingle();
  throwDbError(error);
  return data;
}

