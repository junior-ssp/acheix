"use client";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto grid min-h-[70vh] max-w-2xl place-items-center px-4 py-10">
      <section className="glass-panel rounded-3xl p-6 text-center">
        <p className="text-sm font-black uppercase text-yellow-300">Falha ao carregar</p>
        <h1 className="mt-2 text-2xl font-black text-white">Não foi possível carregar esta área agora.</h1>
        <p className="mt-3 text-sm leading-relaxed text-neutral-300">
          Tente novamente em instantes. Se o problema continuar, volte pelo menu principal e acesse novamente.
        </p>
        <button type="button" onClick={reset} className="mt-5 inline-flex h-12 items-center justify-center rounded-full px-5 text-sm btn-gold">
          Tentar novamente
        </button>
      </section>
    </main>
  );
}
