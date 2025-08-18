import { z } from "zod"

/**
 * Centralized environment validation for stable boots and deterministic builds.
 * - Fails fast in production if critical vars are missing
 * - Provides safe defaults in development only (with console warnings)
 */

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  // NextAuth
  NEXTAUTH_URL: z.string().url().optional(),
  NEXTAUTH_SECRET: z.string().min(16).optional(),

  // Database
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required").optional(),
  DIRECT_URL: z.string().optional(),

  // Optional admin bootstrap for CredentialsProvider
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD: z.string().min(6).optional(),
})

type Env = z.infer<typeof EnvSchema>

let cached: Env | null = null

export function getEnv(): Env {
  if (cached) return cached
  const parsed = EnvSchema.safeParse({
    NODE_ENV: process.env.NODE_ENV,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    DATABASE_URL: process.env.DATABASE_URL,
    DIRECT_URL: process.env.DIRECT_URL,
    ADMIN_EMAIL: process.env.ADMIN_EMAIL,
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
  })

  if (!parsed.success) {
    // In production, fail hard. In dev, warn and continue.
    const msg = "[env] Invalid environment configuration:\n" + parsed.error.errors.map(e => `- ${e.path.join(".")}: ${e.message}`).join("\n")
    if (process.env.NODE_ENV === "production") {
      throw new Error(msg)
    } else {
      console.warn(msg)
    }
  }

  const env: Env = parsed.success ? parsed.data : ({} as any)

  // Development defaults and guard rails
  if (env.NODE_ENV !== "production") {
    if (!env.NEXTAUTH_SECRET) {
      // ephemeral dev secret for stability; never used in production
      env.NEXTAUTH_SECRET = "dev-secret-" + (process.env.USER || "user")
      console.warn("[env] NEXTAUTH_SECRET missing. Using ephemeral dev secret. Set NEXTAUTH_SECRET for production.")
    }
    if (!env.NEXTAUTH_URL) {
      env.NEXTAUTH_URL = "http://localhost:3000"
      console.warn("[env] NEXTAUTH_URL missing. Defaulting to http://localhost:3000 for development.")
    }
  } else {
    if (!env.NEXTAUTH_SECRET) {
      throw new Error("[env] NEXTAUTH_SECRET is required in production.")
    }
    if (!env.NEXTAUTH_URL) {
      console.warn("[env] NEXTAUTH_URL is not set. Some callbacks may compute absolute URLs incorrectly.")
    }
  }

  cached = env
  return env
}

/**
 * Helper to assert that we are running on the Node.js runtime. NextAuth+Prisma
 * are not Edge compatible; importing into an Edge route can lead to chunk/runtime issues.
 */
export function assertNodeRuntime(route: string) {
  const runtime = (process as any).release?.name || "node"
  if (!runtime.toLowerCase().includes("node")) {
    throw new Error(`[env] Route ${route} requires Node.js runtime. Current runtime: ${runtime}`)
  }
}