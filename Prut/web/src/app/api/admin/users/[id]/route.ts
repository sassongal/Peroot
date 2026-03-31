import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  validateAdminSession,
  logAdminAction,
  parseAdminInput,
} from '@/lib/admin/admin-security';
import { adminAdjustCredits } from '@/lib/services/credit-service';
import { logger } from '@/lib/logger';

const adminActionSchema = z.object({
  action: z.enum([
    'change_tier',
    'grant_credits',
    'revoke_credits',
    'ban',
    'unban',
    'grant_admin',
    'revoke_admin',
  ]),
  value: z.union([z.string(), z.number()]).optional(),
});

/**
 * GET /api/admin/users/[id]
 *
 * Returns full user details including profile, role, subscription, stats,
 * style personality, achievement count, prompt count, total API cost,
 * and recent activity.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, user: adminUser, supabase } = await validateAdminSession();
    if (error || !adminUser || !supabase) {
      return NextResponse.json(
        { error: error || 'Forbidden' },
        { status: error === 'Unauthorized' ? 401 : 403 }
      );
    }

    const { id } = await params;

    // Validate UUID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return NextResponse.json({ error: 'Invalid user ID format' }, { status: 400 });
    }

    const [
      { data: profile },
      { data: role },
      { data: subscription },
      { data: stats },
      { data: stylePersonality },
      { count: achievementCount },
      { count: promptCount },
      { count: historyCount },
      { data: apiCostRows },
      { data: recentActivity },
      { data: recentHistory },
      { data: sourceBreakdown },
      { data: creditLedger },
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', id).maybeSingle(),
      supabase.from('user_roles').select('*').eq('user_id', id).maybeSingle(),
      supabase.from('subscriptions').select('*').eq('user_id', id).maybeSingle(),
      supabase.from('user_stats').select('*').eq('user_id', id).maybeSingle(),
      supabase.from('user_style_personality').select('*').eq('user_id', id).maybeSingle(),
      supabase
        .from('user_achievements')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', id),
      supabase
        .from('personal_library')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', id),
      supabase
        .from('history')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', id),
      supabase.from('api_usage_logs').select('estimated_cost_usd').eq('user_id', id).limit(10000),
      supabase
        .from('activity_logs')
        .select('id, user_id, action, created_at, details')
        .eq('user_id', id)
        .order('created_at', { ascending: false })
        .limit(30),
      supabase
        .from('history')
        .select('id, prompt, enhanced_prompt, tone, category, capability_mode, title, source, created_at')
        .eq('user_id', id)
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('history')
        .select('source')
        .eq('user_id', id)
        .limit(5000),
      supabase
        .from('credit_ledger')
        .select('id, delta, balance_after, reason, source, created_at')
        .eq('user_id', id)
        .order('created_at', { ascending: false })
        .limit(100),
    ]);

    if (!profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const totalApiCost = (apiCostRows ?? []).reduce(
      (sum, r) => sum + (r.estimated_cost_usd ?? 0),
      0
    );

    // Compute source breakdown (web vs extension)
    const sources = (sourceBreakdown ?? []).reduce<Record<string, number>>((acc, row) => {
      const src = (row.source as string) || 'web';
      acc[src] = (acc[src] || 0) + 1;
      return acc;
    }, {});

    // Compute favorite categories/tones from activity
    const categoryMap: Record<string, number> = {};
    const toneMap: Record<string, number> = {};
    const modeMap: Record<string, number> = {};
    for (const log of recentActivity ?? []) {
      const details = log.details as Record<string, unknown> | null;
      if (details?.category) categoryMap[details.category as string] = (categoryMap[details.category as string] || 0) + 1;
      if (details?.tone) toneMap[details.tone as string] = (toneMap[details.tone as string] || 0) + 1;
      if (details?.mode) modeMap[details.mode as string] = (modeMap[details.mode as string] || 0) + 1;
    }

    // Find last activity timestamp
    const lastActive = (recentActivity && recentActivity.length > 0)
      ? recentActivity[0].created_at
      : profile.updated_at;

    return NextResponse.json({
      profile,
      role,
      subscription,
      stats,
      stylePersonality,
      achievementCount: achievementCount ?? 0,
      promptCount: promptCount ?? 0,
      historyCount: historyCount ?? 0,
      totalApiCost,
      recentActivity: recentActivity ?? [],
      recentHistory: recentHistory ?? [],
      sourceBreakdown: sources,
      topCategories: Object.entries(categoryMap).sort((a, b) => b[1] - a[1]).slice(0, 5),
      topTones: Object.entries(toneMap).sort((a, b) => b[1] - a[1]).slice(0, 5),
      topModes: Object.entries(modeMap).sort((a, b) => b[1] - a[1]).slice(0, 5),
      lastActive,
      creditLedger: creditLedger ?? [],
    });
  } catch (err) {
    logger.error('[Admin User Detail GET] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/admin/users/[id]
 *
 * Performs an admin action on the target user.
 * Body: { action, value? }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, user: adminUser, supabase } = await validateAdminSession();
    if (error || !adminUser || !supabase) {
      return NextResponse.json(
        { error: error || 'Forbidden' },
        { status: error === 'Unauthorized' ? 401 : 403 }
      );
    }

    const { id } = await params;

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return NextResponse.json({ error: 'Invalid user ID format' }, { status: 400 });
    }

    const { data: body, error: parseError } = await parseAdminInput(req, adminActionSchema);
    if (parseError) return parseError;
    if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 });

    const { action, value } = body;

    switch (action) {
      case 'change_tier': {
        const validTiers = ['free', 'pro', 'premium'];
        if (typeof value !== 'string' || !validTiers.includes(value)) {
          return NextResponse.json(
            { error: `value must be one of: ${validTiers.join(', ')}` },
            { status: 400 }
          );
        }
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ plan_tier: value })
          .eq('id', id);

        if (updateError) {
          logger.error('[Admin User POST] change_tier error:', updateError);
          return NextResponse.json({ error: 'Failed to update plan tier' }, { status: 500 });
        }
        break;
      }

      case 'grant_credits': {
        const amount = Number(value);
        if (isNaN(amount) || amount <= 0 || amount > 10000) {
          return NextResponse.json(
            { error: 'value must be a positive number up to 10,000' },
            { status: 400 }
          );
        }
        const result = await adminAdjustCredits(id, amount);
        if (!result.success) {
          logger.error('[Admin User POST] grant_credits error:', result.error);
          return NextResponse.json({ error: 'Failed to grant credits' }, { status: 500 });
        }
        break;
      }

      case 'revoke_credits': {
        const amount = Number(value);
        if (isNaN(amount) || amount <= 0 || amount > 10000) {
          return NextResponse.json(
            { error: 'value must be a positive number up to 10,000' },
            { status: 400 }
          );
        }
        const result = await adminAdjustCredits(id, -amount);
        if (!result.success) {
          logger.error('[Admin User POST] revoke_credits error:', result.error);
          return NextResponse.json({ error: 'Failed to revoke credits' }, { status: 500 });
        }
        break;
      }

      case 'ban': {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ is_banned: true })
          .eq('id', id);

        if (updateError) {
          logger.error('[Admin User POST] ban error:', updateError);
          return NextResponse.json({ error: 'Failed to ban user' }, { status: 500 });
        }
        break;
      }

      case 'unban': {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ is_banned: false })
          .eq('id', id);

        if (updateError) {
          logger.error('[Admin User POST] unban error:', updateError);
          return NextResponse.json({ error: 'Failed to unban user' }, { status: 500 });
        }
        break;
      }

      case 'grant_admin': {
        const { error: upsertError } = await supabase
          .from('user_roles')
          .upsert({ user_id: id, role: 'admin' }, { onConflict: 'user_id' });

        if (upsertError) {
          logger.error('[Admin User POST] grant_admin error:', upsertError);
          return NextResponse.json({ error: 'Failed to grant admin role' }, { status: 500 });
        }
        break;
      }

      case 'revoke_admin': {
        const { error: deleteError } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', id)
          .eq('role', 'admin');

        if (deleteError) {
          logger.error('[Admin User POST] revoke_admin error:', deleteError);
          return NextResponse.json({ error: 'Failed to revoke admin role' }, { status: 500 });
        }
        break;
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }

    try {
      await logAdminAction(adminUser.id, `user_${action}`, {
        target_user_id: id,
        value: value ?? null,
      });
    } catch (logErr) {
      logger.error('[Admin User POST] Failed to log action (action succeeded):', logErr);
    }

    return NextResponse.json({ success: true, action, target_user_id: id });
  } catch (err) {
    logger.error('[Admin User Detail POST] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
