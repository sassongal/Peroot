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

export async function middleware(request: NextRequest) {
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
  if (refCode && !request.cookies.get('referral_code')) {
    supabaseResponse.cookies.set('referral_code', refCode, {
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      httpOnly: true,
      sameSite: 'lax',
    });
  }

  // 🛠️ MAINTENANCE MODE ENFORCEMENT
  // We check this first to block all non-admin traffic if maintenance is active
  const isMaintenance = await getCachedMaintenanceMode();
  const isAdmin = user?.app_metadata?.role === 'admin';

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

    // ⛔ Admin Path Protection (Server-side Enforcement)
    // Check admin role from JWT app_metadata for admin paths
    const isAdminPath = request.nextUrl.pathname.startsWith('/admin') ||
                       request.nextUrl.pathname.startsWith('/api/admin') ||
                       request.nextUrl.pathname.startsWith('/api/prompts/sync');

    if (isAdminPath && !isAdmin) {
      if (request.nextUrl.pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      return NextResponse.redirect(new URL('/', request.url));
    }
  } else {
    // Guest accessing admin path
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
