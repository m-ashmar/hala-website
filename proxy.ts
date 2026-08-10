import NextAuth from 'next-auth';
import createMiddleware from 'next-intl/middleware';
import { authConfig } from './auth.config';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// Edge-safe auth — uses authConfig only (no argon2, no prisma)
const { auth } = NextAuth(authConfig);

const intlMiddleware = createMiddleware({
  locales: ['en', 'ar'],
  defaultLocale: 'en',
});

export default auth(async (req: NextRequest & { auth: any }) => {
  const { pathname } = req.nextUrl;

  // Protect /[locale]/admin routes — require ADMIN role
  // Allow /admin/login through without auth check (prevents infinite redirect)
  const isAdminRoute = /^\/(en|ar)\/admin(\/|$)/.test(pathname);
  const isLoginPage = /^\/(en|ar)\/admin\/login/.test(pathname);

  if (isAdminRoute && !isLoginPage) {
    const session = req.auth;

    if (!session) {
      const loginUrl = new URL(`/en/admin/login`, req.url);
      loginUrl.searchParams.set('callbackUrl', req.url);
      return NextResponse.redirect(loginUrl);
    }

    if (session.user?.role !== 'ADMIN') {
      return NextResponse.redirect(new URL(`/`, req.url));
    }
  }

  // Protect customer routes: /[locale]/account and /[locale]/checkout
  const isCustomerRoute = /^\/(en|ar)\/(account|checkout)(\/|$)/.test(pathname);
  if (isCustomerRoute) {
    const session = req.auth;
    if (!session) {
      const localeMatch = pathname.match(/^\/(en|ar)/);
      const locale = localeMatch ? localeMatch[1] : 'en';
      const loginUrl = new URL(`/${locale}/login`, req.url);
      loginUrl.searchParams.set('callbackUrl', req.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Run i18n middleware for all other routes
  return intlMiddleware(req);
});

export const config = {
  matcher: ['/', '/(ar|en)/:path*'],
};
