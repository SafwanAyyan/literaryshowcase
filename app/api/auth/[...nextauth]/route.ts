import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { NextAuthOptions } from 'next-auth'

export const runtime = 'nodejs'
export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        let user = await prisma.user.findUnique({
          where: { email: credentials.email }
        })

        // Bootstrap admin on first login attempt if env vars are set and user doesn't exist
        if (!user && process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
          const matchesAdminEnv = (
            credentials.email === process.env.ADMIN_EMAIL &&
            credentials.password === process.env.ADMIN_PASSWORD
          )
          if (matchesAdminEnv) {
            const hashed = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10)
            user = await prisma.user.create({
              data: { email: process.env.ADMIN_EMAIL, password: hashed, role: 'admin', name: 'Admin' }
            })
          }
        }

        if (!user || !user.password) {
          return null
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password)

        if (!isPasswordValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      }
    })
  ],
  session: {
    strategy: 'jwt'
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role
      }
      return token
    },
    async session({ session, token }) {
      if (token && session?.user) {
        ;(session.user as any).id = token.sub as string
        ;(session.user as any).role = (token as any).role
      }
      return session
    }
  },
  pages: {
    signIn: '/admin/login',
    error: '/admin/login'
  }
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }