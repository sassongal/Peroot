// ── Types ─────────────────────────────────────────────────────────────────────

export type TabKey = "creation" | "performance" | "content" | "settings";

export interface ContentFactoryStats {
  totalPrompts: number;
  totalBlogPosts: number;
  pendingApproval: number;
  createdThisWeek: number;
  categories: string[];
  topPrompts: TopPrompt[];
  topBlogPosts: TopBlogPost[];
  categoryBalance: CategoryBalance[];
  deadContent: DeadItem[];
}

export interface PendingItem {
  id: string;
  type: "blog" | "prompt";
  title: string;
  content?: string;
  category?: string;
  created_at: string;
  batch_id?: string;
  batch_items?: PendingItem[];
}

export interface TopPrompt {
  id: string;
  title: string;
  category: string;
  use_count: number;
  favorites: number;
}

export interface TopBlogPost {
  id: string;
  title: string;
  category: string | null;
  created_at: string;
}

export interface CategoryBalance {
  name: string;
  count: number;
  target: number;
}

export interface DeadItem {
  id: string;
  type: "blog" | "prompt";
  title: string;
  created_at: string;
}

export interface ContentItem {
  id: string;
  type: "blog" | "prompt";
  title: string;
  category: string | null;
  status: "draft" | "published";
  created_at: string;
}

export interface Preset {
  id: string;
  name: string;
  type: "blog" | "prompt";
  topic: string;
  template?: string;
  category?: string;
}

export interface CronSettings {
  enabled: boolean;
  day: number;
  hour: number;
  draftExpiryDays: number;
  categoryTargets: Record<string, number>;
}

export const ARTICLE_TYPES = [
  { value: "guide", label: "מדריך מעמיק" },
  { value: "listicle", label: "רשימה (Listicle)" },
  { value: "comparison", label: "השוואה" },
  { value: "faq", label: "שאלות ותשובות" },
] as const;

export const DAYS_HE = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
export const DAYS_SHORT = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];

export const CATEGORY_COLORS: string[] = [
  "bg-blue-500",
  "bg-purple-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
  "bg-orange-500",
  "bg-pink-500",
];

// ── Helpers ───────────────────────────────────────────────────────────────────

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("he-IL", {
    day: "numeric",
    month: "numeric",
    year: "2-digit",
  });
}

export function nextCronDate(day: number): string {
  const now = new Date();
  const current = now.getDay();
  let daysUntil = day - current;
  if (daysUntil <= 0) daysUntil += 7;
  const next = new Date(now);
  next.setDate(now.getDate() + daysUntil);
  return `${next.getDate()}/${next.getMonth() + 1}`;
}
