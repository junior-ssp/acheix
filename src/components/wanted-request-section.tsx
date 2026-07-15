import { WantedRequestCard, type WantedRequestCardItem } from "@/components/wanted-request-card";

type WantedRequestSectionProps = {
  title?: string;
  requests: WantedRequestCardItem[];
  compact?: boolean;
};

export function WantedRequestSection({ title = "Procura-se relacionado", requests, compact = false }: WantedRequestSectionProps) {
  if (!requests.length) return null;

  return (
    <section className={compact ? "grid gap-3" : "rounded-3xl border border-yellow-300/15 bg-yellow-300/[0.03] p-3 sm:p-4"}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className={`${compact ? "text-base" : "text-lg sm:text-2xl"} font-black uppercase text-yellow-200`}>{title}</h2>
        <a href="/procuro" className="shrink-0 text-xs font-black uppercase text-yellow-300 hover:text-yellow-200">Registrar</a>
      </div>
      <div className={compact ? "grid gap-3" : "grid gap-3 sm:grid-cols-2 lg:grid-cols-3"}>
        {requests.map((request) => (
          <WantedRequestCard key={request.id} request={request} />
        ))}
      </div>
    </section>
  );
}
