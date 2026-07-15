import NextAuth, { DefaultSession } from "next-auth"
import { JWT } from "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: string
      whatsappPhone?: string | null
    } & DefaultSession["user"]
  }

  interface User {
    role: string
    whatsappPhone?: string | null
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: string
    whatsappPhone?: string | null
  }
}
