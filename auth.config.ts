import type { NextAuthConfig } from 'next-auth';

/**
 * Edge-compatible auth config — NO Node.js-only imports (no argon2, no prisma).
 * Used by middleware.ts which runs on the Edge runtime.
 * auth.ts extends this with the full PrismaAdapter + CredentialsProvider.
 */
export const authConfig = {
  session: {
    strategy: 'jwt' as const,
    // NextAuth defaults to 30 days. This session grants access to order data,
    // saved addresses and — for an ADMIN — the ability to change order state
    // and prices. Thirty days on a shared or lost device is too generous for
    // that, so sessions last 7 days and refresh on activity, meaning an active
    // user is never logged out mid-task while an abandoned session expires
    // within the week.
    //
    // Note: role is baked into the JWT at sign-in, so revoking an admin's
    // rights does not take effect until their token expires. Shortening the
    // window bounds that gap; closing it entirely needs a database session
    // strategy or a revocation check, which is recorded in
    // ARCHITECTURAL_FINDINGS.md rather than changed here.
    maxAge: 7 * 24 * 60 * 60, // 7 days
    updateAge: 24 * 60 * 60, // refresh at most once a day
  },
  pages: {
    signIn: '/en/admin/login',
  },
  callbacks: {
    async jwt({ token, user }: { token: any; user?: any }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.whatsappPhone = user.whatsappPhone;
      }
      return token;
    },
    async session({ session, token }: { session: any; token: any }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.whatsappPhone = token.whatsappPhone;
      }
      return session;
    },
  },
  providers: [], // Providers are added in auth.ts — empty here for Edge compat
} satisfies NextAuthConfig;
