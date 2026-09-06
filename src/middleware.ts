import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, SESSION_COOKIE_NAME } from "@/lib/session";

/**
 * Protege todas las rutas /backoffice/** excepto /backoffice/login.
 * Importa solo desde src/lib/session.ts (Web Crypto, sin node:crypto)
 * para ser compatible con el Edge Runtime en el que corre el middleware.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isLoginPage = pathname === "/backoffice/login";
  const isBackofficeRoute = pathname.startsWith("/backoffice");

  if (!isBackofficeRoute || isLoginPage) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = await verifySessionToken(token);

  if (!session) {
    const loginUrl = new URL("/backoffice/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/backoffice/:path*"],
};
