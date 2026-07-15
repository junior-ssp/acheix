import type { Metadata } from "next";
import { LifeBuoy } from "lucide-react";
import { SupportRequestForm } from "@/components/support-request-form";
import { getCurrentUser } from "@/lib/auth";
import { legalCompany } from "@/lib/legal-info";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Fale Conosco | Achei X",
  description: "Envie uma solicitação de suporte para o Achei X."
};

export default async function FaleConoscoPage() {
  const user = await getCurrentUser();

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-start gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-yellow-300 text-black">
          <LifeBuoy size={28} strokeWidth={2.5} />
        </span>
        <div>
          <p className="text-xs font-black uppercase text-yellow-300">Atendimento Achei X</p>
          <h1 className="mt-1 text-3xl font-black">Fale Conosco</h1>
          <p className="mt-2 text-sm text-neutral-300">
            Envie sua dúvida, solicitação ou problema. Se você estiver logado, seus dados da conta serão enviados automaticamente para agilizar o atendimento.
          </p>
        </div>
      </div>

      <SupportRequestForm user={user ? {
        name: user.name,
        username: user.username,
        email: user.email,
        phone: user.phone,
        whatsapp: user.whatsapp
      } : null} />

      <p className="mt-4 text-xs text-neutral-500">
        Canal institucional: <a className="font-black text-yellow-300" href={`mailto:${legalCompany.contactEmail}`}>{legalCompany.contactEmail}</a>
      </p>
    </main>
  );
}
