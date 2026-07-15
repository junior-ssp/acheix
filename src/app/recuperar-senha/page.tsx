import type { Metadata } from "next";
import { PasswordResetRequestForm } from "@/components/password-reset-request-form";

export const metadata: Metadata = {
  title: "Recuperar Senha"
};

export default function RecoverPasswordPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-center text-3xl font-black">Recuperar Senha</h1>
      <p className="mb-6 mt-2 text-center text-neutral-600 dark:text-neutral-300">
        Informe o e-mail cadastrado para receber um link de redefinição.
      </p>
      <PasswordResetRequestForm />
    </main>
  );
}
