"use client";

import { createContext, useContext } from "react";
import { QUOTA_FALLBACK } from "@/lib/quota-policy";
import type { QuotaPolicy } from "@/lib/quota-server";

/**
 * The live quota policy, resolved ONCE on the server and handed to the client.
 *
 * Quota numbers appear in copy on marketing pages (pricing, FAQ), in the
 * onboarding overlay and in the guest banner. Reading them through
 * `useSiteSettings` cost each of those surfaces a Supabase REST query plus an
 * `auth.getUser()` call on mount — on `/pricing`, a static page whose whole
 * point is to be served from the CDN with nothing to wait for.
 *
 * The value comes from `getQuotaPolicy()` in the root layout, which is cached
 * for 60s server-side, so the client makes no request at all.
 *
 * `useSiteSettings` remains the right tool for the things that genuinely need
 * live updates (theme colours, maintenance mode, the guest kill switch); it is
 * quota copy specifically that does not.
 */
const QuotaPolicyContext = createContext<QuotaPolicy>({ ...QUOTA_FALLBACK });

export function QuotaPolicyProvider({
  value,
  children,
}: {
  value: QuotaPolicy;
  children: React.ReactNode;
}) {
  return <QuotaPolicyContext.Provider value={value}>{children}</QuotaPolicyContext.Provider>;
}

/** Live quota policy. Falls back to the documented values outside a provider. */
export function useQuotaPolicy(): QuotaPolicy {
  return useContext(QuotaPolicyContext);
}
