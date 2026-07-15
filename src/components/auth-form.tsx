"use client";

import React, { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import type { ChangeEvent, FocusEvent, FormEvent } from "react";
import { formatBirthDate, formatCnpj, formatCpf, onlyDigits } from "@/lib/formatters";

type MessageState = {
  type: "success" | "error";
  text: string;
} | null;

const rememberLoginPreferenceKey = "acheix-remember-login-choice";

export function AuthForm({ mode, nextPath }: { mode: "login" | "register"; nextPath?: string }) {
  const isAdminLogin = mode === "login" && isAdminNextPath(nextPath);
  const [message, setMessage] = useState<MessageState>(null);
  const [cpfMessage, setCpfMessage] = useState<MessageState>(null);
  const [cpfChecking, setCpfChecking] = useState(false);
  const [created, setCreated] = useState(false);
  const [busy, setBusy] = useState(false);
  const [accountType, setAccountType] = useState<"CPF" | "CNPJ">("CPF");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberLogin, setRememberLogin] = useState(true);

  useEffect(() => {
    if (mode !== "login") return;
    if (isAdminLogin) {
      setRememberLogin(false);
      return;
    }
    try {
      const stored = window.localStorage.getItem(rememberLoginPreferenceKey);
      if (stored === "0") setRememberLogin(false);
      if (stored === "1") setRememberLogin(true);
    } catch {
      // Mantém a opção padrão marcada se o navegador bloquear localStorage.
    }
  }, [isAdminLogin, mode]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (created || busy) return;
    setMessage(null);
    setBusy(true);
    const formData = new FormData(event.currentTarget);
    const payload: Record<string, FormDataEntryValue | string | undefined> = { ...Object.fromEntries(formData.entries()), nextPath };
    if (mode === "login") {
      payload.remember = !isAdminLogin && rememberLogin ? "true" : "false";
    }
    if (mode === "register" && accountType === "CPF") {
      const cpfOk = await validateCpfValue(String(payload.cpf ?? ""));
      if (!cpfOk) {
        setBusy(false);
        return;
      }
    }

    const response = await fetch(mode === "login" ? "/api/auth/login" : "/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await response.json().catch(() => null);
    setBusy(false);

    if (response.ok) {
      if (mode === "register") {
        setCreated(true);
        setMessage({
          type: "success",
          text: data?.message ?? "Cadastro criado. Seu e-mail foi registrado no Achei X."
        });
        return;
      }
      const destination = safeNextPath(nextPath) ?? "/dashboard";
      if (mode === "login" && destination.startsWith("/admin")) {
        sessionStorage.setItem("acheix-admin-runtime-session", String(Date.now()));
      }
      if (mode === "login" && data?.emailAutoValidated) {
        sessionStorage.setItem("acheix-email-auto-validated", "1");
      }
      window.location.href = destination;
      return;
    }

    setMessage({
      type: "error",
      text: data?.error ?? (mode === "register" ? "Não foi possível concluir o cadastro." : "Não foi possível concluir a operação.")
    });
  }

  function maskInput(event: ChangeEvent<HTMLInputElement>, formatter: (value: string) => string) {
    event.currentTarget.value = formatter(event.currentTarget.value);
  }

  function handleCpfChange(event: ChangeEvent<HTMLInputElement>) {
    maskInput(event, formatCpf);
    setCpfMessage(null);
  }

  async function handleCpfBlur(event: FocusEvent<HTMLInputElement>) {
    await validateCpfValue(event.currentTarget.value);
  }

  async function validateCpfValue(value: string) {
    const cpf = onlyDigits(value);
    if (cpf.length === 0) {
      setCpfMessage(null);
      return false;
    }
    if (cpf.length !== 11) {
      setCpfMessage({ type: "error", text: "CPF deve estar no formato XXX.XXX.XXX-XX." });
      return false;
    }

    setCpfChecking(true);
    const response = await fetch(`/api/cpf-validate/${cpf}`, { cache: "no-store" });
    const data = await response.json().catch(() => null);
    setCpfChecking(false);

    if (!response.ok || !data?.valid) {
      setCpfMessage({ type: "error", text: data?.error ?? "Informe um CPF válido." });
      return false;
    }

    const providerText = data.provider && data.provider !== "local" ? ` Validado por ${data.provider}.` : "";
    setCpfMessage({ type: "success", text: `CPF válido.${providerText}` });
    return true;
  }

  return (
    <form onSubmit={submit} className="mx-auto grid max-w-md gap-3 rounded-lg border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-neutral-900">
      {mode === "register" && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <label className={`rounded-md border p-3 text-sm font-black ${accountType === "CPF" ? "border-yellow-300 bg-yellow-300/10 text-yellow-300" : "border-white/10 bg-black/20 text-neutral-300"}`}>
              <input type="radio" name="accountType" value="CPF" checked={accountType === "CPF"} onChange={() => setAccountType("CPF")} disabled={created} className="sr-only" />
              Pessoa Física
            </label>
            <label className={`rounded-md border p-3 text-sm font-black ${accountType === "CNPJ" ? "border-yellow-300 bg-yellow-300/10 text-yellow-300" : "border-white/10 bg-black/20 text-neutral-300"}`}>
              <input type="radio" name="accountType" value="CNPJ" checked={accountType === "CNPJ"} onChange={() => setAccountType("CNPJ")} disabled={created} className="sr-only" />
              Empresa com CNPJ
            </label>
          </div>
          <input name="name" required disabled={created} placeholder={accountType === "CNPJ" ? "Nome completo ou Razão Social" : "Nome completo"} className="input disabled:opacity-60" />
          {accountType === "CPF" ? (
            <div className="grid gap-1">
              <label htmlFor="cpf" className="text-xs font-black uppercase text-neutral-500 dark:text-neutral-400">CPF <span className="text-yellow-300">*</span></label>
              <input id="cpf" name="cpf" required aria-required="true" disabled={created} inputMode="numeric" maxLength={14} onChange={handleCpfChange} onBlur={handleCpfBlur} placeholder="CPF obrigatório" className="input disabled:opacity-60" />
              {cpfChecking ? <p className="text-xs font-semibold text-yellow-300">Validando CPF...</p> : null}
              {cpfMessage ? <p className={`text-xs font-semibold ${cpfMessage.type === "success" ? "text-emerald-300" : "text-red-300"}`}>{cpfMessage.text}</p> : null}
            </div>
          ) : null}
          {accountType === "CNPJ" ? (
            <input name="cnpj" required disabled={created} inputMode="numeric" maxLength={18} onChange={(event) => maskInput(event, formatCnpj)} placeholder="CNPJ" className="input disabled:opacity-60" />
          ) : null}
          <div className="grid gap-1">
            <label htmlFor="birthDate" className="text-xs font-black uppercase text-neutral-500 dark:text-neutral-400">Data de nascimento</label>
            <input
              id="birthDate"
              name="birthDate"
              type="text"
              inputMode="numeric"
              autoComplete="bday"
              maxLength={10}
              disabled={created}
              onChange={(event) => maskInput(event, formatBirthDate)}
              placeholder="DD/MM/AAAA"
              className="input disabled:opacity-60"
            />
          </div>
        </>
      )}
      <div className="grid gap-1">
        <label htmlFor="email" className="text-xs font-black uppercase text-neutral-500 dark:text-neutral-400">E-mail <span className="text-yellow-300">*</span></label>
        <input id="email" name="email" type="email" required aria-required="true" disabled={created} pattern=".+@.+" placeholder="E-mail obrigatório" autoComplete={mode === "login" ? "username email" : "email"} className="input disabled:opacity-60" />
      </div>
      <div className="relative">
        <input
          name="password"
          type={showPassword ? "text" : "password"}
          required
          disabled={created}
          minLength={6}
          placeholder="Senha (mín. 6 caracteres)"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          className="input disabled:opacity-60 pr-10"
        />
        <button
          type="button"
          aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
          onClick={() => setShowPassword((s) => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400"
        >
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {mode === "login" ? (
        <div className="flex items-center justify-between gap-3 text-sm">
          {!isAdminLogin ? (
            <label className="flex items-center gap-2 font-semibold text-neutral-600 dark:text-neutral-300">
              <input
                type="checkbox"
                checked={rememberLogin}
                onChange={(event) => {
                  const checked = event.currentTarget.checked;
                  setRememberLogin(checked);
                  try {
                    window.localStorage.setItem(rememberLoginPreferenceKey, checked ? "1" : "0");
                  } catch {
                    // Ignora navegadores que bloqueiam localStorage.
                  }
                }}
                className="h-4 w-4 accent-yellow-300"
              />
              Manter conectado neste dispositivo
            </label>
          ) : (
            <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400">Login administrativo obrigatório a cada acesso</span>
          )}
          <a href="/recuperar-senha" className="shrink-0 font-bold text-yellow-300">
            Esqueci minha senha
          </a>
        </div>
      ) : null}
      {mode === "register" && (
        <label className="flex items-start gap-2 rounded-md border border-white/10 bg-black/30 p-3 text-sm">
          <input name="acceptTerms" type="checkbox" value="true" required disabled={created} className="mt-1" />
          <span>
            Li e concordo com os <a href="/termos-de-uso" className="font-bold text-yellow-300">Termos de Uso</a> e a <a href="/politica-de-privacidade" className="font-bold text-yellow-300">Política de Privacidade</a>.
          </span>
        </label>
      )}
      {message && (
        <p className={`rounded-md border p-3 text-sm ${message.type === "success" ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" : "border-red-400/30 bg-red-500/10 text-red-300"}`}>
          {message.text}
        </p>
      )}
      {created ? (
        <>
          <a href={nextPath ? `/entrar?next=${encodeURIComponent(nextPath)}` : "/entrar"} className="inline-flex h-12 items-center justify-center rounded-md bg-brand font-bold text-black">
            Ir para entrar
          </a>
        </>
      ) : (
        <button disabled={busy || cpfChecking} className="h-12 rounded-md bg-brand font-bold text-black disabled:cursor-not-allowed disabled:opacity-60">
          {busy ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar conta"}
        </button>
      )}
    </form>
  );
}

function safeNextPath(value?: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}

function isAdminNextPath(value?: string) {
  return value === "/admin" || Boolean(value?.startsWith("/admin/"));
}
