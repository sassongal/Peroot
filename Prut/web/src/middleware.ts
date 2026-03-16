import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import * as Sentry from "@sentry/nextjs"
import { isMaintenanceMode } from '@/lib/maintenance'

// In-memory maintenance mode cache (avoids Redis call on every request)
let maintenanceCache: { value: boolean; expires: number } | null = null;
const MAINTENANCE_CACHE_TTL = 10_000; // 10 seconds

async function getCachedMaintenanceMode(): Promise<boolean> {
  const now = Date.now();
  if (maintenanceCache && now < maintenanceCache.expires) {
    return maintenanceCache.value;
  }
  const result = await isMaintenanceMode();
  maintenanceCache = { value: result, expires: now + MAINTENANCE_CACHE_TTL };
  return result;
}

// Routes exempt from CSRF origin checks (they use their own auth mechanisms)
const CSRF_EXEMPT_PREFIXES = [
  '/api/webhooks/',  // External service webhooks (HMAC-verified)
  '/api/cron/',      // Cron jobs (CRON_SECRET header auth)
  '/api/health',     // Public health check
]

function isStateChangingMethod(method: string): boolean {
  return !['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase())
}

function isCsrfExempt(pathname: string, request: NextRequest): boolean {
  // Exempt routes
  if (CSRF_EXEMPT_PREFIXES.some(prefix => pathname.startsWith(prefix))) {
    return true
  }
  // Bearer token auth — API key/token authenticated, not cookie-based
  const authHeader = request.headers.get('authorization') || ''
  if (authHeader.startsWith('Bearer ')) {
    return true
  }
  return false
}

function validateCsrfOrigin(request: NextRequest): NextResponse | null {
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
    // Malformed URL — requestOrigin stays empty, will fail validation
  }

  if (!requestOrigin || requestOrigin !== allowedOrigin) {
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
  const refCode = request.nextUrl.searchParams.get('ref');
  if (refCode) {
    // Store the referral code in a cookie (only if not already set)
    if (!request.cookies.get('referral_code')) {
      supabaseResponse.cookies.set('referral_code', refCode, {
        path: '/',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        httpOnly: true,
        sameSite: 'lax',
      });
    }
    // Clean the URL by removing the ?ref param and redirect
    const cleanUrl = request.nextUrl.clone();
    cleanUrl.searchParams.delete('ref');
    const redirectResponse = NextResponse.redirect(cleanUrl);
    // Carry over the referral cookie on the redirect response too
    if (!request.cookies.get('referral_code')) {
      redirectResponse.cookies.set('referral_code', refCode, {
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
        httpOnly: true,
        sameSite: 'lax',
      });
    }
    return redirectResponse;
  }

  // 🛠️ MAINTENANCE MODE ENFORCEMENT
  // We check this first to block all non-admin traffic if maintenance is active
  const isMaintenance = await getCachedMaintenanceMode();
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
  const isAdmin = user?.app_metadata?.role === 'admin' || (user?.email && adminEmails.includes(user.email.toLowerCase()));

  if (isMaintenance && !isAdmin) {
    // During maintenance, only allow /maintenance page
    if (request.nextUrl.pathname !== '/maintenance') {
      if (request.nextUrl.pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Service Unavailable (Maintenance)' }, { status: 503 });
      }
      return NextResponse.redirect(new URL('/maintenance', request.url));
    }
  } else if (!isMaintenance && request.nextUrl.pathname === '/maintenance') {
      // If maintenance is OFF but user is on /maintenance page, redirect home
      return NextResponse.redirect(new URL('/', request.url));
  }

  if (user) {
    // Inject user identity into Sentry
    Sentry.setUser({ id: user.id, email: user.email });

    // Admin path protection: only enforce authentication here.
    // Role-based authorization is handled by validateAdminSession() in each
    // admin API route / AdminLayout (checks user_roles table), because
    // app_metadata.role may not be set on all admin users.
  } else {
    // Guest accessing admin path — require login
    const isAdminPath = request.nextUrl.pathname.startsWith('/admin') ||
                       request.nextUrl.pathname.startsWith('/api/admin') ||
                       request.nextUrl.pathname.startsWith('/api/prompts/sync');

    if (isAdminPath) {
        if (request.nextUrl.pathname.startsWith('/api/')) {
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
