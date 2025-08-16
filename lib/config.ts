// Configuration for Literary Showcase Admin Panel
// Copy the .env.example to .env.local and fill in your actual values

export const config = {
  // OpenAI Configuration
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: 'gpt-4o', // Using GPT-4o (latest model)
    fallbackModel: 'gpt-3.5-turbo',
    maxTokens: 2000,
    temperature: 0.8,
  },

  // Gemini Configuration
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
    model: 'gemini-2.5-pro', // Latest Gemini 2.5 Pro model
    fallbackModel: 'gemini-2.0-flash-exp',
    maxTokens: 2000,
    temperature: 0.8,
  },

  // DeepSeek Configuration
  deepseek: {
    apiKey: process.env.DEEPSEEK_API_KEY || '',
    model: 'deepseek-chat-v3', // Latest DeepSeek V3 model
    fallbackModel: 'deepseek-chat-v3-0324',
    maxTokens: 2000,
    temperature: 0.8,
  },

  // Database Configuration
  database: {
    // Prefer remote Postgres. Fall back to Accelerate if provided. No sqlite default.
    url: process.env.DATABASE_URL || process.env.PRISMA_DATABASE_URL || '',
  },

  // Authentication Configuration
  auth: {
    nextAuthUrl: process.env.NEXTAUTH_URL || 'http://localhost:3000',
    nextAuthSecret: process.env.NEXTAUTH_SECRET || 'your-secret-here-change-in-production',
  },

  // Admin Configuration
  admin: {
    email: process.env.ADMIN_EMAIL || 'admin@literaryshowcase.com',
    defaultPassword: 'admin123', // Change this in production
  },

  // App Configuration
  app: {
    name: 'Literary Showcase',
    description: 'A curated collection of literary wisdom',
    version: '2.0.0',
  },

  // Feature Flags
  features: {
    aiGeneration: true,
    bulkImport: true,
    analytics: true,
    backups: true,
  },

  // Rate Limiting (for production)
  rateLimit: {
    aiGenerationPerHour: 100,
    contentCreationPerHour: 500,
  },
}

// Environment validation
export function validateConfig() {
  const errors: string[] = []

  if (!config.openai.apiKey && process.env.NODE_ENV === 'production') {
    errors.push('OPENAI_API_KEY is required in production')
  }

  if (!config.auth.nextAuthSecret || config.auth.nextAuthSecret === 'your-secret-here-change-in-production') {
    if (process.env.NODE_ENV === 'production') {
      errors.push('NEXTAUTH_SECRET must be set to a secure value in production')
    }
  }

  if (errors.length > 0) {
    throw new Error(`Configuration errors:\n${errors.join('\n')}`)
  }

  return true
}

// Export individual config sections for easier imports
export const { openai, gemini, deepseek, database, auth, admin, app, features, rateLimit } = config