import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/** Bloqueio rápido de rotas autenticadas; a verificação completa da sessão ocorre no servidor. */
export function middleware(request: NextRequest) {
  if (!getSessionCookie(request)) {
    const url = new URL("/entrar", request.url);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/painel/:path*"] };
