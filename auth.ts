import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import prisma from "./lib/prisma";
import CredentialsProvider from "next-auth/providers/credentials";
import argon2 from "argon2";
import { authConfig } from "./auth.config";
import { createRateLimiter } from "./lib/rate-limit";

/**
 * 5 OTP verification attempts per phone number per 10 minutes — roughly the
 * lifetime of a code. Enough for a genuine mistyping, far too few to brute
 * force a 6-digit secret.
 */
const otpVerifyLimiter = createRateLimiter({ limit: 5, windowMs: 10 * 60_000 });

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user || !user.passwordHash) {
          return null;
        }

        const isPasswordValid = await argon2.verify(
          user.passwordHash,
          credentials.password as string
        );

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
    CredentialsProvider({
      id: "whatsapp",
      name: "WhatsApp OTP",
      credentials: {
        phone: { label: "Phone", type: "text" },
        code: { label: "Code", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.phone || !credentials?.code) {
          return null;
        }

        const phone = credentials.phone as string;
        const code = credentials.code as string;

        // Rate-limit verification attempts.
        //
        // Sending an OTP was limited, but checking one was not — leaving a
        // 6-digit code (1,000,000 combinations) open to brute force. The
        // limiter is keyed by phone number rather than IP, because the phone
        // is what an attacker is trying to take over and it cannot be
        // rotated as cheaply as a source address.
        const limited = await otpVerifyLimiter.check(`otp_verify_${phone}`);
        if (limited) {
          return null;
        }

        // Verify the code
        const verification = await prisma.phoneVerification.findFirst({
          where: {
            phone,
            code,
            used: false,
            expiresAt: { gt: new Date() },
          },
          orderBy: { createdAt: 'desc' },
        });

        if (!verification) {
          return null; // Invalid or expired OTP
        }

        // Mark as used
        await prisma.phoneVerification.update({
          where: { id: verification.id },
          data: { used: true },
        });

        // Find or create user
        let user = await prisma.user.findUnique({
          where: { whatsappPhone: phone },
        });

        if (!user) {
          user = await prisma.user.create({
            data: {
              whatsappPhone: phone,
              whatsappVerified: true,
              role: 'CUSTOMER',
            },
          });
        } else if (!user.whatsappVerified) {
          user = await prisma.user.update({
            where: { id: user.id },
            data: { whatsappVerified: true },
          });
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          whatsappPhone: user.whatsappPhone,
        };
      },
    }),
  ],
});
