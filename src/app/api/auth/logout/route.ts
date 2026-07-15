import { NextResponse } from "next/server";
import { adminCookieName, cookieName, loggedOutCookieName } from "@/lib/auth";

export async function POST(request: Request) {
  const response = NextResponse.json({ ok: true, loggedOut: true });
  const domains = cookieDomainsFor(request);

  expireCookie(response, cookieName);
  expireCookie(response, adminCookieName);
  for (const domain of domains) {
    expireCookie(response, cookieName, domain);
    expireCookie(response, adminCookieName, domain);
  }

  response.cookies.set(loggedOutCookieName, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365
  });

  return response;
}

function expireCookie(response: NextResponse, name: string, domain?: string) {
  response.cookies.set(name, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
    ...(domain ? { domain } : {})
  });
}

function cookieDomainsFor(request: Request) {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "";
  const hostname = host.split(":")[0].toLowerCase();
  if (hostname === "acheix.com.br" || hostname.endsWith(".acheix.com.br")) {
    return ["acheix.com.br", ".acheix.com.br"];
  }
  return [];
}
