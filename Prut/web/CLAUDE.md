# Peroot (Prut) — AI Prompt Management Platform

## Stack
Next.js 16 (App Router) | React 19 | TypeScript 5 | Tailwind CSS 4 | Supabase (Auth + PostgreSQL) | Vercel AI SDK | Upstash Redis | LemonSqueezy | Sentry | PostHog

## Commands
```bash
npm run dev          # Dev server (Turbopack)
npm run build        # Production build
npm run test         # Vitest unit tests
npm run test:e2e     # Playwright e2e tests
npm run typecheck    # TypeScript check
npm run lint         # ESLint
npm run format       # Prettier
```

## Architecture

### Directory Layout
```
src/
├── app/                    # App Router: pages + API routes
│   ├── admin/              # Admin dashboard (role-protected)
│   ├── api/                # API routes (REST)
│   ├── auth/               # Auth pages
│   ├── blog/               # Blog section
│   ├── guides/             # User guides
│   ├── prompts/            # Prompt library (public)
│   └── p/[id]/             # Shared prompt view
├── components/
│   ├── admin/              # Admin UI (tabs, dashboards)
│   ├── features/           # Domain components (library, prompt-improver, chains)
│   ├── ui/                 # Design system (shadcn-based)
│   ├── layout/             # Header, footer, sidebar
│   └── providers/          # Context providers
├── hooks/                  # Custom hooks (useLibrary, usePromptWorkflow, useHistory)
├── context/                # React contexts (Library, Settings, Favorites, I18n)
├── lib/
│   ├── ai/                 # AI gateway, circuit breaker, model routing
│   ├── engines/            # Prompt generation engines (5 types)
│   ├── services/           # Credit service, business logic
│   ├── content-factory/    # Auto-generated blog/prompt content
│   ├── supabase/           # DB clients (server.ts, service.ts)
│   └── ...                 # Utilities, types, schemas
├── i18n/                   # Hebrew/English translations
└── middleware.ts           # Auth, CSRF, maintenance mode
```

### AI Engine System (`src/lib/engines/`)
Five engines extending `BaseEngine`:
- **StandardEngine**: Text prompt refinement (primary flow)
- **ImageEngine**: DALL-E/Midjourney prompt generation
- **VideoEngine**: Runway/Synthesia prompts
- **ResearchEngine**: Web search with citations
- **AgentEngine**: Custom GPT system prompts

Each engine receives `EngineInput` (prompt, tone, category, mode, context, targetModel) and produces structured, scored output.

### AI Gateway (`src/lib/ai/gateway.ts`)
- `AIGateway.generateStream()` / `AIGateway.generateFull()` 
- **Fallback chain**: gemini-2.5-flash → mistral-small → groq/llama → deepseek
- **Circuit breaker** (`circuit-breaker.ts`): Auto-skips failing providers
- **Concurrency limiter** (`concurrency.ts`): Prevents overload, 5-min timeout
- **Task-based routing**: Different model priority per task type (enhance, research, image, chain)

### Credit System (`src/lib/services/credit-service.ts`)
- Atomic RPC: `refresh_and_decrement_credits` (handles daily reset + spend atomically)
- Free: 2 credits/day (reset 14:00 Israel time) | Pro: 150/month
- Credit refund on API errors
- Immutable audit ledger (`credit_ledger` table)

### Capability Modes (`src/lib/capability-mode.ts`)
`STANDARD` | `DEEP_RESEARCH` | `IMAGE_GENERATION` | `AGENT_BUILDER` | `VIDEO_GENERATION`

## Key API Routes

| Route | Method | Auth | Purpose |
|-------|--------|------|---------|
| `/api/enhance` | POST | Yes | Main prompt refinement (streaming) |
| `/api/chain/generate` | POST | Yes | Multi-step prompt chains |
| `/api/context/extract-file` | POST | Yes | Parse PDF/DOCX/CSV/XLSX |
| `/api/context/extract-url` | POST | Yes | Scrape & summarize URL |
| `/api/context/describe-image` | POST | Yes | Vision API |
| `/api/library/*` | GET/POST | Yes | Library CRUD, search, categories |
| `/api/personal-library/*` | GET/POST | Yes | Folders, saves |
| `/api/me` | GET | Yes | Current user profile |
| `/api/subscription` | GET | Yes | Subscription status |
| `/api/checkout` | POST | Yes | LemonSqueezy checkout |
| `/api/webhooks/lemonsqueezy` | POST | No | Payment webhooks |
| `/api/admin/*` | * | Admin | Admin operations |
| `/api/cron/*` | GET | Cron | Scheduled tasks |

## Database (Supabase PostgreSQL)

**Core tables**: `profiles`, `prompts`, `prompt_categories`, `shared_prompts`, `blog_posts`, `credit_ledger`, `email_logs`, `webhook_events`, `user_achievements`, `ai_prompts`, `folders`

- RLS enforces user data isolation
- Migrations in `supabase/migrations/`
- Two clients: `createClient()` (user-scoped SSR) and `createServiceClient()` (admin)

## State Management
- **React Context**: LibraryContext, SettingsContext, FavoritesContext, I18nContext
- **React Query**: Server state (useLibrary, useHistory, useFavorites, usePromptWorkflow)
- **Local state**: Ephemeral UI state

## Conventions
- Imports use `@/*` alias → `./src/`
- Hebrew-first design (all system prompts in Hebrew)
- API errors: `NextResponse.json({ error: "message" }, { status: code })`
- Rate limiting: Upstash Redis sliding window
- Auth: Supabase SSR with middleware enforcement
- CSRF: Origin validation (exempts webhooks + Bearer auth)

## Environment Variables
**Required**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
**AI**: `GOOGLE_GENERATIVE_AI_API_KEY`, `GROQ_API_KEY`, `DEEPSEEK_API_KEY`, `MISTRAL_API_KEY`
**Services**: `REDIS_URL`, `RESEND_API_KEY`, `LEMONSQUEEZY_API_KEY`, `SENTRY_DSN`, `CRON_SECRET`

## Deploy
- Vercel with cron jobs (daily emails, weekly content factory, subscription sync, data retention)
- Security headers in `next.config.ts`
- Sentry source maps on production builds only

## Codebase Context
Run `npx repomix --compress` to regenerate `repomix-output.xml` — a compressed, AI-friendly snapshot of the entire codebase (~160K tokens). Useful for feeding into external AI tools.
