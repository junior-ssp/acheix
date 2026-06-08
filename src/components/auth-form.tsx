"use client";

import React, { useEffect, useRef, useState } from "react";
import type { ChangeEvent, FocusEvent, FormEvent } from "react";
import { formatCnpj, formatCpf, formatPhone, onlyDigits } from "@/lib/formatters";

type MessageState = {
  type: "success" | "error";
  text: string;
} | null;

const rememberedEmailKey = "acheix-login-email";
const rememberEmailEnabledKey = "acheix-login-email-enabled";

export function AuthForm({ mode, nextPath }: { mode: "login" | "register"; nextPath?: string }) {
  const [message, setMessage] = useState<MessageState>(null);
  const [cpfMessage, setCpfMessage] = useState<MessageState>(null);
  const [cpfChecking, setCpfChecking] = useState(false);
  const [created, setCreated] = useState(false);
  const [busy, setBusy] = useState(false);
  const [accountType, setAccountType] = useState<"CPF" | "CNPJ">("CPF");
  const [rememberedEmail, setRememberedEmail] = useState("");
  const [rememberEmail, setRememberEmail] = useState(true);
  const loginEmailInputRef = useRef<HTMLInputElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const phoneEditedRef = useRef(false);

  useEffect(() => {
    if (mode !== "login") return;
    const enabled = readLocalStorage(rememberEmailEnabledKey) !== "false";
    const savedEmail = readLocalStorage(rememberedEmailKey) ?? "";
    setRememberEmail(enabled);
    if (enabled) {
      setRememberedEmail(savedEmail);
      if (loginEmailInputRef.current && savedEmail) loginEmailInputRef.current.value = savedEmail;
    }
  }, [mode]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (created || busy) return;
    setMessage(null);
    setBusy(true);
    const formData = new FormData(event.currentTarget);
    const payload: Record<string, FormDataEntryValue | string | undefined> = { ...Object.fromEntries(formData.entries()), nextPath };
    const submittedEmail = typeof payload.email === "string" ? payload.email : "";

    if (mode === "register") {
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
      if (mode === "login") {
        if (rememberEmail && submittedEmail) {
          saveRememberedEmail(submittedEmail);
        } else {
          writeLocalStorage(rememberEmailEnabledKey, "false");
          removeLocalStorage(rememberedEmailKey);
        }
      }
      if (mode === "register") {
        setCreated(true);
        setMessage({
          type: "success",
          text: data?.message ?? "Cadastro criado. Confira seu e-mail para validar a conta."
        });
        return;
      }
      const destination = safeNextPath(nextPath) ?? "/dashboard";
      if (mode === "login" && destination.startsWith("/admin")) {
        sessionStorage.setItem("acheix-admin-runtime-session", String(Date.now()));
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

  function handlePhoneChange(event: ChangeEvent<HTMLInputElement>) {
    const formatted = formatPhone(event.currentTarget.value);
    event.currentTarget.value = formatted;
    phoneEditedRef.current = true;
  }

  function handleWhatsappChange(event: ChangeEvent<HTMLInputElement>) {
    const formatted = formatPhone(event.currentTarget.value);
    event.currentTarget.value = formatted;
    if (!phoneEditedRef.current && phoneInputRef.current) {
      phoneInputRef.current.value = formatted;
    }
  }

  function handleLoginEmailChange(event: ChangeEvent<HTMLInputElement>) {
    const value = event.currentTarget.value;
    setRememberedEmail(value);
    if (rememberEmail) saveRememberedEmail(value);
  }

  function handleRememberEmailChange(event: ChangeEvent<HTMLInputElement>) {
    const checked = event.currentTarget.checked;
    setRememberEmail(checked);
    writeLocalStorage(rememberEmailEnabledKey, String(checked));
    if (checked && rememberedEmail) {
      saveRememberedEmail(rememberedEmail);
      return;
    }
    if (!checked) removeLocalStorage(rememberedEmailKey);
  }

  function handleLoginEmailBlur(event: FocusEvent<HTMLInputElement>) {
    if (rememberEmail) saveRememberedEmail(event.currentTarget.value);
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
          <input name="name" required disabled={created} placeholder={accountType === "CNPJ" ? "Nome ou Razão Social" : "Nome"} className="input disabled:opacity-60" />
          <div className="grid gap-1">
            <label htmlFor="cpf" className="text-xs font-black uppercase text-neutral-500 dark:text-neutral-400">CPF <span className="text-yellow-300">*</span></label>
            <input id="cpf" name="cpf" required aria-required="true" disabled={created} inputMode="numeric" maxLength={14} onChange={handleCpfChange} onBlur={handleCpfBlur} placeholder="CPF obrigatório" className="input disabled:opacity-60" />
            {cpfChecking ? <p className="text-xs font-semibold text-yellow-300">Validando CPF...</p> : null}
            {cpfMessage ? <p className={`text-xs font-semibold ${cpfMessage.type === "success" ? "text-emerald-300" : "text-red-300"}`}>{cpfMessage.text}</p> : null}
          </div>
          {accountType === "CNPJ" ? (
            <input name="cnpj" required disabled={created} inputMode="numeric" maxLength={18} onChange={(event) => maskInput(event, formatCnpj)} placeholder="CNPJ" className="input disabled:opacity-60" />
          ) : null}
          <label className="grid gap-1 text-xs font-black uppercase text-neutral-500 dark:text-neutral-400">
            Data de Nascimento <span className="text-yellow-300">*</span>
            <input name="birthDate" required aria-required="true" disabled={created} type="date" max={maxAdultBirthDate()} className="input text-base font-semibold normal-case disabled:opacity-60" />
          </label>
          <input ref={phoneInputRef} name="phone" required disabled={created} inputMode="numeric" maxLength={15} onChange={handlePhoneChange} placeholder="Telefone" className="input disabled:opacity-60" />
          <input name="whatsapp" required disabled={created} inputMode="numeric" maxLength={15} onChange={handleWhatsappChange} placeholder="WhatsApp" className="input disabled:opacity-60" />
        </>
      )}
      <div className="grid gap-1">
        <label htmlFor="email" className="text-xs font-black uppercase text-neutral-500 dark:text-neutral-400">E-mail <span className="text-yellow-300">*</span></label>
        <input ref={mode === "login" ? loginEmailInputRef : undefined} id="email" name="email" type="email" required aria-required="true" disabled={created} pattern=".+@.+" placeholder="E-mail obrigatório" value={mode === "login" ? rememberedEmail : undefined} onChange={mode === "login" ? handleLoginEmailChange : undefined} onBlur={mode === "login" ? handleLoginEmailBlur : undefined} autoComplete={mode === "login" ? "username email" : "email"} className="input disabled:opacity-60" />
      </div>
      {mode === "login" ? (
        <label className="flex items-center gap-2 text-sm font-semibold text-neutral-600 dark:text-neutral-300">
          <input type="checkbox" checked={rememberEmail} onChange={handleRememberEmailChange} className="h-4 w-4 accent-yellow-300" />
          Lembrar meu e-mail neste aparelho
        </label>
      ) : null}
      <input name="password" type="password" required disabled={created} minLength={6} placeholder="Senha (mín. 6 caracteres)" autoComplete={mode === "login" ? "current-password" : "new-password"} className="input disabled:opacity-60" />
      {mode === "register" && (
        <label className="flex items-start gap-2 rounded-md border border-white/10 bg-black/30 p-3 text-sm">
          <input name="acceptTerms" type="checkbox" required disabled={created} className="mt-1" />
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
        <a href={nextPath ? `/entrar?next=${encodeURIComponent(nextPath)}` : "/entrar"} className="inline-flex h-12 items-center justify-center rounded-md bg-brand font-bold text-black">
          Ir para entrar
        </a>
      ) : (
        <button disabled={busy || cpfChecking} className="h-12 rounded-md bg-brand font-bold text-black disabled:cursor-not-allowed disabled:opacity-60">
          {busy ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar conta"}
        </button>
      )}
    </form>
  );
}

function maxAdultBirthDate() {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 18);
  return date.toISOString().slice(0, 10);
}

function safeNextPath(value?: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}

function saveRememberedEmail(value: string) {
  const email = value.trim().toLowerCase();
  writeLocalStorage(rememberEmailEnabledKey, "true");
  if (email) writeLocalStorage(rememberedEmailKey, email);
}

function readLocalStorage(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeLocalStorage(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Alguns WebViews podem bloquear localStorage.
  }
}

function removeLocalStorage(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Alguns WebViews podem bloquear localStorage.
  }
}


