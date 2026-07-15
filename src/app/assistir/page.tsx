import Link from "next/link";
import { ArrowLeft, ExternalLink, Megaphone, PlayCircle } from "lucide-react";
import { youtubeEmbedSource } from "@/lib/youtube-embed";

export const dynamic = "force-dynamic";

export default function WatchPage({ searchParams }: { searchParams: { video?: string; youtubeUrl?: string } }) {
  const source = youtubeEmbedSource(searchParams.video ?? searchParams.youtubeUrl);

  if (!source) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-black text-yellow-300 hover:text-yellow-200">
          <ArrowLeft size={16} />
          Voltar para o Achei X
        </Link>
        <section className="mt-6 rounded-3xl border border-red-300/25 bg-red-500/10 p-6">
          <h1 className="text-2xl font-black text-white">Vídeo indisponível</h1>
          <p className="mt-2 text-sm text-red-100">O link informado não parece ser um vídeo válido do YouTube.</p>
        </section>
      </main>
    );
  }

  const embedUrl = source.embedUrl;
  const youtubeUrl = source.youtubeUrl;

  return (
    <main className="mx-auto max-w-7xl px-3 py-4 sm:px-4 sm:py-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link href="/" className="inline-flex h-10 items-center gap-2 rounded-full border border-white/10 px-4 text-xs font-black text-white hover:bg-white/10">
          <ArrowLeft size={15} />
          Voltar
        </Link>
        <a href={youtubeUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-2 rounded-full border border-yellow-300/30 px-4 text-xs font-black text-yellow-300 hover:bg-yellow-300/10">
          <ExternalLink size={15} />
          Abrir no YouTube
        </a>
      </div>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="overflow-hidden rounded-3xl border border-yellow-300/20 bg-black shadow-[0_0_40px_rgba(250,204,21,0.10)]">
          <div className="flex items-center gap-2 border-b border-white/10 bg-white/[0.03] px-4 py-3">
            <PlayCircle className="h-5 w-5 text-yellow-300" />
            <div>
              <h1 className="text-sm font-black text-white sm:text-base">Assistindo no Achei X</h1>
              <p className="text-xs text-neutral-400">Player oficial do YouTube dentro do app/site.</p>
            </div>
          </div>
          {source.playable ? (
            <div className="aspect-video bg-black">
              <iframe
                src={embedUrl}
                title="Player de vídeo YouTube"
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </div>
          ) : (
            <div className="grid aspect-video place-items-center bg-black p-6 text-center">
              <div>
                <h2 className="text-2xl font-black text-white">Live sem ID direto</h2>
                <p className="mt-2 max-w-xl text-sm text-neutral-300">
                  Este link do YouTube abriu dentro do Achei X, mas o YouTube não informou um ID de vídeo/live incorporável. Use o link direto da live ou do vídeo para carregar o player aqui.
                </p>
              </div>
            </div>
          )}
        </div>

        <aside className="grid gap-4">
          <InternalAdCard />
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-yellow-300">Continue no Achei X</p>
            <h2 className="mt-2 text-2xl font-black text-white">Anuncie também aqui</h2>
            <p className="mt-2 text-sm text-neutral-300">
              Este espaço fica ao lado do vídeo no computador e embaixo no celular. Ele está preparado para campanhas internas, imagens e chamadas do Achei X.
            </p>
            <Link href="/anunciar-banner" className="mt-4 inline-flex h-11 items-center justify-center rounded-full bg-yellow-300 px-5 text-sm font-black text-black hover:bg-yellow-200">
              Quero anunciar
            </Link>
          </div>
        </aside>
      </section>
    </main>
  );
}

function InternalAdCard() {
  return (
    <div className="overflow-hidden rounded-3xl border border-emerald-300/25 bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.35),rgba(10,10,10,0.96)_55%,rgba(250,204,21,0.18))] p-5">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-yellow-300 text-black shadow-[0_0_24px_rgba(250,204,21,0.25)]">
        <Megaphone size={28} />
      </div>
      <p className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-emerald-300">Propaganda interna</p>
      <h2 className="mt-2 text-3xl font-black text-white">Achei X em destaque</h2>
      <p className="mt-2 text-sm text-neutral-200">
        Área reservada para promoções do app, banners próprios, parceiros ou chamadas especiais durante a exibição do vídeo.
      </p>
    </div>
  );
}
