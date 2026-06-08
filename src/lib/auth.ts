import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { withTimeout } from "@/lib/async";
import { db, throwDbError, userSelect } from "@/lib/supabase-db";

const cookieName = "acheix_token";
const adminCookieName = "acheix_admin_token";

export type SessionRole = "USER" | "ADMIN";
export type SessionNotificationChannel = "IN_APP" | "PUSH" | "EMAIL" | "SMS" | "WHATSAPP";

export type SessionUser = {
  id: string;
  name: string;
  username: string | null;
  email: string;
  accountType: string;
  cpf: string;
  cnpj: string | null;
  birthDate: string | Date | null;
  phone: string | null;
  whatsapp: string | null;
  cpfVerifiedAt: string | Date | null;
  phoneVerifiedAt: string | Date | null;
  whatsappVerifiedAt: string | Date | null;
  identityVerifiedAt: string | Date | null;
  verificationProvider: string | null;
  cep: string | null;
  address: string | null;
  number: string | null;
  complement: string | null;
  district: string | null;
  city: string | null;
  state: string | null;
  notificationChannel: SessionNotificationChannel;
  notificationChannels: SessionNotificationChannel[];
  role: SessionRole;
  accountBlockedAt: string | Date | null;
  accountBlockedReason: string | null;
  serviceBlockedAt: string | Date | null;
  serviceBlockedReason: string | null;
};

type JwtPayload = {
  userId: string;
  role: SessionRole;
};

type AdminJwtPayload = {
  userId: string;
  role: "ADMIN";
  kind: "ADMIN_SESSION";
};

function jwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not configured");
  return secret;
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function signSession(payload: JwtPayload) {
  return jwt.sign(payload, jwtSecret(), { expiresIn: "7d" });
}

export function signAdminSession(payload: Omit<AdminJwtPayload, "kind">) {
  return jwt.sign({ ...payload, kind: "ADMIN_SESSION" }, jwtSecret(), { expiresIn: "20m" });
}

export function setSessionCookie(token: string) {
  cookies().set(cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });
}

export function setAdminSessionCookie(token: string) {
  cookies().set(adminCookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 20
  });
}

export function clearSessionCookie() {
  cookies().delete(cookieName);
}

export function clearAdminSessionCookie() {
  cookies().delete(adminCookieName);
}

export function clearAllSessionCookies() {
  clearSessionCookie();
  clearAdminSessionCookie();
}

export async function getCurrentUser() {
  const token = cookies().get(cookieName)?.value;
  if (!token) return null;

  try {
    const payload = jwt.verify(token, jwtSecret()) as JwtPayload;
    return findUserForSession(payload.userId);
  } catch {
    return null;
  }
}

export async function getCurrentAdminSessionUser() {
  const token = cookies().get(adminCookieName)?.value;
  if (!token) return null;

  try {
    const payload = jwt.verify(token, jwtSecret()) as AdminJwtPayload;
    if (payload.kind !== "ADMIN_SESSION" || payload.role !== "ADMIN") return null;
    const user = await findUserForSession(payload.userId);
    if (user?.role !== "ADMIN") return null;
    return user;
  } catch {
    return null;
  }
}

async function findUserForSession(userId: string) {
  return withTimeout(
    (async () => {
      const { data, error } = await db()
        .from("User")
        .select(userSelect())
        .eq("id", userId)
        .maybeSingle();
      throwDbError(error);
      return data as SessionUser | null;
    })(),
    null,
    5000
  );
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Response("Unauthorized", { status: 401 });
  return user;
}

export async function requireAdmin() {
  const user = await getCurrentAdminSessionUser();
  if (!user) throw new Response("Unauthorized", { status: 401 });
  return user;
}

