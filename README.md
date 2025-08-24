# 📚 Literary Showcase

> **A production-ready literary platform that doesn't make you want to throw your laptop out the window**

[![Next.js](https://img.shields.io/badge/Next.js-14.2.16-black?logo=next.js&logoColor=white)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-336791?logo=postgresql&logoColor=white)](https://postgresql.org)
[![Vercel](https://img.shields.io/badge/Vercel-Deploy%20Ready-black?logo=vercel)](https://vercel.com)

Built for authors, literary enthusiasts, and anyone who thinks AI analyzing Shakespeare is pretty cool. This isn't another "hello world" project—it's a full-stack platform that handles real-world problems like content management, AI integration, and the inevitable "can we OCR this image?" requests.

## 🎯 What This Actually Solves

**The Problem**: Literary content is scattered, hard to analyze, and most platforms treat text like data rather than art.

**The Solution**: A modern platform that combines:
- **Smart Content Discovery** - Search that actually understands context
- **AI-Powered Analysis** - Because manual literary analysis takes forever
- **OCR Integration** - Turn those book photos into searchable text
- **Admin Suite** - Content management that doesn't require a CS degree
- **Community Features** - Let users contribute without breaking everything

### 🚀 Key Features (The Good Stuff)

| Feature | What It Does | Why You Care |
|---------|-------------|-------------|
| **AI Analysis** | Analyzes themes, metaphors, literary devices | Saves hours of manual analysis |
| **Multi-Provider AI** | OpenAI, Gemini, DeepSeek with smart fallbacks | No vendor lock-in, actually works |
| **OCR Pipeline** | OCR.space + Gemini Vision backup | Handles images users will definitely upload |
| **Advanced Search** | Debounced, filtered, cached | Fast even with thousands of entries |
| **Admin Dashboard** | Full CRUD + bulk operations | Manage content without SQL queries |
| **Real-time Analytics** | Pageviews, engagement metrics | Know what's actually being read |
| **Maintenance Mode** | Global toggle with admin bypass | Deploy without user panic |

## 🛠 Tech Stack (The Reliable Stuff)

```typescript
// Frontend: Modern React that doesn't fight you
Next.js 14.2.16        // App Router (yes, it's stable now)
TypeScript 5.0+        // Because any is the enemy
Tailwind CSS 3.4+      // Utility-first without the mess
Framer Motion          // Animations that don't lag
Radix UI               // Accessible by default

// Backend: Node.js but make it scalable
Prisma ORM 6.13.0      // Database queries that make sense
PostgreSQL             // Because SQLite breaks in production
NextAuth.js            // Auth that actually works

// AI/Services: The expensive stuff
OpenAI GPT-4o          // For explanations and analysis
Gemini 2.0 Flash       // Content generation and OCR fallback
DeepSeek Chat v3       // Backup when others fail
OCR.space API          // Primary OCR service
```

## 🚦 Quick Start (Skip the Pain)

### Prerequisites (Don't Skip These)

```bash
node --version   # Must be 18.x LTS (19+ might break things)
npm --version    # 10+ required
psql --version   # PostgreSQL for production (SQLite = deployment hell)
```

### Setup That Actually Works

```bash
# 1. Clone and install (the obvious part)
git clone <your-repo-url>
cd literaryshowcase
npm ci  # ci, not install - reproducible builds matter

# 2. Environment setup (the critical part)
cp .env.example .env
# Edit .env with real values - see "Environment Gotchas" below

# 3. Database setup (where things usually break)
npx prisma generate
npx prisma db push  # For dev; use migrate deploy for prod

# 4. Start development
npm run dev
# Visit http://localhost:3000
```

### 🔥 Environment Gotchas (Learn From My Mistakes)

```bash
# DATABASE_URL - The make-or-break variable
DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require"
# ⚠️ MUST be PostgreSQL for Vercel deployment
# ⚠️ sslmode=require prevents connection issues

# AUTH - Required for signed cookies and sessions
NEXTAUTH_SECRET="your-super-secret-key-here"  # Generate with: openssl rand -base64 32
NEXTAUTH_URL="http://localhost:3000"          # Update for production

# AI PROVIDERS - Optional but recommended
OPENAI_API_KEY="sk-..."      # For analysis/explanations
GEMINI_API_KEY="AI..."       # For generation/OCR backup
DEEPSEEK_API_KEY="sk-..."    # Fallback provider

# OCR - Optional but users will ask for it
OCR_SPACE_API_KEY="helloworld"  # Free tier: 25k requests/month
```

## 🏗 Architecture (How It All Fits)

### Design Decisions (Why We Did It This Way)

- **Service Layer Pattern**: All business logic in `lib/` - easy to test and swap
- **Unified AI Interface**: One service, multiple providers - vendor independence
- **Middleware-First**: Auth, analytics, maintenance handled at the edge
- **Cache Everything**: Multi-level caching because database calls are expensive
- **TypeScript Everywhere**: Runtime errors are production errors

## 🚀 Deployment (Production-Ready Steps)

### Vercel (Recommended - It Just Works)

```bash
# 1. Push to GitHub (obviously)
git add . && git commit -m "Ready for production" && git push

# 2. Import to Vercel
# - Connect GitHub repo
# - Vercel auto-detects Next.js

# 3. Environment Variables (Vercel Dashboard)
DATABASE_URL=postgresql://...     # Your production DB
NEXTAUTH_SECRET=...               # NEW secret for prod
NEXTAUTH_URL=https://yourdomain   # Your actual domain
# Add AI keys as needed

# 4. Deploy
# Vercel runs: npm run vercel-build
# This handles migrations automatically
```

### 🔧 Production Gotchas

| Issue | Solution | Why It Happens |
|-------|----------|----------------|
| **Prisma Provider Mismatch** | Use PostgreSQL everywhere | SQLite → PostgreSQL migration fails |
| **Runtime Edge Errors** | Check `export const runtime = 'nodejs'` | Prisma needs Node.js runtime |
| **Environment Variables Missing** | Double-check Vercel settings | Typos in variable names |
| **Build Timeouts** | Use `npm ci` instead of `npm install` | Dependency resolution is slow |

## 📡 API Reference (The Useful Endpoints)

### Public Endpoints
```typescript
// Content discovery
GET /api/content/public?category=literary-masters&author=Shakespeare&page=1

// Random content (great for "discover" features)
GET /api/content/public/random

// AI analysis (the money maker)
POST /api/ai/analyze
{
  "text": "To be or not to be...",
  "author": "Shakespeare",
  "source": "Hamlet"
}
```

### Admin Endpoints (Authenticated)
```typescript
// Content generation
POST /api/ai/generate
{
  "category": "literary-masters",
  "type": "quote",
  "theme": "love",
  "quantity": 5
}

// OCR processing
POST /api/ai/image-to-text
// FormData with image file
```

## 🔍 Development Tips (Hard-Learned Lessons)

### Performance Optimization
```typescript
// Use the cache service - it's your friend
import { CacheService } from '@/lib/cache-service'

const result = await CacheService.getOrSet('expensive-operation', async () => {
  return await expensiveFunction()
}, CacheService.TTL.CONTENT)
```

### AI Provider Best Practices
```typescript
// Always handle provider failures
try {
  const result = await UnifiedAIService.analyze(text)
} catch (error) {
  // Fallback to cached results or graceful degradation
  console.error('AI analysis failed:', error)
}
```

## 🐛 Troubleshooting (When Things Break)

### Common Issues

**"Prisma Client Not Generated"**
```bash
npx prisma generate
# Add to package.json postinstall if not there
```

**"Database Connection Failed"**
```bash
# Check connection string format
psql $DATABASE_URL  # Should connect
# Verify SSL requirements
```

**"AI Requests Failing"**
```bash
# Test API keys
curl -H "Authorization: Bearer $OPENAI_API_KEY" https://api.openai.com/v1/models
```

**"Build Fails on Vercel"**
- Check Node.js version (must be 18.x)
- Verify all environment variables
- Try local build: `npm run build`

## 🤝 Contributing (Make It Better)

This project follows "real-world" contribution guidelines:

1. **Fork & Feature Branch**
   ```bash
   git checkout -b feature/your-awesome-idea
   ```

2. **Code Standards**
   - TypeScript strict mode (no `any` allowed)
   - Prettier for formatting
   - Test new features

3. **Before PR**
   ```bash
   npm run lint
   npm run build
   npm run test  # When tests exist
   ```

### Areas That Need Love
- [ ] Unit tests (using Jest/React Testing Library)
- [ ] E2E tests (Playwright integration)
- [ ] Performance monitoring dashboard
- [ ] Mobile app companion
- [ ] Elasticsearch integration for better search

## 📞 Support & Community

**Found a bug?** [GitHub Issues](issues) - Include error logs and environment info

**Have questions?** 
- 💬 Discussions tab for general questions
- 📧 Email for security issues
- 🐦 Twitter for quick updates

**Want to contribute?** Read the contribution guide and jump in!

---

**Built with ❤️ and lots of coffee** ☕

*P.S. - If you use this in production and it saves you time, consider starring the repo. It helps more than you think.*js Team**: For the excellent React framework
- **Vercel**: For seamless deployment platform
- **Prisma**: For the modern database toolkit
- **OpenAI, Google, DeepSeek**: For AI provider APIs
- **Radix UI**: For accessible component primitives
- **Tailwind CSS**: For utility-first styling

## 📞 Support

For support, questions, or feature requests:

- 📧 **Email**: [Contact Information]
- 💬 **Discord**: [Community Link]
- 📝 **Issues**: [GitHub Issues](issues)
- 📖 **Documentation**: [Project Wiki](wiki)

---

**Built with ❤️ for the literary community**
