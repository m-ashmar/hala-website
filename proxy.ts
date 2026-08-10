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

  // Locale of the request, so a redirect doesn't dump an Arabic visitor on an
  // English page.
  const locale = pathname.match(/^\/(en|ar)/)?.[1] ?? 'en';

  // The path the user was trying to reach, preserved across login.
  //
  // A PATH, not req.url: the login page constrains callbackUrl to a same-site
  // path (it was previously an open redirect), so passing a full absolute URL
  // here would be rejected and silently drop the user on the home page after
  // signing in.
  const returnTo = `${pathname}${req.nextUrl.search}`;

  if (isAdminRoute && !isLoginPage) {
    const session = req.auth;

    if (!session) {
      const loginUrl = new URL(`/${locale}/admin/login`, req.url);
      loginUrl.searchParams.set('callbackUrl', returnTo);
      return NextResponse.redirect(loginUrl);
    }

    if (session.user?.role !== 'ADMIN') {
      return NextResponse.redirect(new URL(`/${locale}`, req.url));
    }
  }

  // Protect customer routes: /[locale]/account and /[locale]/checkout
  const isCustomerRoute = /^\/(en|ar)\/(account|checkout)(\/|$)/.test(pathname);
  if (isCustomerRoute) {
    const session = req.auth;
    if (!session) {
      const loginUrl = new URL(`/${locale}/login`, req.url);
      loginUrl.searchParams.set('callbackUrl', returnTo);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Run i18n middleware for all other routes
  return intlMiddleware(req);
});

export const config = {
  matcher: ['/', '/(ar|en)/:path*'],
};
