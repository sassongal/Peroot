import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=no-code`)
  }

  const cookieStore = await cookies()

  // We'll collect cookies here and set them on the response
  const cookiesToSet: { name: string; value: string; options: CookieOptions }[] = []

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookies) {
          cookies.forEach((cookie) => {
            cookiesToSet.push(cookie)
          })
        },
      },
    }
  )

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.session) {
    console.log('[Callback] Error:', error?.message)
    return NextResponse.redirect(`${origin}/login?error=auth-failed`)
  }

  // Create the redirect response
  const response = NextResponse.redirect(`${origin}${next}`)

  // Now set all the cookies on the response
  // The SDK sets cookies asynchronously, so we need to wait a tick
  await new Promise(resolve => setTimeout(resolve, 0))

  // If no cookies were collected, build them manually from the session
  if (cookiesToSet.length === 0) {
    const sessionStr = JSON.stringify({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
      expires_in: data.session.expires_in,
      token_type: data.session.token_type,
      user: data.session.user,
    })

    const encoded = Buffer.from(sessionStr).toString('base64')
    const cookieName = 'sb-ravinxlujmlvxhgbjxti-auth-token'
    const chunkSize = 3500

    const cookieOptions = {
      path: '/',
      sameSite: 'lax' as const,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 365,
    }

    // Clear the code verifier
    response.cookies.set(`${cookieName}-code-verifier`, '', { path: '/', maxAge: 0 })

    if (encoded.length <= chunkSize) {
      response.cookies.set(cookieName, `base64-${encoded}`, cookieOptions)
    } else {
      // Split into chunks
      for (let i = 0, chunk = 0; i < encoded.length; i += chunkSize, chunk++) {
        response.cookies.set(
          `${cookieName}.${chunk}`,
          `base64-${encoded.slice(i, i + chunkSize)}`,
          cookieOptions
        )
      }
    }
  } else {
    // Use the cookies from the SDK
    cookiesToSet.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, options)
    })
  }

  console.log('[Callback] Success! User:', data.session.user.email)
  console.log('[Callback] Cookies on response:', response.cookies.getAll().map(c => c.name).join(', '))

  return response
}
