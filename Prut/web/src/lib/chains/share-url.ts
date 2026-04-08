/**
 * Chain share URL encoding — generates a self-contained link that any
 * Peroot user can open to import a chain into their personal library.
 *
 * Encoding: JSON.stringify → UTF-8 → base64url (no padding). This avoids
 * needing a backend endpoint or short-link service for the first version
 * of chain sharing. URL length cap is ~2000 chars which comfortably fits
 * a 5-step chain (typical payload ~400-800 chars).
 *
 * Shape: https://peroot.space/?chain=<base64url>
 */

import type { PromptChain } from '@/hooks/useChains';

export interface SharedChainPayload {
  title: string;
  description?: string;
  steps: PromptChain['steps'];
  /** Protocol version — bump if we ever change the shape. */
  v: 1;
}

function toBase64Url(str: string): string {
  if (typeof window === 'undefined') {
    return Buffer.from(str, 'utf-8')
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }
  // btoa can't handle unicode directly — round-trip via encodeURIComponent
  const utf8 = unescape(encodeURIComponent(str));
  return btoa(utf8).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(b64: string): string {
  const padded = b64.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((b64.length + 3) % 4);
  if (typeof window === 'undefined') {
    return Buffer.from(padded, 'base64').toString('utf-8');
  }
  return decodeURIComponent(escape(atob(padded)));
}

export function buildChainShareUrl(chain: PromptChain, origin?: string): string {
  const payload: SharedChainPayload = {
    v: 1,
    title: chain.title,
    description: chain.description,
    // Strip per-user ids — the importer will mint new ones.
    steps: chain.steps.map(({ ...rest }) => rest),
  };
  const encoded = toBase64Url(JSON.stringify(payload));
  const base = origin ?? (typeof window !== 'undefined' ? window.location.origin : 'https://peroot.space');
  return `${base}/?chain=${encoded}`;
}

export function decodeSharedChain(encoded: string): SharedChainPayload | null {
  try {
    const json = fromBase64Url(encoded);
    const parsed = JSON.parse(json) as SharedChainPayload;
    if (!parsed || parsed.v !== 1 || !parsed.title || !Array.isArray(parsed.steps)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
