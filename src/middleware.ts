import { NextResponse, type NextRequest } from "next/server";
import { normalizeRealEstatePurpose, purposeFromSlug, purposeSlug, realEstateTypeFromSlug, realEstateTypeOptions, realEstateTypeSlug } from "@/lib/real-estate-taxonomy";

const sessionCookieName = "acheix_token";
const adminSessionCookieName = "acheix_admin_token";
const loggedOutCookieName = "acheix_logged_out";

function isAdminHost(host: string | null, forwardedHost: string | null, nextHostname: string | null) {
  const normalized = (forwardedHost ?? host ?? nextHostname ?? "").split(":")[0].toLowerCase();
  return normalized === "admin.acheix.com.br" || normalized === "painel.acheix.com.br";
}

function isStaticPath(pathname: string) {
  return pathname.startsWith("/_next") || pathname.startsWith("/favicon") || pathname.startsWith("/manifest") || pathname.includes(".");
}

export function middleware(request: NextRequest) {
  const host = request.headers.get("host");
  const forwardedHost = request.headers.get("x-forwarded-host");
  const pathname = request.nextUrl.pathname;
  const adminHost = isAdminHost(host, forwardedHost, request.nextUrl.hostname);
  const adminPath = pathname === "/admin" || pathname.startsWith("/admin/");

  if (isStaticPath(pathname)) return NextResponse.next();

  if (pathname === "/imoveis") {
    const purpose = normalizeRealEstatePurpose(request.nextUrl.searchParams.get("purpose"));
    const type = request.nextUrl.searchParams.get("type") ?? "";
    if (purpose && realEstateTypeOptions(purpose).includes(type)) {
      const url = request.nextUrl.clone();
      url.pathname = `/imoveis/${purposeSlug(purpose)}/${realEstateTypeSlug(type)}`;
      url.searchParams.delete("purpose");
      url.searchParams.delete("type");
      url.searchParams.delete("searched");
      url.searchParams.delete("modo");
      url.searchParams.delete("category");
      return NextResponse.redirect(url, 308);
    }
  }

  const realEstatePath = pathname.match(/^\/imoveis\/([^/]+)\/([^/]+)\/?$/);
  if (realEstatePath) {
    const purpose = purposeFromSlug(realEstatePath[1]);
    const type = purpose ? realEstateTypeFromSlug(purpose, realEstatePath[2]) : null;
    if (purpose && type) {
      const url = request.nextUrl.clone();
      url.pathname = "/imoveis";
      url.searchParams.set("purpose", purpose);
      url.searchParams.set("type", type);
      url.searchParams.set("searched", "1");
      url.searchParams.set("modo", "buscar");
      return clearAuthCookiesWhenLoggedOut(NextResponse.rewrite(url), request);
    }
  }

  const requestHeaders = new Headers(request.headers);
  if (adminHost || adminPath) {
    requestHeaders.set("x-acheix-admin-shell", "1");
  }

  if (adminHost && pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    return clearAuthCookiesWhenLoggedOut(NextResponse.rewrite(url, { request: { headers: requestHeaders } }), request);
  }

  return clearAuthCookiesWhenLoggedOut(NextResponse.next({ request: { headers: requestHeaders } }), request);
}

function clearAuthCookiesWhenLoggedOut(response: NextResponse, request: NextRequest) {
  if (request.cookies.get(loggedOutCookieName)?.value !== "1") {
    return response;
  }

  response.cookies.set(sessionCookieName, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });
  response.cookies.set(adminSessionCookieName, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });

  return response;
}

export const config = {
  matcher: ["/", "/((?!api/|_next/|.*\\..*).*)"]
};
