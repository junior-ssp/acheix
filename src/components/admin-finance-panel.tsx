import type { FinancePaymentRow, FinanceRange, FinanceSummary } from "@/lib/admin-finance";

export function AdminFinancePanel({ summaries, rows, range }: { summaries: FinanceSummary[]; rows: FinancePaymentRow[]; range: FinanceRange }) {
  const maxRevenue = Math.max(...summaries.map((item) => item.revenueCents), 1);
  const custom = summaries.find((item) => item.label === "Período") ?? summaries[summaries.length - 1];
  const exportHref = `/api/admin/finance/export?start=${encodeURIComponent(range.startInput)}&end=${encodeURIComponent(range.endInput)}`;

  return (
    <section id="financeiro" className="mt-8 scroll-mt-24 rounded-lg border border-white/10 bg-neutral-950 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-black">Financeiro</h2>
          <p className="mt-1 text-sm text-neutral-400">Receita, renovações, períodos e exportação com dados reais do banco.</p>
        </div>
        <a href={exportHref} className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-black text-black transition hover:bg-emerald-300">
          Exportar Excel
        </a>
      </div>

      <form className="mt-4 grid gap-2 rounded-lg border border-white/10 bg-black/30 p-3 sm:grid-cols-[1fr_1fr_auto]" action="/admin#financeiro">
        <label className="grid gap-1 text-xs font-black uppercase text-neutral-400">
          Início
          <input type="date" name="financeStart" defaultValue={range.startInput} className="input normal-case" />
        </label>
        <label className="grid gap-1 text-xs font-black uppercase text-neutral-400">
          Fim
          <input type="date" name="financeEnd" defaultValue={range.endInput} className="input normal-case" />
        </label>
        <button className="rounded-full px-5 btn-gold sm:self-end">Pesquisar</button>
      </form>

      <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
        {summaries.map((item) => (
          <article key={item.label} className={`rounded-md border px-3 py-2.5 ${item.label === "Período" ? "border-yellow-300/40 bg-yellow-300/10" : "border-white/10 bg-black/25"}`}>
            <p className="text-[11px] font-black uppercase text-neutral-400">{item.label}</p>
            <strong className="mt-1 block text-lg leading-tight text-white">{formatCurrency(item.revenueCents)}</strong>
            <p className="mt-1 text-[11px] text-neutral-400">{item.paidPayments} pagos · {item.renewedListings} renovações</p>
            <p className="text-[11px] font-black text-yellow-300">{formatPercent(item.renewalPercent)} renovados</p>
          </article>
        ))}
      </div>

      <div className="mt-4 rounded-lg border border-white/10 bg-black/30 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-black">Receita por período</h3>
            <p className="text-xs text-neutral-400">Comparativo rápido dos períodos principais.</p>
          </div>
          <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-black text-neutral-300">Base: pagamentos PAID</span>
        </div>
        <div className="mt-4 grid gap-2">
          {summaries.filter((item) => item.label !== "Período").map((item) => (
            <div key={item.label} className="grid grid-cols-[82px_1fr_105px] items-center gap-2 text-xs sm:grid-cols-[110px_1fr_130px]">
              <span className="font-black text-neutral-300">{item.label}</span>
              <span className="h-3 overflow-hidden rounded-full bg-white/10">
                <span className="block h-full rounded-full bg-gradient-to-r from-yellow-300 to-emerald-400" style={{ width: `${Math.max(4, Math.round((item.revenueCents / maxRevenue) * 100))}%` }} />
              </span>
              <span className="text-right font-black text-white">{formatCurrency(item.revenueCents)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <SmallMetric label="Receita do período" value={formatCurrency(custom.revenueCents)} />
        <SmallMetric label="Anúncios renovados" value={`${custom.renewedListings}`} />
        <SmallMetric label="Percentual renovado" value={formatPercent(custom.renewalPercent)} />
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-white/10">
        <div className="border-b border-white/10 bg-white/5 p-3">
          <h3 className="font-black">Movimentações do período</h3>
          <p className="text-xs text-neutral-400">Mostrando até 500 registros. Use exportação para relatório parcial do período pesquisado.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[860px] w-full text-left text-sm">
            <thead className="bg-black/40 text-xs uppercase text-neutral-400">
              <tr>
                <th className="p-3">Data</th>
                <th className="p-3">Usuário</th>
                <th className="p-3">Tipo</th>
                <th className="p-3">Valor</th>
                <th className="p-3">Status</th>
                <th className="p-3">Anúncio/Plano</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-white/10 bg-black/20 align-top">
                  <td className="p-3 text-neutral-300">{formatDate(row.date)}</td>
                  <td className="p-3"><strong>{row.userName}</strong><br /><span className="text-xs text-neutral-400">{row.userEmail}</span></td>
                  <td className="p-3 text-yellow-200">{row.kind}</td>
                  <td className="p-3 font-black">{formatCurrency(row.amountCents)}</td>
                  <td className="p-3">{row.status}</td>
                  <td className="p-3 text-neutral-300">{row.listings || "-"}<br /><span className="text-xs text-neutral-500">{row.plans || row.provider}</span></td>
                </tr>
              ))}
              {!rows.length ? (
                <tr>
                  <td colSpan={6} className="p-4 text-sm text-neutral-400">Nenhuma movimentação encontrada no período pesquisado.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function SmallMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-black/30 px-3 py-2">
      <p className="text-[11px] font-black uppercase text-neutral-500">{label}</p>
      <p className="mt-1 text-xl font-black text-white">{value}</p>
    </div>
  );
}

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

function formatPercent(value: number) {
  return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(value)}%`;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(date);
}
