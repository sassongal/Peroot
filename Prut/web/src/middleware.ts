import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import * as Sentry from "@sentry/nextjs"

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

  // 🛠️ MAINTENANCE MODE ENFORCEMENT
  // We check this first to block all non-admin traffic if maintenance is active
  const { data: settings } = await supabase
    .from('site_settings')
    .select('maintenance_mode')
    .single();

  const isMaintenance = settings?.maintenance_mode;
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
    const isAdminPath = request.nextUrl.pathname.startsWith('/admin') || 
                       request.nextUrl.pathname.startsWith('/api/admin') ||
                       request.nextUrl.pathname.startsWith('/api/prompts/sync');
    
    if (isAdminPath) {
        // 🚀 Optimizing: Use JWT claims (app_metadata) instead of DB hit
        // Note: For this to work perfectly, you should add your role to app_metadata via Supabase Auth
        const role = user.app_metadata?.role;
        const isAdmin = role === 'admin'; 

        if (!isAdmin) {
            // Not an admin - Redirect to home or return 403 for API
            if (request.nextUrl.pathname.startsWith('/api/')) {
                return NextResponse.json({ error: 'Unauthorized access' }, { status: 403 });
            }
            return NextResponse.redirect(new URL('/', request.url));
        }
    }
  } else {
    // Guest accessing admin path
    const isAdminPath = request.nextUrl.pathname.startsWith('/admin') || 
                       request.nextUrl.pathname.startsWith('/api/admin');
    
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
