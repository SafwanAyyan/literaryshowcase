/**
 * Next.js config hardened for deterministic, case-safe builds on Windows and Linux.
 * - experimental.caseSensitiveRoutes helps catch path-casing mistakes that lead to chunk ID mismatches
 * - swcMinify + reactStrictMode ensure stable output
 * - typescript.ignoreBuildErrors is false to fail fast on import/type regressions that can break runtime chunking
 */
 
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    // Catch casing mismatches early (Windows-insensitive FS can hide these)
    caseSensitiveRoutes: true,
  },
  typescript: {
    // Fail builds when type errors could create inconsistent module graphs
    ignoreBuildErrors: false,
  },
  eslint: {
    // Keep builds unblocked by lint errors in CI; prefer separate lint step
    ignoreDuringBuilds: true,
  },
  webpack: (config, { isServer }) => {
    // Keep symlink resolution predictable across platforms
    config.resolve.symlinks = true
    return config
  },
}

module.exports = nextConfig