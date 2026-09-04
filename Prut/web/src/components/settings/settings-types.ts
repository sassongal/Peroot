/** Shared types for settings sections and data export */

export interface ActivityLogRow {
  id: string;
  action: string;
  entity_type: string;
  created_at: string;
  details: Record<string, unknown> | null;
}

export interface UsageStatsState {
  totalEnhancements: number;
  thisMonth: number;
  thisWeek: number;
  streak: number;
  topCategories: { category: string; count: number }[];
  recentDays: { date: string; count: number }[];
}

export interface CreditsState {
  balance: number;
  dailyLimit: number;
  refreshedAt: string | null;
  /** Live referral-bonus bucket (0 when expired or absent). */
  bonus: number;
}
