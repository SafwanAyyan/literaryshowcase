import NextAuth from 'next-auth'
import { assertNodeRuntime } from '@/lib/env'
import { authOptions } from '@/lib/auth-config'
 
// Ensure Node.js runtime (NextAuth + Prisma are not Edge-compatible)
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
assertNodeRuntime('app/api/auth/[...nextauth]')
 
const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }