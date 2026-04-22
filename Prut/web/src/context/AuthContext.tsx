"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/logger";

interface AuthContextValue {
  user: User | null;
  isAdmin: boolean;
  /** True once we've resolved the first auth state (SSR hydration or getUser round-trip). */
  isLoaded: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Single source of truth for client-side auth state.
 *
 * Hydrates from the SSR-fetched `initialUser` (avoids a post-hydration network
 * round-trip for logged-in users) and then subscribes to onAuthStateChange for
 * live updates. On any SIGNED_IN / SIGNED_OUT / USER_UPDATED transition we also
 * call `router.refresh()` so server components re-run with the fresh cookies.
 *
 * The admin role is read once per user id from the `user_roles` table and
 * memoized here, so per-component `user_roles` queries are no longer needed.
 */
export function AuthProvider({
  children,
  initialUser,
}: {
  children: React.ReactNode;
  initialUser: User | null;
}) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(initialUser);
  const [isLoaded, setIsLoaded] = useState(initialUser !== null);
  const [isAdmin, setIsAdmin] = useState(false);
  const userIdRef = useRef<string | null>(initialUser?.id ?? null);

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;

    // If SSR already gave us the user, skip the extra getUser() round-trip.
    // Otherwise we fall back to getUser() once so the header doesn't flash guest.
    if (!initialUser) {
      supabase.auth
        .getUser()
        .then(({ data }) => {
          if (!mounted) return;
          setUser(data.user ?? null);
          userIdRef.current = data.user?.id ?? null;
        })
        .catch((err) => logger.warn("[AuthProvider] getUser failed", err))
        .finally(() => {
          if (mounted) setIsLoaded(true);
        });
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      const next = session?.user ?? null;
      const prevId = userIdRef.current;
      const nextId = next?.id ?? null;
      const idChanged = prevId !== nextId;

      // INITIAL_SESSION fires after SSR hydration with the same user — skip the
      // re-render unless the id actually changed.
      if (event === "INITIAL_SESSION" && !idChanged) {
        setIsLoaded(true);
        return;
      }

      userIdRef.current = nextId;
      setUser(next);
      setIsLoaded(true);

      // Auth transitions (sign in, sign out, user metadata change) must rerun
      // RSCs so server-rendered data picks up the new session. Skip this for
      // TOKEN_REFRESHED — those fire every ~55min on the same id and would
      // trash whatever RSC-driven scroll state the user is looking at.
      if (
        (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") &&
        idChanged
      ) {
        router.refresh();
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [initialUser, router]);

  // Resolve admin role from user_roles. One query per logged-in user id.
  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      return;
    }
    let cancelled = false;
    const supabase = createClient();
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) logger.warn("[AuthProvider] user_roles query failed", error);
        setIsAdmin(Boolean(data));
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const value = useMemo<AuthContextValue>(
    () => ({ user, isAdmin, isLoaded }),
    [user, isAdmin, isLoaded],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    // Fallback rather than throw: components that mount before the provider
    // (e.g. error boundaries during early hydration) should still render
    // in a safe guest state.
    return { user: null, isAdmin: false, isLoaded: false };
  }
  return ctx;
}
