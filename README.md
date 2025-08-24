# 📚 Literary Showcase

> **A modern, production-ready literary platform built with Next.js, TypeScript, and AI integration**

Literary Showcase is a comprehensive web application that enables users to discover, contribute to, and analyze literary content. Built with Next.js App Router, Prisma ORM, and modern web technologies, it features AI-powered analysis, OCR capabilities, and a complete administrative suite.

![Next.js](https://img.shields.io/badge/Next.js-14.2.16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-blue?logo=postgresql)
![Vercel](https://img.shields.io/badge/Vercel-Ready-black?logo=vercel)

## 🌟 Overview

**Literary Showcase** is designed for authors, literary enthusiasts, administrators, and content contributors who want to:

- **Browse & Discover**: Rich browsing experience with advanced filtering, search, and sorting
- **AI-Powered Analysis**: Deep literary analysis using multiple AI providers (OpenAI, Gemini, DeepSeek)
- **Content Management**: Complete CRUD operations with bulk import/export capabilities
- **OCR Integration**: Extract text from images using OCR.space and Gemini Vision
- **Admin Dashboard**: Comprehensive management interface with analytics and monitoring
- **Submission System**: Community-driven content contribution with review workflow

## 🏗️ Architecture

### Technology Stack

**Frontend:**
- Next.js 14.2.16 with App Router
- React 18.x with TypeScript
- Tailwind CSS for styling
- Framer Motion for animations
- Radix UI components
- Recharts for data visualization

**Backend:**
- Next.js API Routes
- Prisma ORM 6.13.0
- PostgreSQL (recommended for production)
- NextAuth.js for authentication
- Bcrypt.js for password hashing

**AI & Services:**
- OpenAI API (GPT-4o)
- Google Gemini API (gemini-2.0-flash-thinking-exp-1219)
- DeepSeek API (deepseek-chat-v3)
- OCR.space API for text extraction

**Infrastructure:**
- Vercel deployment platform
- Node.js 18.x runtime
- Real User Monitoring (RUM)
- Multi-level caching system

### Key Architectural Patterns

1. **Layered Architecture**: Clear separation between presentation, business logic, and data access layers
2. **Service Layer Pattern**: Centralized business logic in `lib/` services
3. **Unified AI Service**: Single interface for multiple AI providers with intelligent fallback
4. **Middleware Pattern**: Request interception for metrics, maintenance mode, and authentication
5. **Caching Strategy**: Multi-level caching with in-memory and request deduplication

## ✨ Core Features

### 🔍 **Public Interface**
- **Advanced Search**: Debounced search with filters by category, author, content type
- **Smart Sorting**: Multiple sorting options (newest, oldest, popularity, author)
- **Responsive Design**: Mobile-first approach with elegant UI/UX
- **Content Discovery**: Random content suggestions and featured items
- **Engagement Features**: Like/view tracking with signed cookies

### 🧠 **AI-Powered Features**
- **Literary Analysis**: Deep analysis of themes, metaphors, and literary devices
- **Content Explanation**: Q&A system for understanding complex literary works
- **Content Generation**: AI-powered creation of quotes, poems, and reflections
- **Source Identification**: Intelligent source attribution and verification
- **Multi-Provider Support**: Automatic failover between AI providers

### 🖼️ **OCR Integration**
- **Image-to-Text**: Extract text from uploaded images
- **Multiple Providers**: OCR.space (primary) with Gemini Vision fallback
- **Rate Limiting**: Built-in request throttling and quota management
- **File Validation**: Comprehensive image format and size validation

### 🛠️ **Administrative Suite**
- **Content Management**: Full CRUD operations with bulk editing
- **Bulk Import/Export**: CSV and JSON data handling
- **Submission Workflow**: Review and approval system for user submissions
- **Analytics Dashboard**: Traffic metrics, performance monitoring, and usage statistics
- **System Configuration**: AI provider settings, prompt management, and feature toggles
- **Maintenance Mode**: Global maintenance with role-based bypass

### 📚 **Author Guides**
- **Shakespeare Section**: Interactive guides, audio content, and PDF resources
- **Dostoevsky Section**: Video content, themes analysis, and educational materials
- **Media Streaming**: Optimized delivery of large audio/video files

## 🚀 Quick Start

### Prerequisites

- **Node.js**: 18.x LTS or higher
- **npm**: 10+ or equivalent package manager
- **PostgreSQL**: Database (recommended for production)
- **Git**: Version control

### Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd literaryshowcase
   ```

2. **Install dependencies**:
   ```bash
   npm ci
   ```

3. **Environment setup**:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your configuration (see [Environment Configuration](#environment-configuration))

4. **Database setup**:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Start development server**:
   ```bash
   npm run dev
   ```

6. **Open your browser**: Navigate to `http://localhost:3000`

### Environment Configuration

Create a `.env` file in the project root with the following variables:

```bash
# Database Configuration (Required)
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DB?sslmode=require"
DIRECT_URL="postgresql://USER:PASSWORD@HOST:PORT/DB?sslmode=require"

# Authentication (Required)
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-strong-secret-here"

# Admin Bootstrap (Optional)
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="secure-password"

# AI Providers (Optional but recommended)
OPENAI_API_KEY="your-openai-api-key"
GEMINI_API_KEY="your-gemini-api-key"
DEEPSEEK_API_KEY="your-deepseek-api-key"

# OCR Services (Optional)
OCR_SPACE_API_KEY="your-ocr-space-api-key"
OCR_SPACE_ENDPOINT="https://api.ocr.space/parse/image"

# Environment
NODE_ENV="development"
```

## 📖 Usage Guide

### For End Users

1. **Browse Content**: Visit the homepage to explore literary works
2. **Search & Filter**: Use the search bar and filters to find specific content
3. **AI Analysis**: Click "Analyze" on any content for AI-powered insights
4. **Submit Content**: Use the submission form to contribute your own literary works
5. **Explore Guides**: Visit `/guides` for educational content about famous authors

### For Administrators

1. **Access Admin Panel**: Navigate to `/admin` and log in
2. **Manage Content**: Use the Content Manager to add, edit, or delete items
3. **Review Submissions**: Process user submissions in the Submissions panel
4. **Configure AI**: Set up AI providers and customize prompts
5. **Monitor Performance**: View analytics and system metrics
6. **Bulk Operations**: Import/export content using CSV or JSON

### API Usage

#### Public Endpoints

```bash
# Get all content with filters
GET /api/content/public?category=literary-masters&author=Shakespeare&page=1&limit=10

# Get random content
GET /api/content/public/random

# Get available authors
GET /api/content/public/authors

# Like content
POST /api/content/[id]/like

# Track view
POST /api/content/[id]/view
```

#### AI Endpoints

```bash
# Analyze literary content
POST /api/ai/analyze
Content-Type: application/json
{
  "text": "To be or not to be, that is the question",
  "author": "Shakespeare",
  "source": "Hamlet"
}

# Explain content
POST /api/ai/explain
Content-Type: application/json
{
  "text": "Literary text here",
  "question": "What does this metaphor mean?"
}

# Generate content (Admin only)
POST /api/ai/generate
Content-Type: application/json
{
  "category": "literary-masters",
  "type": "quote",
  "theme": "love",
  "tone": "romantic",
  "quantity": 3
}
```

## 🚀 Deployment

### Vercel Deployment (Recommended)

1. **Prepare your repository**:
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Import to Vercel**:
   - Visit [vercel.com](https://vercel.com)
   - Click "Import Project" and select your repository
   - Vercel will automatically detect Next.js configuration

3. **Configure environment variables**:
   In Vercel dashboard → Project Settings → Environment Variables:
   
   **Required:**
   - `DATABASE_URL`
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL`
   
   **Optional:**
   - `OPENAI_API_KEY`
   - `GEMINI_API_KEY`
   - `DEEPSEEK_API_KEY`
   - `OCR_SPACE_API_KEY`
   - `ADMIN_EMAIL`
   - `ADMIN_PASSWORD`

4. **Deploy**:
   - Vercel automatically runs `npm run vercel-build`
   - This executes database migrations and builds the application
   - First deployment may take 2-3 minutes

### Alternative Deployment Options

#### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npx prisma generate
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

#### Manual Server Deployment

```bash
# On your server
git clone <repository>
cd literaryshowcase
npm ci
npx prisma generate
npx prisma migrate deploy
npm run build
npm start
```

## 🗄️ Database

### Schema Overview

The application uses PostgreSQL with the following key models:

- **ContentItem**: Literary works (quotes, poems, reflections)
- **User**: Authentication and user management
- **Submission**: User-submitted content pending review
- **AdminSettings**: System configuration and AI provider settings
- **SystemPrompt**: Customizable AI prompts with versioning
- **DailyMetric**: Analytics and usage tracking
- **GenerationLog**: AI content generation history

### Database Commands

```bash
# Generate Prisma client
npx prisma generate

# Push schema to database (development)
npx prisma db push

# Create migration (production)
npx prisma migrate dev --name migration-name

# Deploy migrations (production)
npx prisma migrate deploy

# Open Prisma Studio
npx prisma studio

# Seed database
npm run db:seed

# Reset database
npm run db:reset
```

## 🔧 Configuration

### AI Provider Setup

1. **OpenAI**: Get API key from [OpenAI Platform](https://platform.openai.com)
2. **Google Gemini**: Get API key from [Google AI Studio](https://aistudio.google.com)
3. **DeepSeek**: Get API key from [DeepSeek Platform](https://platform.deepseek.com)

### OCR Provider Setup

1. **OCR.space**: Register at [OCR.space](https://ocr.space/ocrapi)
2. **Google Gemini Vision**: Uses same API key as Gemini text model

### Admin Configuration

Access `/admin` to configure:

- **AI Providers**: Enable/disable providers, set default models
- **System Prompts**: Customize AI behavior for different use cases
- **OCR Settings**: Configure timeout, quality, and language settings
- **Maintenance Mode**: Enable site-wide maintenance with admin bypass
- **Analytics**: Configure metrics collection and reporting

## 📊 Monitoring & Analytics

### Built-in Metrics

- **Page Views**: Tracked via middleware with hourly sampling
- **Unique Visits**: Daily visitor tracking with cookie-based deduplication
- **Content Engagement**: Likes, views, and interaction rates
- **AI Usage**: Request counts, response times, and error rates
- **System Performance**: API response times and database query metrics

### Real User Monitoring (RUM)

- Client-side performance tracking
- Core Web Vitals monitoring
- Error tracking and reporting
- User journey analytics

### Admin Dashboard

- Real-time system statistics
- Content management analytics
- User submission tracking
- Performance monitoring charts

## 🔒 Security Features

### Authentication & Authorization

- **NextAuth.js**: Secure session management
- **Role-based Access**: Admin/user role separation
- **Session Validation**: Automatic token refresh and validation

### Data Protection

- **Signed Cookies**: HMAC-signed engagement tracking
- **Input Validation**: Comprehensive data sanitization
- **Rate Limiting**: API endpoint protection
- **File Validation**: Secure image upload handling

### Security Headers

- CSRF protection
- XSS prevention
- Content Security Policy
- Secure cookie configuration

## 🛠️ Development

### Available Scripts

```bash
# Development
npm run dev              # Start development server
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint

# Database
npm run db:seed          # Seed database with sample data
npm run db:studio        # Open Prisma Studio
npm run db:migrate       # Create new migration
npm run db:reset         # Reset database

# Maintenance
npm run clean            # Clean build artifacts
npm run reinstall        # Fresh install
npm run doctor:build     # Diagnostic build
```

### Project Structure

```
literaryshowcase/
├── app/                 # Next.js App Router
│   ├── admin/          # Admin interface
│   ├── api/            # API routes
│   ├── authors/        # Author guide pages
│   ├── content/        # Content detail pages
│   └── guides/         # Educational content
├── components/         # React components
│   ├── admin/          # Admin-specific components
│   ├── ui/             # Reusable UI primitives
│   └── [features]/     # Feature-specific components
├── lib/                # Business logic & services
│   ├── *-service.ts    # Service layer modules
│   ├── config.ts       # Configuration management
│   └── utils.ts        # Utility functions
├── prisma/             # Database schema & migrations
├── public/             # Static assets
├── scripts/            # Build & deployment scripts
├── styles/             # Global styles
└── types/              # TypeScript definitions
```

### Code Style & Standards

- **TypeScript**: Strict mode enabled for type safety
- **ESLint**: Consistent code formatting
- **Prettier**: Automatic code formatting
- **Conventional Commits**: Structured commit messages

## 🐛 Troubleshooting

### Common Issues

#### Database Connection
```bash
# Check database connection
npx prisma db pull

# Reset connection
npx prisma generate
npx prisma db push
```

#### Build Errors
```bash
# Clear Next.js cache
npm run clean

# Reinstall dependencies
npm run reinstall

# Diagnostic build
npm run doctor:build
```

#### Vercel Deployment
- Ensure `DATABASE_URL` uses PostgreSQL (not SQLite)
- Check all required environment variables are set
- Verify Node.js runtime is properly configured

### Performance Optimization

- Enable caching for frequently accessed content
- Optimize images using Next.js Image component
- Use database indexing for search queries
- Implement proper pagination for large datasets

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Commit** your changes: `git commit -m 'Add amazing feature'`
4. **Push** to the branch: `git push origin feature/amazing-feature`
5. **Open** a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Write comprehensive tests for new features
- Update documentation for API changes
- Ensure responsive design compatibility
- Test across different browsers and devices

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Next.js Team**: For the excellent React framework
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
