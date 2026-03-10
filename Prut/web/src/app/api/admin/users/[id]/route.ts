import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  validateAdminSession,
  logAdminAction,
  parseAdminInput,
} from '@/lib/admin/admin-security';

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

    const [
      { data: profile },
      { data: role },
      { data: subscription },
      { data: stats },
      { data: stylePersonality },
      { count: achievementCount },
      { count: promptCount },
      { data: apiCostRows },
      { data: recentActivity },
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
      supabase.from('api_usage_logs').select('estimated_cost_usd').eq('user_id', id),
      supabase
        .from('activity_logs')
        .select('id, user_id, action, created_at, details')
        .eq('user_id', id)
        .order('created_at', { ascending: false })
        .limit(20),
    ]);

    if (!profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const totalApiCost = (apiCostRows ?? []).reduce(
      (sum, r) => sum + (r.estimated_cost_usd ?? 0),
      0
    );

    return NextResponse.json({
      profile,
      role,
      subscription,
      stats,
      stylePersonality,
      achievementCount: achievementCount ?? 0,
      promptCount: promptCount ?? 0,
      totalApiCost,
      recentActivity: recentActivity ?? [],
    });
  } catch (err) {
    console.error('[Admin User Detail GET] Error:', err);
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

    const { data: body, error: parseError } = await parseAdminInput(req, adminActionSchema);
    if (parseError) return parseError;
    if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 });

    const { action, value } = body;

    switch (action) {
      case 'change_tier': {
        if (typeof value !== 'string') {
          return NextResponse.json(
            { error: 'value must be a string tier name for change_tier' },
            { status: 400 }
          );
        }
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ plan_tier: value })
          .eq('id', id);

        if (updateError) {
          console.error('[Admin User POST] change_tier error:', updateError);
          return NextResponse.json({ error: 'Failed to update plan tier' }, { status: 500 });
        }
        break;
      }

      case 'grant_credits': {
        const amount = Number(value);
        if (isNaN(amount) || amount <= 0) {
          return NextResponse.json(
            { error: 'value must be a positive number for grant_credits' },
            { status: 400 }
          );
        }
        const { data: profile } = await supabase
          .from('profiles')
          .select('credits_balance')
          .eq('id', id)
          .maybeSingle();

        const currentCredits = profile?.credits_balance ?? 0;

        const { error: updateError } = await supabase
          .from('profiles')
          .update({ credits_balance: currentCredits + amount })
          .eq('id', id);

        if (updateError) {
          console.error('[Admin User POST] grant_credits error:', updateError);
          return NextResponse.json({ error: 'Failed to grant credits' }, { status: 500 });
        }
        break;
      }

      case 'revoke_credits': {
        const amount = Number(value);
        if (isNaN(amount) || amount <= 0) {
          return NextResponse.json(
            { error: 'value must be a positive number for revoke_credits' },
            { status: 400 }
          );
        }
        const { data: profile } = await supabase
          .from('profiles')
          .select('credits_balance')
          .eq('id', id)
          .maybeSingle();

        const currentCredits = profile?.credits_balance ?? 0;
        const newCredits = Math.max(0, currentCredits - amount);

        const { error: updateError } = await supabase
          .from('profiles')
          .update({ credits_balance: newCredits })
          .eq('id', id);

        if (updateError) {
          console.error('[Admin User POST] revoke_credits error:', updateError);
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
          console.error('[Admin User POST] ban error:', updateError);
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
          console.error('[Admin User POST] unban error:', updateError);
          return NextResponse.json({ error: 'Failed to unban user' }, { status: 500 });
        }
        break;
      }

      case 'grant_admin': {
        const { error: upsertError } = await supabase
          .from('user_roles')
          .upsert({ user_id: id, role: 'admin' }, { onConflict: 'user_id' });

        if (upsertError) {
          console.error('[Admin User POST] grant_admin error:', upsertError);
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
          console.error('[Admin User POST] revoke_admin error:', deleteError);
          return NextResponse.json({ error: 'Failed to revoke admin role' }, { status: 500 });
        }
        break;
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }

    await logAdminAction(adminUser.id, `user_${action}`, {
      target_user_id: id,
      value: value ?? null,
    });

    return NextResponse.json({ success: true, action, target_user_id: id });
  } catch (err) {
    console.error('[Admin User Detail POST] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
