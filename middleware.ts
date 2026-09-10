import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken, SESSION_COOKIE_NAME } from './lib/session';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Always allow the login page itself and its API route, plus Next.js internals.
  // /api/reports/auto-generate is also exempted - it's called by an external
  // cron service with no session, and authenticates itself via a shared
  // secret instead (see that route's isAuthorized check).
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/api/login') ||
    pathname.startsWith('/api/reports/auto-generate') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const valid = await verifySessionToken(token);

  if (!valid) {
    const loginUrl = new URL('/login', req.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
