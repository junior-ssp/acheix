import type { SessionUser } from "@/lib/auth";

const complimentaryEmails = new Set(["junior.representacoes.br@gmail.com"]);

export function isPlatformComplimentaryUser(user: Pick<SessionUser, "email"> & Partial<Pick<SessionUser, "role">> | null | undefined) {
  return user?.role === "ADMIN" || complimentaryEmails.has(String(user?.email ?? "").trim().toLowerCase());
}

export function complimentaryReason(user: Pick<SessionUser, "email" | "name">) {
  return `Cortesia automática Achei X para ${user.name} (${user.email}).`;
}
