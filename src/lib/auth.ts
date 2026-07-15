import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { db, throwDbError, userSelect } from "@/lib/supabase-db";

export const cookieName = "acheix_token";
export const adminCookieName = "acheix_admin_token";
export const loggedOutCookieName = "acheix_logged_out";

export type SessionRole = "USER" | "ADMIN";
export type SessionNotificationChannel = "IN_APP" | "PUSH" | "EMAIL" | "SMS" | "WHATSAPP";

export type SessionUser = {
  id: string;
  name: string;
  username: string | null;
  email: string;
  emailVerifiedAt: string | Date | null;
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
  allowPublicPhone: boolean;
  allowPublicWhatsapp: boolean;
  allowPublicEmail: boolean;
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
  return jwt.sign({ ...payload, kind: "ADMIN_SESSION" }, jwtSecret(), { expiresIn: "8h" });
}

function sessionCookieOptions(maxAge?: number) {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    ...(process.env.NODE_ENV === "production" ? { domain: ".acheix.com.br" } : {}),
    ...(maxAge === undefined ? {} : { maxAge })
  } as const;
}

export function setSessionCookie(token: string, options: { remember?: boolean } = {}) {
  cookies().set(cookieName, token, sessionCookieOptions(options.remember ? 60 * 60 * 24 * 7 : undefined));
  clearLoggedOutCookie();
}

export function setAdminSessionCookie(token: string) {
  cookies().set(adminCookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8
  });
}

export function clearSessionCookie() {
  cookies().set(cookieName, "", sessionCookieOptions(0));
}

export function clearAdminSessionCookie() {
  cookies().set(adminCookieName, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });
}

export function clearAllSessionCookies() {
  clearSessionCookie();
  clearAdminSessionCookie();
  setLoggedOutCookie();
}

export function setLoggedOutCookie() {
  cookies().set(loggedOutCookieName, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365
  });
}

export function clearLoggedOutCookie() {
  cookies().set(loggedOutCookieName, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });
}

export async function getCurrentUser() {
  if (cookies().get(loggedOutCookieName)?.value === "1") return null;
  const token = cookies().get(cookieName)?.value;
  if (!token) return null;

  let payload: JwtPayload;
  try {
    payload = jwt.verify(token, jwtSecret()) as JwtPayload;
  } catch {
    return null;
  }
  const user = await findUserForSession(payload.userId);
  if (user?.accountBlockedAt) return null;
  return user;
}

export async function getCurrentAdminSessionUser() {
  if (cookies().get(loggedOutCookieName)?.value === "1") return null;
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
  const { data, error } = await db()
    .from("User")
    .select(userSelect())
    .eq("id", userId)
    .maybeSingle();
  throwDbError(error);
  return data as SessionUser | null;
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

