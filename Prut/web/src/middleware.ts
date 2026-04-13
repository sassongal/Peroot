import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import * as Sentry from "@sentry/nextjs"
import { isMaintenanceMode } from '@/lib/maintenance'

// In-memory maintenance mode cache (avoids Redis call on every request)
let maintenanceCache: { value: boolean; expires: number } | null = null;
const MAINTENANCE_CACHE_TTL = 60_000; // 60 seconds

async function getCachedMaintenanceMode(): Promise<boolean> {
  const now = Date.now();
  if (maintenanceCache && now < maintenanceCache.expires) {
    return maintenanceCache.value;
  }
  const result = await isMaintenanceMode();
  maintenanceCache = { value: result, expires: now + MAINTENANCE_CACHE_TTL };
  return result;
}

// Routes that require getUser() in middleware for auth/admin checks.
// All other routes skip the Supabase round-trip entirely to save CPU.
const AUTH_REQUIRED_PREFIXES = [
  '/admin',
  '/api/admin',
  '/api/enhance',
  '/api/subscription',
  '/api/checkout',
  '/api/prompts/sync',
  '/api/me',
  '/api/user',
  '/api/favorites',
  '/api/history',
  '/api/achievements',
  '/api/folders',
  '/api/personal-library',
  '/api/chain',
  '/api/context',
  '/api/share',
  '/api/developer-keys',
  '/api/prompts/versions',
  '/api/extension-token',
  '/api/referral',
  '/api/prompt-usage',
  '/settings',
]

/** @internal exported for unit tests — do not import from app code */
export function needsAuth(pathname: string): boolean {
  return AUTH_REQUIRED_PREFIXES.some(prefix => pathname.startsWith(prefix))
}

// Routes exempt from CSRF origin checks (they use their own auth mechanisms)
const CSRF_EXEMPT_PREFIXES = [
  '/api/webhooks/',  // External service webhooks (HMAC-verified)
  '/api/cron/',      // Cron jobs (CRON_SECRET header auth)
  '/api/health',     // Public health check
]

/** @internal exported for unit tests — do not import from app code */
export function isStateChangingMethod(method: string): boolean {
  return !['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase())
}

/** @internal exported for unit tests — do not import from app code */
export function isCsrfExempt(pathname: string, request: NextRequest): boolean {
  // Exempt routes (webhooks use HMAC, cron uses CRON_SECRET, health is public)
  if (CSRF_EXEMPT_PREFIXES.some(prefix => pathname.startsWith(prefix))) {
    return true
  }
  // Bearer-authenticated requests (Chrome extension JWT or prk_ API keys)
  // Only exempt when there is no browser origin (programmatic API calls) or
  // the origin is a Chrome extension (chrome-extension:// can't be spoofed cross-origin).
  // Requests from http/https origins with a Bearer header are NOT exempt — a forged
  // "Authorization: Bearer invalid" header from evil.com must still fail CSRF.
  const authHeader = request.headers.get('authorization') || ''
  if (authHeader.startsWith('Bearer ')) {
    const origin = request.headers.get('origin') || ''
    if (!origin || origin.startsWith('chrome-extension://')) {
      return true
    }
  }
  return false
}

/** @internal exported for unit tests — do not import from app code */
export function validateCsrfOrigin(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl
  const method = request.method

  // Only check state-changing requests to API routes
  if (!isStateChangingMethod(method) || !pathname.startsWith('/api/')) {
    return null
  }

  // Skip exempt routes
  if (isCsrfExempt(pathname, request)) {
    return null
  }

  // Determine allowed origin
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin
  let allowedOrigin: string
  try {
    allowedOrigin = new URL(siteUrl).origin
  } catch {
    allowedOrigin = request.nextUrl.origin
  }

  // Extract request origin from Origin or Referer header
  const rawOrigin = request.headers.get('origin') ?? request.headers.get('referer') ?? ''
  let requestOrigin = ''
  try {
    if (rawOrigin.startsWith('http')) {
      requestOrigin = new URL(rawOrigin).origin
    }
  } catch {
    // Malformed URL - requestOrigin stays empty, will fail validation
  }

  // Allow both www and non-www variants of the same origin
  const normalizeOrigin = (o: string) => o.replace('://www.', '://')
  if (!requestOrigin || normalizeOrigin(requestOrigin) !== normalizeOrigin(allowedOrigin)) {
    return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 })
  }

  return null
}

export async function middleware(request: NextRequest) {
  // CSRF protection: validate origin for state-changing API requests
  const csrfResponse = validateCsrfOrigin(request)
  if (csrfResponse) {
    return csrfResponse
  }

  const { pathname } = request.nextUrl

  // --- Fast path for public routes: skip Supabase getUser() entirely ---
  // Check maintenance cache first (in-memory, ~0ms). Only proceed to auth
  // if maintenance is active (need admin check) or route requires auth.
  const isMaintenance = await getCachedMaintenanceMode();

  if (!isMaintenance && !needsAuth(pathname)) {
    // Public route, no maintenance — skip the expensive getUser() call.
    // Still handle referral cookies and maintenance page redirect.
    if (pathname === '/maintenance') {
      return NextResponse.redirect(new URL('/', request.url));
    }
    const response = NextResponse.next({ request })
    // Capture referral code from URL (?ref=CODE) into a cookie
    const refCode = request.nextUrl.searchParams.get('ref');
    const isValidRefCode = refCode && refCode.length <= 30 && /^[a-zA-Z0-9_-]+$/.test(refCode);
    if (isValidRefCode && !request.cookies.get('referral_code')) {
      response.cookies.set('referral_code', refCode, {
        path: '/',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        httpOnly: true,
        sameSite: 'lax',
      });
    }
    return response
  }

  // --- Auth path: create Supabase client and call getUser() ---
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Capture referral code from URL (?ref=CODE) into a cookie for redemption after signup
  // Uses rewrite (not redirect) to avoid an extra round-trip that hurts LCP/TTFB
  const refCode = request.nextUrl.searchParams.get('ref');
  const isValidRefCode = refCode && refCode.length <= 30 && /^[a-zA-Z0-9_-]+$/.test(refCode);
  if (isValidRefCode && !request.cookies.get('referral_code')) {
    supabaseResponse.cookies.set('referral_code', refCode, {
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      httpOnly: true,
      sameSite: 'lax',
    });
  }

  // Maintenance mode enforcement
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
  const isAdmin = user?.app_metadata?.role === 'admin' || (user?.email && adminEmails.includes(user.email.toLowerCase()));

  if (isMaintenance && !isAdmin) {
    if (pathname !== '/maintenance') {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Service Unavailable (Maintenance)' }, { status: 503 });
      }
      return NextResponse.redirect(new URL('/maintenance', request.url));
    }
  } else if (!isMaintenance && pathname === '/maintenance') {
      return NextResponse.redirect(new URL('/', request.url));
  }

  if (user) {
    Sentry.setUser({ id: user.id, email: user.email });
  } else {
    // Guest accessing admin path - require login
    const isAdminPath = pathname.startsWith('/admin') ||
                       pathname.startsWith('/api/admin') ||
                       pathname.startsWith('/api/prompts/sync');

    if (isAdminPath) {
        if (pathname.startsWith('/api/')) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }
        return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
