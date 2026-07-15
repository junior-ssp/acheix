import { BannerAdvertiseForm } from "@/components/banner-advertise-form";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdvertiseBannerPage({ searchParams }: { searchParams?: { placement?: string } }) {
  const user = await getCurrentUser();
  const initialPlacement = searchParams?.placement === "desktop-hero" ? "DESKTOP_HERO" : "CAROUSEL";

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <p className="text-sm font-black uppercase tracking-[0.22em] text-yellow-300">Banners patrocinados</p>
      <h1 className="mt-3 text-3xl font-black sm:text-5xl">Anuncie sua marca no Achei X</h1>

      {user ? (
        <p className="mt-3 text-sm font-bold text-emerald-300">
          Você está logado como {user.name}. Escolha o plano, envie a imagem e configure o link do banner.
        </p>
      ) : (
        <p className="mt-3 text-sm font-bold text-yellow-200">
          Entre ou crie sua conta para escolher um plano, enviar a imagem e configurar o link do banner.
        </p>
      )}

      <BannerAdvertiseForm authenticated={Boolean(user)} initialPlacement={initialPlacement} />

      <div className="mt-8 rounded-3xl border border-yellow-300/25 bg-yellow-300/10 p-5">
        <h2 className="text-lg font-black text-yellow-200">Formato recomendado</h2>
        <ul className="mt-3 grid gap-2 text-sm text-neutral-200">
          <li>
            <strong>Formato:</strong> imagem em WebP, JPG ou PNG. Recomendado: WebP.
          </li>
          <li>
            <strong>Desktop/notebook:</strong> proporção horizontal 7:1. Tamanho ideal: 1400 × 200 px.
          </li>
          <li>
            <strong>Celular/app:</strong> proporção horizontal 3:1. Tamanho ideal: 900 × 300 px.
          </li>
          <li>
            <strong>Peso ideal:</strong> até 300 KB por imagem para manter o app rápido.
          </li>
          <li>
            <strong>Conteúdo:</strong> texto grande, logo legível e poucos elementos para facilitar a leitura no celular.
          </li>
          <li>
            <strong>Vídeo:</strong> ainda não disponível nesta etapa.
          </li>
        </ul>
      </div>
    </main>
  );
}
