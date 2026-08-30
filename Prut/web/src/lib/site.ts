/**
 * Canonical site origin — SINGLE source for every absolute URL the backend
 * emits (OAuth discovery documents, WWW-Authenticate resource_metadata…).
 * These must all agree or the OAuth discovery chain breaks.
 */
export function siteBase(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || "https://www.peroot.space";
}
