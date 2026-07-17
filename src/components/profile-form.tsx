"use client";

import type { FormEvent } from "react";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { formatCep, formatCnpj, formatCpf, formatPhone } from "@/lib/formatters";

type ProfileData = {
  name: string;
  username: string | null;
  accountType?: string | null;
  cpf: string;
  cnpj?: string | null;
  phone: string | null;
  whatsapp: string | null;
  whatsapp2: string | null;
  phoneVerifiedAt?: string | Date | null;
  whatsappVerifiedAt?: string | Date | null;
  cep: string | null;
  address: string | null;
  number: string | null;
  complement: string | null;
  district: string | null;
  city: string | null;
  state: string | null;
};

export function ProfileForm({ user, profileCompletion }: { user: ProfileData; profileCompletion?: number }) {
  const [message, setMessage] = useState("");
  const [cepLoading, setCepLoading] = useState(false);
  const [cnpjLoading, setCnpjLoading] = useState(false);
  const [phone, setPhone] = useState(formatPhone(user.phone ?? ""));
  const [whatsapp, setWhatsapp] = useState(formatPhone(user.whatsapp ?? ""));
  const [whatsapp2, setWhatsapp2] = useState(formatPhone(user.whatsapp2 ?? ""));
  const [cpf, setCpf] = useState(formatCpf(user.cpf ?? ""));
  const [cnpj, setCnpj] = useState(formatCnpj(user.cnpj ?? ""));
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [phoneVerifiedAt, setPhoneVerifiedAt] = useState(user.phoneVerifiedAt ?? null);
  const [whatsappVerifiedAt, setWhatsappVerifiedAt] = useState(user.whatsappVerifiedAt ?? null);
  const cpfChanged = user.accountType === "CPF" && Boolean(user.cpf) && digits(cpf) !== digits(user.cpf);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries());
    if (cpfChanged) {
      if (!documentFile || !selfieFile) {
        setMessage("Para alterar CPF, envie documento com CPF e uma selfie.");
        return;
      }
      const requestData = new FormData();
      requestData.set("cpf", cpf);
      requestData.set("document", documentFile);
      requestData.set("selfie", selfieFile);
      const response = await fetch("/api/me/cpf-change-request", {
        method: "POST",
        body: requestData
      });
      const data = await response.json().catch(() => null);
      setMessage(response.ok ? data?.message ?? "Solicitação enviada para análise." : data?.error ?? "Não foi possível enviar a solicitação.");
      return;
    }
    const response = await fetch("/api/me", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await response.json().catch(() => null);
    setMessage(response.ok ? "Perfil atualizado." : data?.error ?? "Não foi possível salvar o perfil.");
  }

  async function lookupCep(event: React.FocusEvent<HTMLInputElement>) {
    const cep = event.currentTarget.value.replace(/\D/g, "");
    if (cep.length !== 8) return;
    setCepLoading(true);
    const form = event.currentTarget.form;
    const response = await fetch(`/api/cep/${cep}`);
    const data = await response.json().catch(() => null);
    setCepLoading(false);
    if (!response.ok || !form) return;
    setInput(form, "address", data.address);
    setInput(form, "district", data.district);
    setInput(form, "city", data.city);
    setInput(form, "state", data.state);
    setInput(form, "complement", data.complement);
  }

  async function lookupCnpj(event: React.FocusEvent<HTMLInputElement>) {
    const value = event.currentTarget.value.replace(/\D/g, "");
    if (value.length !== 14) return;
    setCnpjLoading(true);
    const form = event.currentTarget.form;
    const response = await fetch(`/api/cnpj-lookup/${value}`, { cache: "no-store" }).catch(() => null);
    const data = await response?.json().catch(() => null);
    setCnpjLoading(false);
    if (!response?.ok || !form) return;
    setInput(form, "name", data.companyName || data.tradeName);
    setInput(form, "cep", formatCep(data.cep ?? ""));
    setInput(form, "address", data.address);
    setInput(form, "district", data.district);
    setInput(form, "city", data.city);
    setInput(form, "state", data.state);
    setInput(form, "number", data.number);
    setMessage(`CNPJ consultado via ${data.provider}. Confira os dados preenchidos.`);
  }

  function maskInput(event: ChangeEvent<HTMLInputElement>, formatter: (value: string) => string) {
    event.currentTarget.value = formatter(event.currentTarget.value);
  }

  function changePhone(event: ChangeEvent<HTMLInputElement>) {
    const next = formatPhone(event.currentTarget.value);
    setPhone(next);
    if (digits(next) !== digits(user.phone)) setPhoneVerifiedAt(null);
  }

  function changeWhatsapp(event: ChangeEvent<HTMLInputElement>) {
    const next = formatPhone(event.currentTarget.value);
    setWhatsapp(next);
    if (digits(next) !== digits(user.whatsapp)) setWhatsappVerifiedAt(null);
  }

  function changeCpf(event: ChangeEvent<HTMLInputElement>) {
    setCpf(formatCpf(event.currentTarget.value));
  }

  function changeCnpj(event: ChangeEvent<HTMLInputElement>) {
    setCnpj(formatCnpj(event.currentTarget.value));
  }

  return (
    <section className="mt-8 rounded-lg border border-emerald-400/55 bg-[linear-gradient(145deg,#101010_0%,#101713_60%,#071f12_100%)] p-4 shadow-[0_0_26px_rgba(34,197,94,0.12)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black">Perfil do Usuário</h2>
          <p className="mt-1 text-sm text-neutral-400">Defina seu nome, username, telefone, WhatsApp e endereço quando quiser.</p>
        </div>
        <div className="rounded-lg border border-yellow-300/30 bg-yellow-300/10 px-4 py-3 text-right">
          <p className="text-xs font-black uppercase text-yellow-300">Perfil completo</p>
          <strong className="text-2xl text-white">{profileCompletion ?? 0}%</strong>
        </div>
      </div>
      <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-2">
        <input name="name" required minLength={2} defaultValue={user.name} placeholder="Nome" className="input" />
        <input name="username" defaultValue={user.username ?? ""} placeholder="Username" className="input" />
        <input value={user.accountType === "CNPJ" ? "Empresa com CNPJ" : "Pessoa Física"} readOnly aria-label="Tipo de conta" className="input cursor-not-allowed opacity-80" />
        <input name="cpf" value={cpf} onChange={changeCpf} inputMode="numeric" maxLength={14} aria-label="CPF" placeholder="CPF" className="input" />
        {cpfChanged ? (
          <div className="grid gap-3 rounded-lg border border-yellow-300/40 bg-yellow-300/10 p-3 sm:col-span-2">
            <div>
              <p className="text-sm font-black text-yellow-200">Troca de CPF exige análise do Admin</p>
              <p className="mt-1 text-xs text-neutral-300">Envie RG com CPF ou CNH e uma selfie pela câmera. O CPF atual será mantido até aprovação.</p>
            </div>
            <label className="grid gap-1 text-xs font-black uppercase text-yellow-300">
              Documento com CPF
              <input type="file" accept="image/*" capture="environment" onChange={(event) => setDocumentFile(event.currentTarget.files?.[0] ?? null)} className="input text-sm" />
            </label>
            <CameraSelfieCapture onCapture={setSelfieFile} file={selfieFile} />
          </div>
        ) : null}
        {user.accountType === "CNPJ" ? (
          <input name="cnpj" value={cnpj} onChange={changeCnpj} onBlur={lookupCnpj} inputMode="numeric" maxLength={18} aria-label="CNPJ" placeholder={cnpjLoading ? "Consultando CNPJ..." : "CNPJ"} className="input" />
        ) : null}
        <ContactField
          kind="phone"
          label="Telefone fixo (opcional)"
          name="phone"
          value={phone}
          verifiedAt={phoneVerifiedAt}
          onChange={changePhone}
        />
        <ContactField
          kind="whatsapp"
          label="WhatsApp 1"
          name="whatsapp"
          value={whatsapp}
          verifiedAt={whatsappVerifiedAt}
          onChange={changeWhatsapp}
        />
        <input name="whatsapp2" value={whatsapp2} onChange={(event) => setWhatsapp2(formatPhone(event.currentTarget.value))} inputMode="numeric" maxLength={15} placeholder="WhatsApp 2 (opcional)" aria-label="WhatsApp 2" className="input" />
        <input name="cep" inputMode="numeric" maxLength={9} onChange={(event) => maskInput(event, formatCep)} onBlur={lookupCep} defaultValue={formatCep(user.cep ?? "")} placeholder={cepLoading ? "Buscando CEP..." : "CEP"} className="input" />
        <input name="address" defaultValue={user.address ?? ""} placeholder="Endereço" className="input" />
        <input name="number" defaultValue={user.number ?? ""} placeholder="Número" className="input" />
        <input name="complement" defaultValue={user.complement ?? ""} placeholder="Complemento" className="input" />
        <input name="district" defaultValue={user.district ?? ""} placeholder="Bairro" className="input" />
        <input name="city" defaultValue={user.city ?? ""} placeholder="Cidade" className="input" />
        <input name="state" defaultValue={user.state ?? ""} placeholder="UF" maxLength={2} className="input" />
        <div className="flex items-center gap-3 sm:col-span-2">
          <button className="h-11 rounded-md px-4 btn-gold">Salvar perfil</button>
          {message && <p className="text-sm text-yellow-300">{message}</p>}
        </div>
      </form>
    </section>
  );
}

function CameraSelfieCapture({ file, onCapture }: { file: File | null; onCapture: (file: File | null) => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");

  useEffect(() => {
    if (!file) {
      setPreviewUrl("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => () => stopCamera(), []);

  useEffect(() => {
    if (!cameraOpen || !streamRef.current || !videoRef.current) return;
    const video = videoRef.current;
    let cancelled = false;
    setCameraReady(false);
    setCameraError("");
    video.srcObject = streamRef.current;
    video.onloadedmetadata = () => {
      if (cancelled) return;
      video.play()
        .then(() => {
          if (!cancelled) setCameraReady(true);
        })
        .catch(() => {
          if (!cancelled) setCameraError("Não foi possível iniciar a câmera. Feche e tente novamente.");
        });
    };
    return () => {
      cancelled = true;
      video.onloadedmetadata = null;
    };
  }, [cameraOpen]);

  async function openCamera() {
    setCameraError("");
    setCameraReady(false);
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Câmera indisponível neste navegador. Tente pelo celular ou permita acesso à câmera do dispositivo.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 1280 } },
        audio: false
      });
      streamRef.current = stream;
      setCameraOpen(true);
    } catch {
      setCameraError("Não foi possível abrir a câmera. Verifique a permissão do navegador e tente novamente.");
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOpen(false);
    setCameraReady(false);
  }

  function captureSelfie() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !video.videoWidth || !video.videoHeight) {
      setCameraError("A câmera ainda não carregou. Aguarde um instante e tente novamente.");
      return;
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) {
        setCameraError("Não foi possível capturar a selfie. Tente novamente.");
        return;
      }
      onCapture(new File([blob], `selfie-${Date.now()}.jpg`, { type: "image/jpeg" }));
      stopCamera();
    }, "image/jpeg", 0.9);
  }

  return (
    <div className="grid gap-2 rounded-md border border-yellow-300/25 bg-black/30 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-black uppercase text-yellow-300">Selfie do rosto</p>
          <p className="text-xs text-neutral-300">Tire a foto usando a câmera do celular, PC ou notebook.</p>
        </div>
        {cameraOpen ? (
          <button type="button" onClick={stopCamera} className="rounded-md border border-neutral-700 px-3 py-2 text-xs font-black text-neutral-200">
            Fechar câmera
          </button>
        ) : (
          <button type="button" onClick={openCamera} className="rounded-md bg-yellow-300 px-3 py-2 text-xs font-black text-black">
            Abrir câmera
          </button>
        )}
      </div>

      {cameraOpen ? (
        <div className="grid gap-2">
          <video ref={videoRef} playsInline autoPlay muted className="aspect-video w-full rounded-md border border-yellow-300/30 bg-black object-cover" />
          {!cameraReady ? <p className="text-xs text-yellow-300">Carregando câmera...</p> : null}
          <button type="button" onClick={captureSelfie} disabled={!cameraReady} className="h-11 rounded-md bg-emerald-500 px-4 font-black text-black disabled:cursor-not-allowed disabled:opacity-50">
            {cameraReady ? "Tirar selfie" : "Aguardando câmera"}
          </button>
        </div>
      ) : null}

      {previewUrl ? (
        <div className="flex items-center gap-3 rounded-md border border-emerald-400/30 bg-emerald-400/10 p-2">
          <img src={previewUrl} alt="Selfie capturada" className="h-16 w-16 rounded-md object-cover" />
          <div className="text-xs text-emerald-100">
            <p className="font-black">Selfie capturada pela câmera.</p>
            <button type="button" onClick={() => onCapture(null)} className="mt-1 text-yellow-300 underline">
              Refazer selfie
            </button>
          </div>
        </div>
      ) : null}

      {cameraError ? <p className="text-xs text-red-300">{cameraError}</p> : null}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

function setInput(form: HTMLFormElement, name: string, value?: string) {
  if (!value) return;
  const input = form.elements.namedItem(name) as HTMLInputElement | null;
  if (input) input.value = value;
}

function ContactField({
  kind,
  label,
  name,
  value,
  verifiedAt,
  onChange
}: {
  kind: "phone" | "whatsapp";
  label: string;
  name: string;
  value: string;
  verifiedAt?: string | Date | null;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  const verified = Boolean(verifiedAt);
  const hasMobileNumber = digits(value).length === 11;

  return (
    <div className="grid gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-black uppercase text-neutral-500 dark:text-neutral-400">{label}</span>
        {verified ? (
          <span className="inline-flex rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] font-black text-emerald-200">
            Verificado
          </span>
        ) : (
          <span className="inline-flex rounded-full bg-yellow-300/15 px-2 py-0.5 text-[10px] font-black text-yellow-200">
            Pendente
          </span>
        )}
      </div>
      <input name={name} inputMode="numeric" maxLength={15} onChange={onChange} value={value} placeholder={label} className="input min-w-0" />
    </div>
  );
}

function digits(value: string | null | undefined) {
  return String(value ?? "").replace(/\D/g, "");
}
