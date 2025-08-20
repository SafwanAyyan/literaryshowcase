import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import bcrypt from "bcryptjs"

import { prisma } from "@/lib/prisma"
import { getEnv } from "@/lib/env"

/**
 * Centralized NextAuth options to avoid exporting unsupported fields from route modules.
 * Route files should import { authOptions } from "@/lib/auth-config".
 */
const env = getEnv()

type WithRole = { role?: string }

export const authOptions: NextAuthOptions = {
  // Attach adapter only when a DB is configured to avoid build-time issues on env-misconfig
  adapter: env.DATABASE_URL ? PrismaAdapter(prisma) : undefined,
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        let user = await prisma.user.findUnique({
          where: { email: credentials.email },
        })

        // Bootstrap admin account if env vars are provided and no user exists
        if (!user && env.ADMIN_EMAIL && env.ADMIN_PASSWORD) {
          const matches = credentials.email === env.ADMIN_EMAIL && credentials.password === env.ADMIN_PASSWORD
          if (matches) {
            const hashed = await bcrypt.hash(env.ADMIN_PASSWORD, 10)
            user = await prisma.user.create({
              data: { email: env.ADMIN_EMAIL, password: hashed, role: "admin", name: "Admin" },
            })
          }
        }

        if (!user || !user.password) return null

        const ok = await bcrypt.compare(credentials.password, user.password)
        if (!ok) return null

        return {
          id: user.id,
          email: user.email ?? undefined,
          name: user.name ?? undefined,
          role: user.role,
        }
      },
    }),
  ],
  session: { strategy: "jwt" },
  secret: env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as WithRole
        if (u.role) {
          ;(token as any).role = u.role
        }
      }
      return token
    },
    async session({ session, token }) {
      if (session?.user) {
        const sub = typeof token.sub === "string" ? token.sub : ""
        const role = typeof (token as any).role === "string" ? (token as any).role : undefined
        session.user = { ...session.user, id: sub, role }
      }
      return session
    },
  },
  pages: {
    signIn: "/admin/login",
    error: "/admin/login",
  },
}