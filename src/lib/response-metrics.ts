type LeadTiming = {
  createdAt: Date | string;
  decidedAt: Date | string | null;
  status: string;
};

export type ResponseMetrics = {
  totalLeads: number;
  respondedLeads: number;
  responseRate: number | null;
  averageResponseMinutes: number | null;
  score: number | null;
  stars: number;
  tier: "DIAMOND" | "GOLD" | "STANDARD" | "NEW";
  label: string;
  badgeClassName: string;
};

export function calculateResponseMetrics(leads: LeadTiming[]): ResponseMetrics {
  const totalLeads = leads.length;
  const responded = leads.filter((lead) => lead.status === "WILL_CONTACT" && lead.decidedAt);
  const responseRate = totalLeads ? Math.round((responded.length / totalLeads) * 100) : null;
  const responseMinutes = responded
    .map((lead) => {
      const createdAt = new Date(lead.createdAt).getTime();
      const decidedAt = lead.decidedAt ? new Date(lead.decidedAt).getTime() : NaN;
      return Number.isFinite(createdAt) && Number.isFinite(decidedAt) ? Math.max(0, Math.round((decidedAt - createdAt) / 60000)) : null;
    })
    .filter((value): value is number => value !== null);
  const averageResponseMinutes = responseMinutes.length
    ? Math.round(responseMinutes.reduce((sum, value) => sum + value, 0) / responseMinutes.length)
    : null;

  const speedScore = averageResponseMinutes === null
    ? 30
    : averageResponseMinutes <= 15
      ? 100
      : averageResponseMinutes <= 60
        ? 90
        : averageResponseMinutes <= 360
          ? 72
          : averageResponseMinutes <= 1440
            ? 45
            : 20;
  const responseScore = responseRate ?? 50;
  const satisfactionScore = 80;
  const score = totalLeads ? Math.round(speedScore * 0.5 + responseScore * 0.3 + satisfactionScore * 0.2) : null;
  const tier = score === null
    ? "NEW"
    : responseRate !== null && responseRate >= 98 && (averageResponseMinutes ?? Infinity) <= 30
      ? "DIAMOND"
      : responseRate !== null && responseRate >= 95 && (averageResponseMinutes ?? Infinity) <= 120
        ? "GOLD"
        : "STANDARD";

  return {
    totalLeads,
    respondedLeads: responded.length,
    responseRate,
    averageResponseMinutes,
    score,
    stars: score === null ? 0 : Math.max(1, Math.min(5, Math.round(score / 20))),
    tier,
    label: responseLabel(averageResponseMinutes),
    badgeClassName: responseBadgeClassName(averageResponseMinutes)
  };
}

export function formatAverageResponse(minutes: number | null) {
  if (minutes === null) return "Ainda sem histórico";
  if (minutes < 60) return `em média em ${minutes || 1} min`;
  if (minutes < 1440) return `em média em ${Math.round(minutes / 60)} h`;
  return `em média em ${Math.round(minutes / 1440)} dia(s)`;
}

export function responseTierLabel(tier: ResponseMetrics["tier"]) {
  if (tier === "DIAMOND") return "Perfil Diamante";
  if (tier === "GOLD") return "Perfil Ouro";
  if (tier === "STANDARD") return "Atendimento ativo";
  return "Novo anunciante";
}

function responseLabel(minutes: number | null) {
  if (minutes === null) return "Novo anunciante";
  if (minutes <= 15) return "Responde muito rápido";
  if (minutes <= 60) return "Responde rápido";
  if (minutes <= 360) return "Resposta boa";
  if (minutes <= 1440) return "Resposta lenta";
  return "Muito lento";
}

function responseBadgeClassName(minutes: number | null) {
  if (minutes === null) return "border-sky-300/30 bg-sky-400/10 text-sky-100";
  if (minutes <= 60) return "border-emerald-300/30 bg-emerald-400/10 text-emerald-100";
  if (minutes <= 360) return "border-yellow-300/30 bg-yellow-300/10 text-yellow-100";
  if (minutes <= 1440) return "border-orange-300/30 bg-orange-400/10 text-orange-100";
  return "border-red-300/30 bg-red-400/10 text-red-100";
}
