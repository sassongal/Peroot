# Peroot - AI Prompt Engineering Platform

Peroot (פירות) is a Hebrew-first AI prompt enhancement platform that transforms raw user input into professional, structured prompts optimized for modern LLMs. It features four specialized engines, a 10-dimension scoring system, smart refinement with clarifying questions, and both personal and public prompt libraries.

**Live at:** [https://peroot.space](https://peroot.space)

---

## Table of Contents

- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Prompt Engines](#prompt-engines)
- [AI Gateway](#ai-gateway)
- [API Routes](#api-routes)
- [Database Schema](#database-schema)
- [Testing](#testing)
- [Scripts](#scripts)
- [Deployment](#deployment)

---

## Key Features

- **4 Specialized Engines** - Standard, Deep Research, Image Generation, and Agent Builder
- **10-Dimension Scoring** - Real-time prompt quality scoring across length, role, task, context, specificity, format, constraints, structure, channel, and examples
- **GENIUS_ANALYSIS Quality Gate** - Internal AI self-check ensuring completeness, specificity, structure, actionability, anti-patterns, and edge cases
- **Smart Refinement Loop** - Clarifying questions (GENIUS_QUESTIONS) that iteratively improve prompt quality
- **Personal Library** - Save, organize, tag, and pin prompts with folders and custom categories
- **Public Library** - 480+ curated prompts across 30 categories with variable templates
- **User Personality Profiling** - Adapts output style based on user history and style tokens
- **Gamification** - Achievements, leaderboards, and community profiles
- **Voice Input** - Record prompts via microphone
- **Subscription System** - Free tier with credit limits, paid plans via LemonSqueezy
- **Admin Dashboard** - Analytics, moderation, cost tracking, A/B experiments, SEO console, blog management
- **Internationalization** - Hebrew-first with i18n dictionary support
- **Maintenance Mode** - Redis-backed toggle with admin bypass

---

## Tech Stack

| Layer           | Technology                                              |
| --------------- | ------------------------------------------------------- |
| Framework       | Next.js 16.1 (App Router, Turbopack)                   |
| UI              | React 19, Tailwind CSS 4, Radix UI, Lucide icons       |
| Language        | TypeScript 5                                            |
| Database        | Supabase (PostgreSQL + Auth + Realtime)                 |
| AI SDK          | Vercel AI SDK 6 (`ai`, `@ai-sdk/google`, `@ai-sdk/groq`, `@ai-sdk/openai`) |
| AI Models       | Gemini 2.5 Flash (primary), Gemini 2.0 Flash Lite, Llama 3 70B (Groq), DeepSeek Chat |
| Caching         | Upstash Redis (rate limiting, maintenance mode)         |
| Payments        | LemonSqueezy                                            |
| Email           | Resend                                                  |
| Monitoring      | Sentry, PostHog, Google Analytics 4                     |
| Testing         | Vitest, Testing Library, Playwright (E2E)               |
| Linting         | ESLint, Prettier, Husky + lint-staged                   |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client (React 19)                        │
│                                                                 │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │ Capability  │  │ PromptInput  │  │ StreamingProgress      │ │
│  │ Selector    │  │ + VoiceInput │  │ + ScoreDisplay         │ │
│  │ (4 engines) │  │              │  │                        │ │
│  └──────┬──────┘  └──────┬───────┘  └────────────────────────┘ │
│         │                │                                      │
│  ┌──────┴────────────────┴──────────────────────────────────┐  │
│  │              Hooks Layer                                  │  │
│  │  usePromptWorkflow  useStreamingCompletion  useAuth      │  │
│  │  useLibrary  useFavorites  useHistory  useSubscription   │  │
│  └──────────────────────┬───────────────────────────────────┘  │
│                         │                                       │
│  ┌──────────────────────┴───────────────────────────────────┐  │
│  │              Context Providers                            │  │
│  │  I18nContext  LibraryContext  SettingsContext              │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────┬───────────────────────────────────┘
                              │ HTTP / Streaming
┌─────────────────────────────┴───────────────────────────────────┐
│                    Next.js API Routes                            │
│                                                                  │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────────────────┐ │
│  │/api/     │  │ Middleware    │  │ Admin Routes (/api/admin) │ │
│  │enhance   │  │ (Auth +      │  │ dashboard, stats, costs,  │ │
│  │          │  │  Maintenance) │  │ users, moderation, blog   │ │
│  └────┬─────┘  └──────────────┘  └───────────────────────────┘ │
│       │                                                          │
│  ┌────┴─────────────────────────────────────────────────────┐   │
│  │              Engine System                                │   │
│  │                                                           │   │
│  │  ┌────────────┐                                           │   │
│  │  │ BaseEngine │  10-dim scoring + GENIUS_ANALYSIS gate    │   │
│  │  └─────┬──────┘                                           │   │
│  │    ┌───┴───┬──────────┬──────────┐                        │   │
│  │    │       │          │          │                         │   │
│  │  Standard Research  Image    Agent                        │   │
│  │  Engine   Engine    Engine   Engine                       │   │
│  └──────────────────────┬───────────────────────────────────┘   │
│                         │                                        │
│  ┌──────────────────────┴───────────────────────────────────┐   │
│  │              AI Gateway                                   │   │
│  │  Fallback chain + Circuit Breaker + Concurrency Limiter   │   │
│  │                                                           │   │
│  │  Gemini 2.5 Flash -> Gemini 2.0 Lite -> Llama 3 -> DS   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Prompt Manager (Singleton)                               │   │
│  │  Cache (5min TTL) -> Supabase DB -> Hardcoded Fallbacks   │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴──────────┐
                    │   Supabase (PG)    │
                    │   Upstash Redis    │
                    │   LemonSqueezy     │
                    │   Resend           │
                    └────────────────────┘
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+
- A Supabase project
- API keys for at least one AI provider (Google Gemini recommended)

### Installation

```bash
git clone <repository-url>
cd web
npm install
```

### Environment Variables

Create a `.env.local` file in the project root with the following variables:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
SUPABASE_ACCESS_TOKEN=your-supabase-access-token

# AI Providers
GOOGLE_GENERATIVE_AI_API_KEY=your-google-ai-key
GROQ_API_KEY=your-groq-api-key
DEEPSEEK_API_KEY=your-deepseek-api-key

# Redis (Upstash HTTP)
REDIS_URL=https://your-redis.upstash.io
REDIS_TOKEN=your-upstash-redis-token

# Email (Resend)
RESEND_API_KEY=your-resend-api-key
RESEND_FROM_EMAIL=no-reply@yourdomain.com

# Sentry
SENTRY_DSN=https://your-sentry-dsn
NEXT_PUBLIC_SENTRY_DSN=https://your-sentry-dsn
SENTRY_AUTH_TOKEN=your-sentry-auth-token

# LemonSqueezy (Payments)
LEMONSQUEEZY_STORE_ID=your-store-id
NEXT_PUBLIC_LEMONSQUEEZY_VARIANT_ID=your-variant-id
LEMONSQUEEZY_API_KEY=your-lemonsqueezy-api-key
LEMONSQUEEZY_WEBHOOK_SECRET=your-webhook-secret

# Google Analytics 4
GA4_PROPERTY_ID=your-ga4-property-id
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
GOOGLE_APPLICATION_CREDENTIALS_JSON={"type":"service_account",...}

# Google Verification & Search Console
NEXT_PUBLIC_GOOGLE_VERIFICATION=your-verification-code
GOOGLE_SEARCH_CONSOLE_SITE_URL=https://yourdomain.com

# SEO & Site Identity
NEXT_PUBLIC_SITE_NAME=Peroot
NEXT_PUBLIC_BASE_URL=https://yourdomain.com

# Cron Jobs
CRON_SECRET=your-cron-secret
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The app defaults to Hebrew (`Content-Language: he`).

---

## Project Structure

```
src/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # Home page
│   ├── HomeClient.tsx            # Client-side home component
│   ├── layout.tsx                # Root layout with providers
│   ├── globals.css               # Global styles
│   ├── robots.ts                 # Dynamic robots.txt generation
│   ├── sitemap.ts                # Dynamic sitemap generation
│   ├── admin/                    # Admin dashboard (17 pages)
│   │   ├── analytics/            # Usage analytics
│   │   ├── blog/                 # Blog CMS
│   │   ├── costs/                # AI cost tracking
│   │   ├── engines/              # Prompt engine config
│   │   ├── experiments/          # A/B testing
│   │   ├── google-analytics/     # GA4 integration
│   │   ├── health/               # System health monitor
│   │   ├── library/              # Public library management
│   │   ├── moderation/           # Content moderation
│   │   ├── notifications/        # Push notifications
│   │   ├── revenue/              # Revenue dashboard
│   │   ├── seo-console/          # SEO management
│   │   └── users/                # User management
│   ├── api/                      # API routes (see API Routes section)
│   ├── auth/                     # Auth callback handlers
│   ├── blog/                     # Blog pages (SSG/ISR)
│   ├── guide/                    # User guide
│   ├── login/                    # Login page
│   ├── pricing/                  # Pricing page
│   ├── prompts/                  # Public prompt library pages
│   ├── settings/                 # User settings
│   ├── p/                        # Shared prompt viewer
│   └── examples/                 # Example prompts
│
├── components/
│   ├── ui/                       # Base UI components (Button, Card, Textarea, etc.)
│   ├── layout/                   # Header, Footer, GlobalContextWrapper
│   ├── providers/                # GoogleAnalytics, PostHog, ServiceWorker
│   ├── features/                 # Feature-specific components
│   │   ├── prompt-improver/      # Core prompt enhancement UI
│   │   ├── library/              # Library browsing components
│   │   ├── history/              # Prompt history viewer
│   │   ├── chains/               # Prompt chaining
│   │   ├── community/            # Community features
│   │   ├── gamification/         # Achievements, badges
│   │   ├── faq/                  # FAQ section
│   │   └── variables/            # Template variable editor
│   ├── views/                    # Full-page view components
│   ├── admin/                    # Admin-specific components
│   ├── auth/                     # Auth components
│   ├── blog/                     # Blog components
│   └── seo/                      # SEO meta components
│
├── context/
│   ├── I18nContext.tsx            # Internationalization provider
│   ├── LibraryContext.tsx         # Library state management
│   └── SettingsContext.tsx        # User settings state
│
├── hooks/
│   ├── usePromptWorkflow.ts      # Core prompt enhance/refine orchestration
│   ├── useStreamingCompletion.ts # AI streaming response handler
│   ├── useAuth.ts                # Authentication hook
│   ├── useLibrary.ts             # Public library operations
│   ├── useFavorites.ts           # Favorite prompts management
│   ├── useHistory.ts             # Prompt history
│   ├── useSubscription.ts        # Subscription status
│   ├── usePromptLimits.ts        # Usage tracking and limits
│   ├── useChains.ts              # Prompt chaining logic
│   ├── usePresets.ts             # Saved presets
│   ├── useVoiceRecorder.ts       # Voice-to-text input
│   ├── useDragAndDrop.ts         # Drag-and-drop reordering
│   └── useSiteSettings.ts        # Global site settings
│
├── lib/
│   ├── engines/                  # Prompt engine system
│   │   ├── types.ts              # EngineConfig, EngineInput, EngineOutput interfaces
│   │   ├── base-engine.ts        # BaseEngine (scoring + GENIUS_ANALYSIS)
│   │   ├── standard-engine.ts    # Standard text prompt engine
│   │   ├── research-engine.ts    # Deep research prompt engine
│   │   ├── image-engine.ts       # Image generation prompt engine
│   │   ├── agent-engine.ts       # AI agent/GPT builder engine
│   │   └── index.ts              # Engine factory with DB config + cache
│   ├── ai/                       # AI provider abstraction
│   │   ├── gateway.ts            # AIGateway with fallback chain
│   │   ├── models.ts             # Model registry and task routing
│   │   ├── circuit-breaker.ts    # Provider health tracking (CLOSED/OPEN/HALF_OPEN)
│   │   └── concurrency.ts        # Request queuing (10 concurrent, 50 queue max)
│   ├── prompts/                  # Prompt template management
│   │   ├── prompt-manager.ts     # Singleton: cache -> DB -> fallback
│   │   ├── prompt-cache.ts       # In-memory TTL cache
│   │   └── prompt-fallbacks.ts   # Hardcoded fallback prompts
│   ├── supabase/                 # Supabase client setup
│   │   ├── client.ts             # Browser client
│   │   └── server.ts             # Server client (SSR/API)
│   ├── intelligence/             # User behavior analytics
│   ├── jobs/                     # Background job processing
│   ├── emails/                   # Email templates (Resend)
│   ├── admin/                    # Admin utility functions
│   ├── i18n/                     # Translation utilities
│   ├── constants.ts              # Category options, quick actions, collections
│   ├── types.ts                  # Shared types (PersonalPrompt, LibraryPrompt, etc.)
│   ├── schema.ts                 # Zod validation schemas
│   ├── ratelimit.ts              # Upstash rate limiter
│   ├── lemonsqueezy.ts           # Payment integration
│   ├── logger.ts                 # Structured logging
│   ├── maintenance.ts            # Maintenance mode toggle
│   ├── analytics.ts              # Analytics helpers
│   ├── capability-mode.ts        # CapabilityMode enum and configs
│   └── env.ts                    # Environment variable validation
│
├── i18n/
│   └── dictionaries/             # Translation dictionaries
│
└── middleware.ts                  # Auth + maintenance mode enforcement
```

---

## Prompt Engines

### Engine Hierarchy

All engines extend `BaseEngine`, which provides:

- **10-Dimension Scoring** - Static `scorePrompt()` method evaluating prompt quality (0-100)
- **Template Interpolation** - `{{variable}}` replacement in system/user prompts
- **GENIUS_ANALYSIS Gate** - Appended to every system prompt to enforce quality
- **GENIUS_QUESTIONS** - Up to 3 clarifying questions for iterative refinement
- **User Personality Injection** - Style tokens and history-based adaptation
- **Refinement Generation** - Takes previous output + user answers to produce improved version

### The Four Engines

| Engine | Mode | Purpose | Output |
|--------|------|---------|--------|
| **StandardEngine** | `STANDARD` | General-purpose prompt enhancement for LLMs | Text |
| **ResearchEngine** | `DEEP_RESEARCH` | Intelligence-grade research prompts with MECE methodology, citations, confidence levels | Markdown |
| **ImageEngine** | `IMAGE_GENERATION` | Visual prompts for DALL-E 3, Midjourney, Stable Diffusion with 7-layer architecture (subject, style, composition, lighting, color, technical, negatives) | Text |
| **AgentEngine** | `AGENT_BUILDER` | System instructions for custom GPTs/agents with 8-section architecture (identity, mission, thinking, output, knowledge, boundaries, examples, welcome) | Markdown |

### Scoring System (10 Dimensions, 100 Points Total)

| Dimension     | Max Points | What It Measures |
|---------------|-----------|-----------------|
| Length        | 12        | Word count and detail level |
| Role          | 12        | Expert persona definition |
| Task          | 10        | Clear task verb + object |
| Context       | 12        | Audience, purpose, background |
| Specificity   | 10        | Numbers, examples, named entities |
| Format        | 10        | Output format, length, structure |
| Constraints   | 10        | Negative constraints, tone, language |
| Structure     | 8         | Line breaks, lists, delimiters |
| Channel       | 8         | Platform/medium specification |
| Examples      | 8         | Output examples provided |

Score levels: **Low** (0-39), **Medium** (40-69), **High** (70-100)

### Refinement Loop

1. User submits raw prompt
2. Engine generates enhanced prompt + GENIUS_QUESTIONS (up to 3 clarifying questions)
3. User answers questions and/or provides free-form feedback
4. `generateRefinement()` integrates answers into an improved prompt with new questions
5. Repeat until prompt is comprehensive (questions array returns empty)

### Engine Configuration

Engines use a layered configuration system:
1. **Database** (`prompt_engines` table) - Admin-editable via dashboard
2. **Hardcoded defaults** - Built into each engine class
3. **Global System Identity** - Shared identity prompt from `ai_prompts` table
4. **5-minute cache** - Reduces DB hits for engine configs

---

## AI Gateway

The `AIGateway` class manages model selection with three resilience layers:

### Fallback Chain
Models are tried in order based on task type:

| Task     | Model Priority |
|----------|---------------|
| enhance  | Gemini 2.5 Flash -> DeepSeek Chat -> Llama 3 70B |
| research | DeepSeek Chat -> Gemini 2.5 Flash |
| agent    | Gemini 2.5 Flash -> Llama 3 70B |
| image    | Gemini 2.5 Flash -> Gemini 2.0 Flash Lite |

### Circuit Breaker
Per-provider health tracking with three states:
- **CLOSED** (healthy) - Normal operation
- **OPEN** (failing) - Skip provider after 3 failures, auto-retry after 30s
- **HALF_OPEN** (testing) - Allow one test request, close on success or reopen on failure

### Concurrency Limiter
Per-serverless-instance throttling:
- 10 max concurrent AI calls
- 50 max queued requests
- 15s queue timeout
- Prevents thundering herd on `/api/enhance`

---

## API Routes

### Core

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/enhance` | Optional | Main prompt enhancement endpoint (streaming) |
| GET | `/api/health` | No | Health check |
| GET | `/api/me` | Yes | Current user profile |
| POST | `/api/contact` | No | Contact form submission |
| GET | `/api/og` | No | Dynamic OG image generation |

### Library

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/library/prompts` | No | Browse public library prompts |
| GET | `/api/library/categories` | No | List library categories |
| GET | `/api/library-popularity` | No | Prompt popularity scores |
| GET/POST | `/api/personal-library` | Yes | CRUD personal library |
| GET/POST | `/api/favorites` | Yes | Manage favorites |
| GET/POST | `/api/folders` | Yes | Manage prompt folders |
| GET/POST | `/api/history` | Yes | Prompt enhancement history |

### User

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/prompt-usage` | Yes | Usage stats and limits |
| GET | `/api/user/achievements` | Yes | User achievements |
| POST | `/api/user/achievements/award` | Yes | Award achievement |
| POST | `/api/user/onboarding/complete` | Yes | Mark onboarding done |
| DELETE | `/api/user/delete-account` | Yes | Account deletion |
| GET | `/api/subscription` | Yes | Subscription status |
| POST | `/api/checkout` | Yes | Create checkout session |
| POST | `/api/extension-token` | Yes | Chrome extension auth token |
| GET/POST | `/api/referral` | Yes | Referral tracking |
| POST | `/api/share` | Yes | Share prompt (generate link) |

### Community

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/community/leaderboard` | No | Community leaderboard |
| GET | `/api/community/profile/[id]` | No | Public user profile |

### Blog & SEO

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/blog` | No | Blog posts listing |
| POST | `/api/indexnow` | Cron | Submit URLs to IndexNow |
| POST | `/api/prompts/sync` | Admin | Sync prompt data |

### Webhooks

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/webhooks/lemonsqueezy` | Signature | Payment webhook handler |
| POST | `/api/jobs/process` | Cron | Background job processor |

### Admin (all require admin role)

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/admin/dashboard` | Dashboard overview stats |
| GET | `/api/admin/stats` | Detailed statistics |
| GET | `/api/admin/costs` | AI provider cost tracking |
| POST | `/api/admin/costs/manual` | Manual cost entry |
| GET | `/api/admin/users/[id]` | User details |
| GET | `/api/admin/revenue` | Revenue analytics |
| GET | `/api/admin/funnel` | Conversion funnel |
| GET | `/api/admin/health` | System health details |
| GET | `/api/admin/moderation` | Content moderation queue |
| GET | `/api/admin/audit` | Audit log |
| GET | `/api/admin/intelligence` | User behavior intelligence |
| GET | `/api/admin/realtime` | Realtime metrics |
| GET/POST | `/api/admin/blog` | Blog post CRUD |
| GET/POST | `/api/admin/experiments` | A/B experiments |
| POST | `/api/admin/email-campaigns` | Email campaign management |
| GET | `/api/admin/google-analytics` | GA4 data proxy |
| GET | `/api/admin/seo-console` | Search console data |
| POST | `/api/admin/library/batch` | Batch library operations |
| GET | `/api/admin/library/categories` | Category management |
| GET | `/api/admin/notifications` | Notification management |
| GET | `/api/admin/is-admin` | Admin role check |
| POST | `/api/admin/grant-admin` | Grant admin role |
| POST | `/api/admin/sync-users` | Sync user profiles |
| POST | `/api/admin/test-engine` | Test prompt engine |

---

## Database Schema

Key Supabase (PostgreSQL) tables:

### User & Auth

| Table | Purpose |
|-------|---------|
| `profiles` | User profiles (synced from Supabase Auth) |
| `user_roles` | Role-based access (admin, user) |
| `user_style_personality` | Style tokens, preferences, personality brief |
| `user_achievements` | Unlocked achievements per user |

### Prompts & Library

| Table | Purpose |
|-------|---------|
| `personal_library` | User's saved prompts with categories, tags, folders |
| `public_library_prompts` | Curated public prompt library (480+ prompts) |
| `ai_prompts` | System prompts used by engines (keyed, versioned) |
| `prompt_engines` | Engine configurations (system/user prompt templates per mode) |
| `shared_prompts` | Publicly shared prompt links |

### Usage & Analytics

| Table | Purpose |
|-------|---------|
| `activity_logs` | All user activity events |
| `usage_events` | Credit usage tracking |
| `subscriptions` | Subscription status and billing |
| `admin_cost_tracking` | AI provider cost records |

### Content & Social

| Table | Purpose |
|-------|---------|
| `blog_posts` | Blog articles (ISR/SSG) |
| `dynamic_translations` | Runtime translation strings |
| `achievements` | Achievement definitions |

---

## Testing

### Run Tests

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# With coverage
npm run test:coverage

# E2E tests (Playwright)
npm run test:e2e

# E2E with UI
npm run test:e2e:ui
```

### Test Suite

| Test File | Focus |
|-----------|-------|
| `src/__tests__/scoring.test.ts` | 10-dimension prompt scoring logic |
| `src/__tests__/engines.test.ts` | All 4 engine generation and refinement |
| `src/lib/ai/gateway.test.ts` | AI Gateway fallback and circuit breaker |
| `src/lib/__tests__/api-error.test.ts` | API error handling utilities |
| `src/lib/__tests__/env.test.ts` | Environment variable validation |
| `src/lib/__tests__/ratelimit.test.ts` | Rate limiting logic |
| `src/hooks/__tests__/useAuth.test.ts` | Authentication hook |
| `src/hooks/__tests__/usePromptWorkflow.test.ts` | Prompt workflow orchestration |
| `src/hooks/__tests__/useStreamingCompletion.test.ts` | Streaming AI response handling |

### Type Checking

```bash
npm run typecheck
```

---

## Scripts

### npm Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server (Turbopack) |
| `npm run build` | Production build |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm test` | Run Vitest test suite |
| `npm run test:watch` | Vitest in watch mode |
| `npm run test:coverage` | Test coverage report |
| `npm run test:e2e` | Playwright E2E tests |
| `npm run typecheck` | TypeScript type checking |
| `npm run format` | Format code with Prettier |
| `npm run format:check` | Check formatting |
| `npm run analyze` | Bundle size analysis |
| `npm run db:migrate` | Run all database migrations |
| `npm run bench:prompts` | Benchmark prompt generation |

### Utility Scripts (`scripts/`)

| Script | Purpose |
|--------|---------|
| `benchmark-prompts.mjs` | Performance benchmarking for prompt generation |
| `run-all-migrations.ts` | Execute all Supabase migrations in order |
| `generate-prompt-previews.py` | Generate preview images for library prompts |
| `list-models.js` | List available AI models and configs |
| `peroot-mcp.ts` | MCP (Model Context Protocol) server for Peroot |
| `fix_db_and_migrate.ts` | Database repair and migration utility |
| `fix_analytics_constraint.ts` | Fix analytics table constraints |

---

## Deployment

### Vercel

The project is deployed on Vercel with the following configuration:

1. **Framework Preset**: Next.js
2. **Build Command**: `next build`
3. **Output Directory**: `.next`
4. **Node.js Version**: 20.x

### Required Environment Variables

All variables listed in the [Getting Started](#environment-variables) section must be configured in Vercel's Environment Variables settings.

### Security Headers

The following security headers are automatically applied via `next.config.ts`:
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Strict-Transport-Security` (HSTS with preload)
- `Content-Security-Policy` (restricts scripts, styles, connections to known domains)
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` (camera disabled, microphone self-only)

### Database Migrations

Migrations are stored in `supabase/migrations/` and can be run with:

```bash
npm run db:migrate
```

### Monitoring

- **Sentry** - Error tracking and performance monitoring (source maps uploaded in production)
- **PostHog** - Product analytics and feature flags
- **Google Analytics 4** - Traffic and user behavior analytics

---

## License

Proprietary. All rights reserved.
