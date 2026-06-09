"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2 } from "lucide-react";

type PaymentStatusPollerProps = {
  paymentId: string;
  initialStatus: string;
};

export function PaymentStatusPoller({ paymentId, initialStatus }: PaymentStatusPollerProps) {
  const [status, setStatus] = useState(initialStatus);
  const [listing, setListing] = useState<{ slug: string; title: string; status: string } | null>(null);
  const [service, setService] = useState<{ id: string; title: string; status: string } | null>(null);
  const paid = status === "PAID";

  useEffect(() => {
    if (paid) return;
    let cancelled = false;
    const timer = window.setInterval(async () => {
      const response = await fetch(`/api/payments/${paymentId}/status`, { cache: "no-store" }).catch(() => null);
      if (!response?.ok) return;
      const data = await response.json().catch(() => null);
      if (cancelled) return;
      if (typeof data?.payment?.status === "string") setStatus(data.payment.status);
      if (data?.listing?.slug) setListing(data.listing);
      if (data?.service?.id) setService(data.service);
    }, 4000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [paid, paymentId]);

  if (paid) {
    return (
      <div className="rounded-2xl border border-emerald-300/35 bg-emerald-400/15 p-4 text-emerald-50">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-300" size={22} />
          <div>
            <p className="font-black">Pagamento confirmado</p>
            <p className="mt-1 text-sm text-emerald-50/85">Seu plano foi liberado automaticamente.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {listing?.slug ? (
                <Link href={`/anuncios/${listing.slug}`} className="inline-flex h-10 items-center justify-center rounded-full px-4 text-sm btn-gold">
                  Ver anúncio
                </Link>
              ) : null}
              {service?.id ? (
                <Link href="/dashboard#meus-servicos" className="inline-flex h-10 items-center justify-center rounded-full px-4 text-sm btn-gold">
                  Ver serviço
                </Link>
              ) : null}
              <Link href={service?.id ? "/dashboard#meus-servicos" : "/dashboard?meus=ACTIVE#meus-anuncios"} className="inline-flex h-10 items-center justify-center rounded-full border border-white/10 px-4 text-sm font-black text-white">
                Minha Conta
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-2xl border border-yellow-300/25 bg-yellow-300/10 p-3 text-sm font-bold text-yellow-100">
      <Loader2 className="animate-spin" size={18} />
      Aguardando confirmação automática do Asaas...
    </div>
  );
}
