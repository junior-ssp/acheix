import type { Metadata } from "next";
import { PasswordResetConfirmForm } from "@/components/password-reset-confirm-form";

export const metadata: Metadata = {
  title: "Redefinir senha"
};

export default function ResetPasswordPage({ searchParams }: { searchParams: { token?: string } }) {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-center text-3xl font-black">Redefinir senha</h1>
      <p className="mb-6 mt-2 text-center text-neutral-600 dark:text-neutral-300">
        Crie uma nova senha para acessar sua conta.
      </p>
      <PasswordResetConfirmForm token={searchParams.token} />
    </main>
  );
}
