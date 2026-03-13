import { NextRequest, NextResponse } from 'next/server';
import { validateAdminSession } from '@/lib/admin/admin-security';
import { logger } from '@/lib/logger';

/**
 * GET /api/admin/notifications
 *
 * Analyzes recent Supabase data to detect anomalies and returns a structured
 * list of notifications grouped by severity. Each notification is deterministic
 * (same inputs produce same IDs) so the client can match persisted
 * acknowledged state from localStorage.
 *
 * Anomaly checks performed:
 *   1. Traffic spike    – today's activity vs 7-day rolling average (>2x)
 *   2. Cost overrun     – today's API costs vs daily average × 1.5
 *   3. New user burst   – signups today vs daily average × 3
 *   4. Error patterns   – failed actions in activity_logs (>10 in 24h)
 *   5. Inactive pro     – pro users with no activity in 7 days
 *
 * System health score: 100 - (criticals × 30 + warnings × 10 + infos × 5)
 * clamped to [0, 100].
 */

type NotificationType = 'critical' | 'warning' | 'info';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  metric?: {
    label: string;
    current: number | string;
    baseline: number | string;
    unit?: string;
  };
}

interface NotificationResponse {
  notifications: Notification[];
  summary: {
    critical: number;
    warning: number;
    info: number;
    healthScore: number;
    generatedAt: string;
  };
}

function makeId(...parts: (string | number)[]): string {
  return parts
    .join('-')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-');
}

function todayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  return { start: start.toISOString(), end: end.toISOString() };
}

function daysAgoISO(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export async function GET(req: NextRequest) {
  // Suppress unused warning - req is required by Next.js route signature
  void req;

  try {
    const { error, user, supabase } = await validateAdminSession();
    if (error || !user || !supabase) {
      return NextResponse.json(
        { error: error || 'Forbidden' },
        { status: error === 'Unauthorized' ? 401 : 403 }
      );
    }

    const now = new Date().toISOString();
    const { start: todayStart, end: todayEnd } = todayRange();
    const sevenDaysAgo = daysAgoISO(7);
    const oneDayAgo = daysAgoISO(1);

    const notifications: Notification[] = [];

    // ─────────────────────────────────────────────────────────────────────────
    // 1. TRAFFIC SPIKE: today's activity_logs count vs 7-day daily average
    // ─────────────────────────────────────────────────────────────────────────
    try {
      const [todayActivity, weekActivity] = await Promise.all([
        supabase
          .from('activity_logs')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', todayStart)
          .lte('created_at', todayEnd),
        supabase
          .from('activity_logs')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', sevenDaysAgo)
          .lt('created_at', todayStart),
      ]);

      const todayCount = todayActivity.count ?? 0;
      const weekCount = weekActivity.count ?? 0;
      const dailyAvg = weekCount / 7;

      if (dailyAvg > 0) {
        const ratio = todayCount / dailyAvg;
        if (ratio >= 3) {
          notifications.push({
            id: makeId('traffic-spike', todayStart.slice(0, 10)),
            type: 'critical',
            title: 'Traffic Spike Detected',
            message: `פעילות היום גבוהה פי ${ratio.toFixed(1)} מהממוצע היומי. ייתכן עומס חריג, בוט, או גל משתמשים.`,
            timestamp: now,
            metric: {
              label: 'פעילות יומית',
              current: todayCount,
              baseline: Math.round(dailyAvg),
              unit: 'events',
            },
          });
        } else if (ratio >= 2) {
          notifications.push({
            id: makeId('traffic-spike', todayStart.slice(0, 10)),
            type: 'warning',
            title: 'Elevated Activity',
            message: `פעילות היום גבוהה פי ${ratio.toFixed(1)} מהממוצע היומי של 7 הימים האחרונים.`,
            timestamp: now,
            metric: {
              label: 'פעילות יומית',
              current: todayCount,
              baseline: Math.round(dailyAvg),
              unit: 'events',
            },
          });
        }
      } else if (todayCount > 50) {
        notifications.push({
          id: makeId('traffic-new', todayStart.slice(0, 10)),
          type: 'info',
          title: 'First Activity Detected',
          message: `נרשמו ${todayCount} אירועי פעילות היום (אין מספיק נתוני עבר להשוואה).`,
          timestamp: now,
          metric: {
            label: 'אירועים היום',
            current: todayCount,
            baseline: 0,
            unit: 'events',
          },
        });
      }
    } catch (e) {
      logger.warn('[Notifications] Traffic spike check failed:', e);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2. COST OVERRUN: today's API costs vs 7-day daily average × 1.5
    // ─────────────────────────────────────────────────────────────────────────
    try {
      const [todayCostData, weekCostData] = await Promise.all([
        supabase
          .from('api_usage_logs')
          .select('estimated_cost_usd')
          .gte('created_at', todayStart)
          .lte('created_at', todayEnd),
        supabase
          .from('api_usage_logs')
          .select('estimated_cost_usd')
          .gte('created_at', sevenDaysAgo)
          .lt('created_at', todayStart),
      ]);

      const todayCost = (todayCostData.data ?? []).reduce(
        (s, r) => s + (r.estimated_cost_usd ?? 0),
        0
      );
      const weekCost = (weekCostData.data ?? []).reduce(
        (s, r) => s + (r.estimated_cost_usd ?? 0),
        0
      );
      const dailyCostAvg = weekCost / 7;

      if (dailyCostAvg > 0) {
        const ratio = todayCost / dailyCostAvg;
        if (ratio >= 2.5) {
          notifications.push({
            id: makeId('cost-overrun-critical', todayStart.slice(0, 10)),
            type: 'critical',
            title: 'Critical Cost Overrun',
            message: `עלויות API היום ($${todayCost.toFixed(4)}) גבוהות פי ${ratio.toFixed(1)} מהממוצע היומי. בדוק מיד אם יש שימוש חריג.`,
            timestamp: now,
            metric: {
              label: 'עלות API היום',
              current: `$${todayCost.toFixed(4)}`,
              baseline: `$${dailyCostAvg.toFixed(4)}`,
              unit: 'USD',
            },
          });
        } else if (ratio >= 1.5) {
          notifications.push({
            id: makeId('cost-overrun-warning', todayStart.slice(0, 10)),
            type: 'warning',
            title: 'Cost Overrun Warning',
            message: `עלויות API היום ($${todayCost.toFixed(4)}) גבוהות בכ-${Math.round((ratio - 1) * 100)}% מהממוצע היומי.`,
            timestamp: now,
            metric: {
              label: 'עלות API היום',
              current: `$${todayCost.toFixed(4)}`,
              baseline: `$${dailyCostAvg.toFixed(4)}`,
              unit: 'USD',
            },
          });
        }
      }
    } catch (e) {
      logger.warn('[Notifications] Cost overrun check failed:', e);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 3. NEW USER BURST: signups today vs 7-day daily average × 3
    // ─────────────────────────────────────────────────────────────────────────
    try {
      const [todaySignups, weekSignups] = await Promise.all([
        supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', todayStart)
          .lte('created_at', todayEnd),
        supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', sevenDaysAgo)
          .lt('created_at', todayStart),
      ]);

      const signupsToday = todaySignups.count ?? 0;
      const signupsWeek = weekSignups.count ?? 0;
      const dailySignupAvg = signupsWeek / 7;

      if (dailySignupAvg > 0) {
        const ratio = signupsToday / dailySignupAvg;
        if (ratio >= 5) {
          notifications.push({
            id: makeId('signup-burst-critical', todayStart.slice(0, 10)),
            type: 'critical',
            title: 'Massive Signup Burst',
            message: `${signupsToday} הרשמות חדשות היום — פי ${ratio.toFixed(1)} מהממוצע. בדוק אם זה ויראלי, קמפיין, או בוט.`,
            timestamp: now,
            metric: {
              label: 'הרשמות היום',
              current: signupsToday,
              baseline: Math.round(dailySignupAvg),
              unit: 'users',
            },
          });
        } else if (ratio >= 3) {
          notifications.push({
            id: makeId('signup-burst-warning', todayStart.slice(0, 10)),
            type: 'warning',
            title: 'New User Burst',
            message: `${signupsToday} הרשמות חדשות היום — פי ${ratio.toFixed(1)} מהממוצע היומי של שבוע אחרון.`,
            timestamp: now,
            metric: {
              label: 'הרשמות היום',
              current: signupsToday,
              baseline: Math.round(dailySignupAvg),
              unit: 'users',
            },
          });
        }
      } else if (signupsToday > 10) {
        notifications.push({
          id: makeId('signup-info', todayStart.slice(0, 10)),
          type: 'info',
          title: 'New User Activity',
          message: `${signupsToday} הרשמות חדשות היום.`,
          timestamp: now,
          metric: {
            label: 'הרשמות היום',
            current: signupsToday,
            baseline: 0,
            unit: 'users',
          },
        });
      }
    } catch (e) {
      logger.warn('[Notifications] Signup burst check failed:', e);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 4. ERROR PATTERNS: failed/error actions in activity_logs last 24h
    // ─────────────────────────────────────────────────────────────────────────
    try {
      const { count: errorCount } = await supabase
        .from('activity_logs')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', oneDayAgo)
        .or('action.ilike.%error%,action.ilike.%fail%,action.ilike.%denied%');

      const errors = errorCount ?? 0;

      if (errors >= 50) {
        notifications.push({
          id: makeId('error-pattern-critical', todayStart.slice(0, 10)),
          type: 'critical',
          title: 'High Error Rate Detected',
          message: `${errors} פעולות כושלות/שגיאות ב-24 שעות האחרונות. ייתכן בעיה בשירות או ניסיון תקיפה.`,
          timestamp: now,
          metric: {
            label: 'שגיאות (24h)',
            current: errors,
            baseline: 10,
            unit: 'errors',
          },
        });
      } else if (errors >= 10) {
        notifications.push({
          id: makeId('error-pattern-warning', todayStart.slice(0, 10)),
          type: 'warning',
          title: 'Elevated Error Rate',
          message: `${errors} פעולות כושלות ב-24 שעות האחרונות — מעל הסף הרגיל.`,
          timestamp: now,
          metric: {
            label: 'שגיאות (24h)',
            current: errors,
            baseline: 10,
            unit: 'errors',
          },
        });
      }
    } catch (e) {
      logger.warn('[Notifications] Error pattern check failed:', e);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 5. INACTIVE PRO USERS: pro users with no activity_logs in 7 days
    // ─────────────────────────────────────────────────────────────────────────
    try {
      const { data: proProfiles } = await supabase
        .from('profiles')
        .select('id')
        .in('plan_tier', ['pro', 'premium', 'paid']);

      if (proProfiles && proProfiles.length > 0) {
        const proIds = proProfiles.map((p) => p.id);

        const { data: recentActiveUsers } = await supabase
          .from('activity_logs')
          .select('user_id')
          .in('user_id', proIds)
          .gte('created_at', sevenDaysAgo);

        const activeSet = new Set((recentActiveUsers ?? []).map((r) => r.user_id));
        const inactiveProCount = proIds.filter((id) => !activeSet.has(id)).length;
        const inactivePct = Math.round((inactiveProCount / proIds.length) * 100);

        if (inactivePct >= 40 && inactiveProCount >= 5) {
          notifications.push({
            id: makeId('inactive-pro-critical', todayStart.slice(0, 10)),
            type: 'critical',
            title: 'High Pro User Inactivity',
            message: `${inactiveProCount} ממשתמשי ה-Pro (${inactivePct}%) לא היו פעילים ב-7 ימים האחרונים. סיכון גבוה לנטישה.`,
            timestamp: now,
            metric: {
              label: 'Pro משתמשים לא פעילים',
              current: inactiveProCount,
              baseline: proIds.length,
              unit: 'users',
            },
          });
        } else if (inactivePct >= 20 && inactiveProCount >= 3) {
          notifications.push({
            id: makeId('inactive-pro-warning', todayStart.slice(0, 10)),
            type: 'warning',
            title: 'Pro Users Inactive',
            message: `${inactiveProCount} ממשתמשי ה-Pro (${inactivePct}%) לא היו פעילים ב-7 ימים — שקול לשלוח קמפיין re-engagement.`,
            timestamp: now,
            metric: {
              label: 'Pro משתמשים לא פעילים',
              current: inactiveProCount,
              baseline: proIds.length,
              unit: 'users',
            },
          });
        } else if (inactiveProCount > 0) {
          notifications.push({
            id: makeId('inactive-pro-info', todayStart.slice(0, 10)),
            type: 'info',
            title: 'Pro User Activity Report',
            message: `${inactiveProCount} ממשתמשי ה-Pro לא היו פעילים ב-7 ימים האחרונים (${100 - inactivePct}% פעילים).`,
            timestamp: now,
            metric: {
              label: 'Pro משתמשים לא פעילים',
              current: inactiveProCount,
              baseline: proIds.length,
              unit: 'users',
            },
          });
        }
      }
    } catch (e) {
      logger.warn('[Notifications] Inactive pro check failed:', e);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // If no anomalies, add a healthy system notification
    // ─────────────────────────────────────────────────────────────────────────
    if (notifications.length === 0) {
      notifications.push({
        id: makeId('system-healthy', todayStart.slice(0, 10)),
        type: 'info',
        title: 'All Systems Nominal',
        message: 'לא זוהו אנומליות. המערכת פועלת בצורה תקינה.',
        timestamp: now,
      });
    }

    // Sort: critical first, then warning, then info, then by timestamp desc
    const typePriority: Record<NotificationType, number> = {
      critical: 0,
      warning: 1,
      info: 2,
    };
    notifications.sort((a, b) => {
      const pd = typePriority[a.type] - typePriority[b.type];
      if (pd !== 0) return pd;
      return b.timestamp.localeCompare(a.timestamp);
    });

    // ── Summary ──────────────────────────────────────────────────────────────
    const criticalCount = notifications.filter((n) => n.type === 'critical').length;
    const warningCount = notifications.filter((n) => n.type === 'warning').length;
    const infoCount = notifications.filter((n) => n.type === 'info').length;
    const healthScore = Math.max(
      0,
      Math.min(100, 100 - criticalCount * 30 - warningCount * 10 - infoCount * 5)
    );

    const response: NotificationResponse = {
      notifications,
      summary: {
        critical: criticalCount,
        warning: warningCount,
        info: infoCount,
        healthScore,
        generatedAt: now,
      },
    };

    return NextResponse.json(response);
  } catch (err) {
    logger.error('[Admin Notifications] GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
