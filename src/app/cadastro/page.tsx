import { AuthForm } from "@/components/auth-form";

export default function RegisterPage({ searchParams }: { searchParams: { next?: string } }) {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-center text-3xl font-black">Criar conta</h1>
      <p className="mb-6 mt-2 text-center text-neutral-600 dark:text-neutral-300">Os dados opcionais podem ser completados depois.</p>
      <AuthForm mode="register" nextPath={searchParams.next} />
    </main>
  );
}
