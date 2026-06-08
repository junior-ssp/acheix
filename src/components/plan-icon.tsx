import { Gift, Medal, Store } from "lucide-react";

type PlanIconProps = {
  code?: string | null;
  name?: string | null;
  size?: number;
};

export function PlanIcon({ code, name, size = 22 }: PlanIconProps) {
  const normalizedCode = code ?? planCodeFromName(name);
  const className = planIconClassName(normalizedCode);

  if (normalizedCode === "FREE") {
    return <Gift size={size} className={className} strokeWidth={2.4} />;
  }

  if (normalizedCode === "X6" || normalizedCode === "X12") {
    return <Store size={size} className={className} strokeWidth={2.4} />;
  }

  return <Medal size={size} className={className} strokeWidth={2.4} />;
}

export function planIconClassName(code?: string | null) {
  if (code === "FREE") return "text-emerald-400";
  if (code === "BRONZE") return "text-amber-700";
  if (code === "SILVER") return "text-slate-300";
  if (code === "GOLD") return "text-yellow-300";
  if (code === "X6") return "text-violet-300";
  if (code === "X12") return "text-fuchsia-300";
  return "text-yellow-300";
}

function planCodeFromName(name?: string | null) {
  if (name === "GRÁTIS") return "FREE";
  if (name === "BRONZE") return "BRONZE";
  if (name === "PRATA") return "SILVER";
  if (name === "OURO") return "GOLD";
  if (name === "PLANO X6" || name === "X6 PROFISSIONAL") return "X6";
  if (name === "PLANO X12" || name === "X12 PROFISSIONAL") return "X12";
  return undefined;
}
