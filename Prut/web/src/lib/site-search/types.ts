/** Unified site search hit (API + client) */
export type SiteSearchSource =
  | "blog"
  | "guide"
  | "public_prompt"
  | "template"
  | "personal"
  | "locked";

export interface SiteSearchHit {
  id: string;
  source: SiteSearchSource;
  title: string;
  subtitle?: string;
  /** Path or hash path for Link / router */
  href: string;
  /** True when this public/personal row is in user favorites */
  isFavorite?: boolean;
  /** Guest-only: non-blog rows that only advertise login */
  locked?: boolean;
}

export interface SiteSearchResponse {
  results: SiteSearchHit[];
  /** True when the caller is not authenticated — only blog (+ locked teasers) */
  guestRestricted: boolean;
  /** Optional CTA line for guests */
  loginCta?: string;
}
