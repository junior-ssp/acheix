"use client";

import { useEffect, useState } from "react";
import type { SiteAccessStats } from "@/lib/site-access-analytics";

export function AdminSiteAccessPanel({ stats: initialStats }: { stats: SiteAccessStats }) {
  const [stats, setStats] = useState(initialStats);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const maxAccess = Math.max(1, ...stats.states.map((state) => state.access_count));
  const hasData = stats.total > 0;

  useEffect(() => {
    let cancelled = false;

    async function refreshStats() {
      const response = await fetch("/api/admin/site-access-stats", { cache: "no-store" }).catch(() => null);
      if (!response?.ok) return;
      const data = await response.json().catch(() => null);
      if (cancelled || !Array.isArray(data?.states)) return;
      setStats(data);
      setLastUpdatedAt(new Date());
    }

    const timer = window.setInterval(refreshStats, 10000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <section id="acessos" className="mt-5 scroll-mt-24 rounded-lg border border-white/10 bg-neutral-950 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase text-yellow-300">Acessos do Site</p>
          <h2 className="mt-1 text-2xl font-black">Contador de acessos</h2>
          <p className="mt-1 text-sm text-neutral-400">Resumo acumulado de visitas públicas desde 12/06/2026 em acheix.com.br.</p>
        </div>
        <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-black text-neutral-200">
          Desde 12/06/2026 · Atualiza a cada 10s{lastUpdatedAt ? ` · ${lastUpdatedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}` : ""}
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <AccessMetric label="Total desde 12/06" value={formatNumber(stats.total)} />
        <AccessMetric label="UFs com acessos" value={`${stats.statesWithAccess}/27`} />
        <AccessMetric
          label="Estado com mais acessos"
          value={stats.topState ? `${stats.topState.state_code} · ${formatNumber(stats.topState.access_count)}` : "Sem dados"}
          detail={stats.topState?.state_name}
        />
      </div>

      {!hasData ? (
        <div className="mt-4 rounded-md border border-dashed border-white/15 bg-black/25 p-4 text-sm text-neutral-300">
          Ainda não há acessos registrados. Os números começam a aparecer após visitantes carregarem páginas públicas do site.
        </div>
      ) : null}

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(28rem,1.1fr)]">
        <div className="rounded-md border border-white/10 bg-black/25 p-4">
          <h3 className="text-sm font-black text-white">Ranking por estado</h3>
          <div className="mt-4 grid gap-2">
            {stats.states.map((state) => (
              <div key={state.state_code} className="grid grid-cols-[2.5rem_minmax(0,1fr)_4.5rem] items-center gap-2 text-xs">
                <span className="font-black text-yellow-200">{state.state_code}</span>
                <div className="h-7 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="flex h-full min-w-8 items-center justify-end rounded-full bg-[#22C55E] px-2 text-[11px] font-black text-black"
                    style={{ width: `${Math.max(6, (state.access_count / maxAccess) * 100)}%` }}
                  >
                    {state.access_count > 0 ? formatNumber(state.access_count) : ""}
                  </div>
                </div>
                <span className="text-right font-bold text-neutral-300">{formatPercent(state.percentage)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-md border border-white/10 bg-black/25">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-white/5 text-xs uppercase text-neutral-400">
                <tr>
                  <th className="px-3 py-3">UF</th>
                  <th className="px-3 py-3">Estado</th>
                  <th className="px-3 py-3 text-right">Acessos</th>
                  <th className="px-3 py-3 text-right">Percentual</th>
                </tr>
              </thead>
              <tbody>
                {stats.states.map((state) => (
                  <tr key={state.state_code} className="border-t border-white/10">
                    <td className="px-3 py-2 font-black text-yellow-200">{state.state_code}</td>
                    <td className="px-3 py-2 text-neutral-200">{state.state_name}</td>
                    <td className="px-3 py-2 text-right font-black text-white">{formatNumber(state.access_count)}</td>
                    <td className="px-3 py-2 text-right text-neutral-300">{formatPercent(state.percentage)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}

function AccessMetric({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-black/30 p-4">
      <p className="text-xs font-black uppercase text-neutral-500">{label}</p>
      <strong className="mt-1 block text-2xl text-white">{value}</strong>
      {detail ? <p className="mt-1 text-xs font-bold text-neutral-400">{detail}</p> : null}
    </div>
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

function formatPercent(value: number) {
  return `${value.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}%`;
}
