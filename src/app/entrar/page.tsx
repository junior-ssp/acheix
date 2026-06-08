import { AuthForm } from "@/components/auth-form";

export default function LoginPage({ searchParams }: { searchParams: { next?: string } }) {
  const registerHref = searchParams.next ? `/cadastro?next=${encodeURIComponent(searchParams.next)}` : "/cadastro";
  const isAdminLogin = searchParams.next === "/admin" || Boolean(searchParams.next?.startsWith("/admin/"));

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-center text-3xl font-black">Entrar</h1>
      {!isAdminLogin ? <p className="mb-6 mt-2 text-center text-neutral-600 dark:text-neutral-300">Acesse sua conta para anunciar, favoritar e ver contatos.</p> : <div className="mb-6" />}
      <AuthForm mode="login" nextPath={searchParams.next} />
      <p className="mt-4 text-center text-sm"><a className="text-brand" href={registerHref}>Criar conta</a></p>
    </main>
  );
}
