import { BackButton } from "@/components/back-button";

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-black">Política de Privacidade</h1>
        <BackButton label="Voltar" />
      </div>
      <section className="mt-6 space-y-4 rounded-lg border border-white/10 bg-neutral-900 p-6 text-neutral-200">
        <h2 className="text-xl font-black text-yellow-300">Retenção e Exclusão de Dados</h2>
        <p>Os dados dos anúncios são armazenados apenas pelo período necessário para a prestação do serviço.</p>
        <p>Anúncios expirados poderão ser mantidos temporariamente para possibilitar renovação pelo usuário.</p>
        <p>Após o término do período de recuperação, os dados poderão ser excluídos permanentemente dos servidores da plataforma.</p>
      </section>
    </main>
  );
}
