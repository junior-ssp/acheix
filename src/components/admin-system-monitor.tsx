"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, RefreshCw, Server, XCircle } from "lucide-react";

type ServiceState = "operational" | "degraded" | "offline";

type ServiceCheck = {
  name: string;
  status: ServiceState;
  checkedAt: string;
  responseMs: number | null;
  detail: string;
};

type Capacity = {
  available: boolean;
  totalBytes: number;
  usedBytes: number | null;
  freeBytes: number | null;
  usagePercent: number | null;
  imageCount?: number | null;
  fileCount?: number | null;
};

type SystemStatus = {
  checkedAt: string;
  summary: {
    healthPercent: number;
    infrastructure: ServiceState;
    database: ServiceState;
    storage: ServiceState;
    domain: ServiceState;
    deploy: ServiceState;
  };
  services: ServiceCheck[];
  database: Capacity;
  storage: Capacity;
  domain: {
    sslActive: boolean;
    sslExpiresAt: string | null;
    domainExpiresAt: string | null;
    sslDaysLeft: number | null;
    domainDaysLeft: number | null;
    root: { status: ServiceState; responseMs: number | null };
    www: { status: ServiceState; responseMs: number | null };
  };
  deploy: {
    version: string;
    status: ServiceState;
    currentUrl: string;
    environment: string;
    lastDeployAt: string | null;
    buildTime: string | null;
  };
  alerts: Array<{ level: ServiceState; title: string; message: string }>;
};

const stateLabel: Record<ServiceState, string> = {
  operational: "Operacional",
  degraded: "Instável",
  offline: "Offline"
};

const stateColor: Record<ServiceState, string> = {
  operational: "text-emerald-300",
  degraded: "text-yellow-300",
  offline: "text-red-300"
};

export function AdminSystemMonitor() {
  const [data, setData] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    try {
      setLoading(true);
      setError("");
      const response = await fetch("/api/admin/system-status", { cache: "no-store" });
      if (!response.ok) throw new Error("Falha ao carregar monitoramento.");
      setData(await response.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha no monitoramento.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 30000);
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void load();
    };
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, []);

  const summary = useMemo(() => {
    if (!data) return [];
    return [
      ["Infraestrutura", `${data.summary.healthPercent}%`, data.summary.infrastructure],
      ["Banco de Dados", stateLabel[data.summary.database], data.summary.database],
      ["Storage", stateLabel[data.summary.storage], data.summary.storage],
      ["Domínio", stateLabel[data.summary.domain], data.summary.domain],
      ["Deploy", stateLabel[data.summary.deploy], data.summary.deploy]
    ] as Array<[string, string, ServiceState]>;
  }, [data]);

  return (
    <section id="sistema" className="mt-8 scroll-mt-24 rounded-lg border border-white/10 bg-neutral-950 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black">Gestão do Sistema</h2>
          <p className="mt-1 text-sm text-neutral-400">Monitoramento da plataforma.</p>
        </div>
        <button type="button" onClick={load} className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm font-black text-white hover:bg-white/10">
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Atualizar
        </button>
      </div>

      {error ? <div className="mt-4 rounded-lg border border-red-400/30 bg-red-950/30 p-3 text-sm text-red-200">{error}</div> : null}
      {!data ? <div className="mt-4 text-sm text-neutral-400">Carregando monitoramento...</div> : null}

      {data ? (
        <div className="mt-5 grid gap-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {summary.map(([label, value, status]) => (
              <div key={label} className="rounded-lg border border-white/10 bg-black/30 p-4">
                <p className="text-sm text-neutral-400">{label}</p>
                <strong className={`mt-2 block text-2xl ${stateColor[status]}`}>{value}</strong>
              </div>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <CapacityPanel title="Banco de Dados" data={data.database} />
            <CapacityPanel title="Storage" data={data.storage} fileLabel={data.storage.available ? `${data.storage.fileCount ?? 0} arquivos · ${data.storage.imageCount ?? 0} imagens` : "Indisponível"} />
          </div>

          <div>
            <h3 className="text-lg font-black">Status dos Serviços</h3>
            <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {data.services.map((item) => (
                <ServiceCard key={item.name} item={item} />
              ))}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-white/10 bg-black/30 p-4">
              <h3 className="font-black">Domínio</h3>
              <Info label="acheix.com.br" value={`${stateLabel[data.domain.root.status]} · ${formatMs(data.domain.root.responseMs)}`} />
              <Info label="www.acheix.com.br" value={`${stateLabel[data.domain.www.status]} · ${formatMs(data.domain.www.responseMs)}`} />
              <Info label="SSL" value={data.domain.sslActive ? "Ativo" : "Offline"} />
              <Info label="Vencimento SSL" value={formatOptionalDate(data.domain.sslExpiresAt, data.domain.sslDaysLeft)} />
              <Info label="Vencimento Domínio" value={formatOptionalDate(data.domain.domainExpiresAt, data.domain.domainDaysLeft)} />
            </div>

            <div className="rounded-lg border border-white/10 bg-black/30 p-4">
              <h3 className="font-black">Deploys</h3>
              <Info label="Versão" value={data.deploy.version} />
              <Info label="Status" value={stateLabel[data.deploy.status]} />
              <Info label="Ambiente" value={formatEnvironment(data.deploy.environment)} />
              <Info label="URL Atual" value={data.deploy.currentUrl} />
              <Info label="Último Deploy" value={data.deploy.lastDeployAt ? new Date(data.deploy.lastDeployAt).toLocaleString("pt-BR") : "Não Informado"} />
              <Info label="Tempo de Build" value={data.deploy.buildTime ?? "Não Informado"} />
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-black/30 p-4">
            <h3 className="font-black">Alertas Automáticos</h3>
            <div className="mt-3 grid gap-2">
              {data.alerts.length ? data.alerts.map((alert) => (
                <div key={`${alert.title}-${alert.message}`} className={`rounded-md border p-3 text-sm ${alert.level === "offline" ? "border-red-400/30 bg-red-950/30 text-red-200" : "border-yellow-300/30 bg-yellow-950/20 text-yellow-100"}`}>
                  <strong>{alert.title}</strong>
                  <p>{alert.message}</p>
                </div>
              )) : <p className="text-sm text-emerald-300">Nenhum alerta crítico agora.</p>}
            </div>
          </div>

          <p className="text-xs text-neutral-500">Última Verificação: {new Date(data.checkedAt).toLocaleString("pt-BR")}</p>
        </div>
      ) : null}
    </section>
  );
}

function ServiceCard({ item }: { item: ServiceCheck }) {
  const Icon = item.status === "operational" ? CheckCircle2 : item.status === "degraded" ? AlertTriangle : XCircle;
  return (
    <article className="rounded-lg border border-white/10 bg-black/30 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="font-black">{item.name}</h4>
          <p className="mt-1 text-xs text-neutral-400">{item.detail}</p>
        </div>
        <Icon className={stateColor[item.status]} size={22} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-neutral-300">
        <span>Status: <b className={stateColor[item.status]}>{stateLabel[item.status]}</b></span>
        <span>Resposta: <b>{formatMs(item.responseMs)}</b></span>
        <span className="col-span-2">Última Verificação: {new Date(item.checkedAt).toLocaleTimeString("pt-BR")}</span>
      </div>
    </article>
  );
}

function formatEnvironment(environment: string) {
  const labels: Record<string, string> = {
    production: "Produção",
    preview: "Prévia",
    development: "Desenvolvimento",
    local: "Local"
  };

  return labels[environment.toLowerCase()] ?? environment;
}

function CapacityPanel({ title, data, fileLabel }: { title: string; data: Capacity; fileLabel?: string }) {
  const percent = data.usagePercent;
  const color = percent === null ? "#737373" : percent <= 70 ? "#22c55e" : percent <= 90 ? "#facc15" : "#ef4444";
  return (
    <div className="rounded-lg border border-white/10 bg-black/30 p-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative grid h-32 w-32 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(${color} ${(percent ?? 0) * 3.6}deg, rgb(255 255 255 / 0.12) 0deg)` }}>
          <div className="grid h-24 w-24 place-items-center rounded-full bg-neutral-950">
            <div className="text-center">
              <strong className="block text-2xl">{percent === null ? "—" : `${percent}%`}</strong>
              <span className="text-xs text-neutral-400">Uso</span>
            </div>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="flex items-center gap-2 font-black"><Server size={18} /> {title}</h3>
          <div className="mt-3 grid gap-1 text-sm text-neutral-300">
            <Info label="Utilizado" value={formatBytes(data.usedBytes)} />
            <Info label="Disponível" value={formatBytes(data.freeBytes)} />
            <Info label="Limite" value={formatBytes(data.totalBytes)} />
            {fileLabel ? <Info label="Arquivos" value={fileLabel} /> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <p className="mt-1 flex flex-wrap justify-between gap-2 text-sm text-neutral-300">
      <span>{label}</span>
      <strong className="text-white">{value}</strong>
    </p>
  );
}

function formatMs(value: number | null) {
  return value === null ? "Não Informado" : `${value} ms`;
}

function formatBytes(value: number | null) {
  if (value === null) return "Indisponível";
  if (value >= 1024 ** 3) return `${(value / 1024 ** 3).toFixed(1)} GB`;
  if (value >= 1024 ** 2) return `${(value / 1024 ** 2).toFixed(1)} MB`;
  return `${Math.round(value / 1024)} KB`;
}

function formatOptionalDate(value: string | null, days: number | null) {
  if (!value) return "Não Informado";
  const formatted = new Date(value).toLocaleDateString("pt-BR");
  return days === null ? formatted : `${formatted} · ${days} dias`;
}
