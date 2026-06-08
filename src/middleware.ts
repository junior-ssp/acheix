import { NextResponse, type NextRequest } from "next/server";

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

  const requestHeaders = new Headers(request.headers);
  if (adminHost || adminPath) {
    requestHeaders.set("x-acheix-admin-shell", "1");
  }

  if (adminHost && pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/", "/((?!api/|_next/|.*\\..*).*)"]
};
