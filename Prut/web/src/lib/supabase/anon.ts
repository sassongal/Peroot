import { createClient } from "@supabase/supabase-js";

/**
 * A cookie-free client for public, unauthenticated reads.
 *
 * The SSR client (`@/lib/supabase/server`) reads and writes cookies, which is
 * exactly right for anything user-scoped and exactly wrong for a public
 * catalogue: touching cookies makes the route dynamic, so its
 * `s-maxage=3600` header describes a response the CDN is never given a chance
 * to share. The public library endpoint carried that header for months and was
 * re-queried on every request.
 *
 * This client sends no cookies and persists no session, so it always resolves
 * to the `anon` role and RLS applies exactly as it does for a logged-out
 * visitor. Never use it where the caller's identity matters.
 */
export function createAnonClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    },
  );
}
