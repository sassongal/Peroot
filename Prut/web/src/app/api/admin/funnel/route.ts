import { NextResponse } from 'next/server';
import { withAdmin } from '@/lib/api-middleware';
import { logger } from '@/lib/logger';

export interface FunnelStage {
  key: string;
  label: string;
  labelHe: string;
  count: number;
  color: string;
}

export interface FunnelResponse {
  stages: FunnelStage[];
  timeRange: string;
  generatedAt: string;
}

function getStartDate(range: string): Date | null {
  const now = new Date();
  switch (range) {
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case '90d':
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    default:
      return null; // all time
  }
}

export const GET = withAdmin(async (req, supabase) => {
  try {
    const { searchParams } = new URL(req.url);
    const range = searchParams.get('range') || 'all';
    const startDate = getStartDate(range);

    // ── Stage 1: Signups ───────────────────────────────────────────────────────
    let signupQuery = supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true });
    if (startDate) {
      signupQuery = signupQuery.gte('created_at', startDate.toISOString());
    }
    const { count: signupCount, error: signupError } = await signupQuery;

    if (signupError) {
      logger.error('[Admin Funnel] Signup query error:', signupError);
    }

    // When filtering by time range, we need the set of user IDs who signed up
    // in that window so the downstream stages stay cohort-consistent.
    let cohortUserIds: string[] | null = null;
    if (startDate) {
      const { data: cohortProfiles } = await supabase
        .from('profiles')
        .select('id')
        .gte('created_at', startDate.toISOString());
      cohortUserIds = (cohortProfiles ?? []).map((p: { id: string }) => p.id);
    }

    // ── Stage 2: First Prompt Created ─────────────────────────────────────────
    let firstPromptCount = 0;
    if (cohortUserIds !== null) {
      if (cohortUserIds.length === 0) {
        firstPromptCount = 0;
      } else {
        // Count distinct users from the cohort who have at least 1 library entry
        const { data: promptUsers } = await supabase
          .from('personal_library')
          .select('user_id')
          .in('user_id', cohortUserIds);
        firstPromptCount = new Set(
          (promptUsers ?? []).map((r: { user_id: string }) => r.user_id)
        ).size;
      }
    } else {
      // All-time: count distinct users who have at least 1 entry
      const { data: promptUsers } = await supabase
        .from('personal_library')
        .select('user_id');
      firstPromptCount = new Set(
        (promptUsers ?? []).map((r: { user_id: string }) => r.user_id)
      ).size;
    }

    // ── Stage 3: Used AI Enhance ───────────────────────────────────────────────
    let enhanceCount = 0;
    if (cohortUserIds !== null) {
      if (cohortUserIds.length === 0) {
        enhanceCount = 0;
      } else {
        const { data: enhanceUsers } = await supabase
          .from('activity_logs')
          .select('user_id')
          .eq('action', 'Prmpt Enhance')
          .in('user_id', cohortUserIds);
        enhanceCount = new Set(
          (enhanceUsers ?? []).map((r: { user_id: string }) => r.user_id)
        ).size;
      }
    } else {
      const { data: enhanceUsers } = await supabase
        .from('activity_logs')
        .select('user_id')
        .eq('action', 'Prmpt Enhance');
      enhanceCount = new Set(
        (enhanceUsers ?? []).map((r: { user_id: string }) => r.user_id)
      ).size;
    }

    // ── Stage 4: Became Pro ────────────────────────────────────────────────────
    let proCount = 0;
    if (cohortUserIds !== null) {
      if (cohortUserIds.length === 0) {
        proCount = 0;
      } else {
        const { count } = await supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .neq('plan_tier', 'free')
          .in('id', cohortUserIds);
        proCount = count ?? 0;
      }
    } else {
      const { count } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .neq('plan_tier', 'free');
      proCount = count ?? 0;
    }

    const stages: FunnelStage[] = [
      {
        key: 'signup',
        label: 'Signed Up',
        labelHe: 'נרשמו',
        count: signupCount ?? 0,
        color: 'blue',
      },
      {
        key: 'first_prompt',
        label: 'First Prompt',
        labelHe: 'פרומפט ראשון',
        count: firstPromptCount,
        color: 'indigo',
      },
      {
        key: 'ai_enhance',
        label: 'Used AI Enhance',
        labelHe: 'השתמשו ב-AI Enhance',
        count: enhanceCount,
        color: 'purple',
      },
      {
        key: 'became_pro',
        label: 'Became Pro',
        labelHe: 'שדרגו לפרו',
        count: proCount,
        color: 'emerald',
      },
    ];

    logger.info('[Admin Funnel] Query complete', {
      range,
      stages: stages.map((s) => ({ key: s.key, count: s.count })),
    });

    return NextResponse.json({
      stages,
      timeRange: range,
      generatedAt: new Date().toISOString(),
    } satisfies FunnelResponse);
  } catch (err) {
    logger.error('[Admin Funnel] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
