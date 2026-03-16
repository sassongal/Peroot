import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { validateAdminSession } from '@/lib/admin/admin-security';
import { logger } from '@/lib/logger';

type Segment = 'all' | 'pro' | 'free' | 'inactive';

/**
 * GET /api/admin/email-campaigns
 *
 * Returns recent email campaign events from activity_logs,
 * plus per-segment user counts for the composer UI.
 */
export async function GET() {
  try {
    const { error, user, supabase } = await validateAdminSession();
    if (error || !user || !supabase) {
      return NextResponse.json(
        { error: error || 'Forbidden' },
        { status: error === 'Unauthorized' ? 401 : 403 }
      );
    }

    // Recent campaigns logged to activity_logs
    const { data: campaigns, error: campaignsError } = await supabase
      .from('activity_logs')
      .select('id, user_id, action, details, created_at')
      .or('action.eq.email_sent,action.eq.email_campaign')
      .order('created_at', { ascending: false })
      .limit(50);

    if (campaignsError) {
      logger.error('[Email Campaigns GET] campaigns query error:', campaignsError);
    }

    // Segment counts
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [allUsersResult, proUsersResult, freeUsersResult, inactiveUsersResult] =
      await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('plan_tier', 'pro'),
        supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .or('plan_tier.eq.free,plan_tier.is.null'),
        // Inactive = no activity_logs entry in last 30 days
        supabase
          .from('profiles')
          .select('id')
          .lt('created_at', thirtyDaysAgo),
      ]);

    // Count inactive by finding users with no recent activity
    const allProfileIds = (inactiveUsersResult.data ?? []).map((p) => p.id);
    let inactiveCount = 0;
    if (allProfileIds.length > 0) {
      const { data: recentActiveIds } = await supabase
        .from('activity_logs')
        .select('user_id')
        .gte('created_at', thirtyDaysAgo)
        .in('user_id', allProfileIds);

      const activeSet = new Set((recentActiveIds ?? []).map((r) => r.user_id));
      inactiveCount = allProfileIds.filter((id) => !activeSet.has(id)).length;
    }

    // Monthly campaign count
    const startOfMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1
    ).toISOString();

    const campaignList = campaigns ?? [];
    const campaignsThisMonth = campaignList.filter(
      (c) => c.created_at >= startOfMonth
    ).length;

    const totalEmailsSent = campaignList.reduce((sum, c) => {
      const sent = (c.details as Record<string, unknown>)?.sent_count;
      return sum + (typeof sent === 'number' ? sent : 1);
    }, 0);

    return NextResponse.json({
      campaigns: campaignList,
      segmentCounts: {
        all: allUsersResult.count ?? 0,
        pro: proUsersResult.count ?? 0,
        free: freeUsersResult.count ?? 0,
        inactive: inactiveCount,
      },
      summary: {
        totalEmailsSent,
        campaignsThisMonth,
      },
    });
  } catch (err) {
    logger.error('[Email Campaigns GET] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

/**
 * POST /api/admin/email-campaigns
 *
 * Body: { subject: string, htmlContent: string, segment: 'all' | 'pro' | 'free' | 'inactive' }
 *
 * Fetches recipient emails based on segment, sends via Resend,
 * logs result to activity_logs, returns success/failure counts.
 */
export async function POST(req: NextRequest) {
  try {
    const { error, user, supabase } = await validateAdminSession();
    if (error || !user || !supabase) {
      return NextResponse.json(
        { error: error || 'Forbidden' },
        { status: error === 'Unauthorized' ? 401 : 403 }
      );
    }

    let body: { subject?: unknown; htmlContent?: unknown; segment?: unknown };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { subject, htmlContent, segment } = body;

    if (typeof subject !== 'string' || subject.trim().length === 0) {
      return NextResponse.json({ error: 'subject is required' }, { status: 400 });
    }
    if (typeof htmlContent !== 'string' || htmlContent.trim().length === 0) {
      return NextResponse.json({ error: 'htmlContent is required' }, { status: 400 });
    }
    const validSegments: Segment[] = ['all', 'pro', 'free', 'inactive'];
    if (!validSegments.includes(segment as Segment)) {
      return NextResponse.json(
        { error: `segment must be one of: ${validSegments.join(', ')}` },
        { status: 400 }
      );
    }

    const seg = segment as Segment;

    // ── Resolve recipient emails ──────────────────────────────────────────
    let emails: string[] = [];

    if (seg === 'all') {
      const { data } = await supabase
        .from('profiles')
        .select('email')
        .not('email', 'is', null);
      emails = (data ?? []).map((p) => p.email).filter(Boolean) as string[];
    } else if (seg === 'pro') {
      const { data } = await supabase
        .from('profiles')
        .select('email')
        .eq('plan_tier', 'pro')
        .not('email', 'is', null);
      emails = (data ?? []).map((p) => p.email).filter(Boolean) as string[];
    } else if (seg === 'free') {
      const { data } = await supabase
        .from('profiles')
        .select('email')
        .or('plan_tier.eq.free,plan_tier.is.null')
        .not('email', 'is', null);
      emails = (data ?? []).map((p) => p.email).filter(Boolean) as string[];
    } else if (seg === 'inactive') {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const { data: allProfiles } = await supabase
        .from('profiles')
        .select('id, email')
        .lt('created_at', thirtyDaysAgo)
        .not('email', 'is', null);

      const profileMap = new Map(
        (allProfiles ?? []).map((p) => [p.id, p.email as string])
      );
      const allIds = [...profileMap.keys()];

      if (allIds.length > 0) {
        const { data: recentActivity } = await supabase
          .from('activity_logs')
          .select('user_id')
          .gte('created_at', thirtyDaysAgo)
          .in('user_id', allIds);

        const activeSet = new Set((recentActivity ?? []).map((r) => r.user_id));
        emails = allIds
          .filter((id) => !activeSet.has(id))
          .map((id) => profileMap.get(id)!)
          .filter(Boolean);
      }
    }

    // Filter out users who have unsubscribed from email sequences
    if (emails.length > 0) {
      const { data: unsubscribed } = await supabase
        .from('email_sequences')
        .select('user_id')
        .eq('status', 'unsubscribed');

      if (unsubscribed && unsubscribed.length > 0) {
        // Get emails of unsubscribed users
        const unsubIds = new Set(unsubscribed.map((u) => u.user_id));
        const { data: unsubProfiles } = await supabase
          .from('profiles')
          .select('email')
          .in('id', [...unsubIds])
          .not('email', 'is', null);
        const unsubEmails = new Set((unsubProfiles ?? []).map((p) => p.email));
        emails = emails.filter((e) => !unsubEmails.has(e));
      }
    }

    if (emails.length === 0) {
      return NextResponse.json({
        success: true,
        sent: 0,
        failed: 0,
        message: 'No recipients in this segment.',
      });
    }

    // ── Send via Resend ───────────────────────────────────────────────────
    const resend = new Resend(process.env.RESEND_API_KEY);
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@example.com';

    let sentCount = 0;
    const failures: { email: string; error: string }[] = [];

    // Send in batches of 50 to stay within rate limits
    const BATCH_SIZE = 50;
    for (let i = 0; i < emails.length; i += BATCH_SIZE) {
      const batch = emails.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(async (to) => {
          try {
            const { error: sendError } = await resend.emails.send({
              from: fromEmail,
              to,
              subject: subject.trim(),
              html: htmlContent,
            });
            if (sendError) {
              failures.push({ email: to, error: sendError.message });
            } else {
              sentCount++;
            }
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            failures.push({ email: to, error: msg });
          }
        })
      );
    }

    // ── Log campaign to activity_logs ─────────────────────────────────────
    await supabase.from('activity_logs').insert({
      user_id: user.id,
      action: 'email_campaign',
      entity_type: 'email_campaign',
      details: {
        subject: subject.trim(),
        segment: seg,
        sent_count: sentCount,
        failed_count: failures.length,
        total_recipients: emails.length,
        is_admin: true,
        timestamp: new Date().toISOString(),
      },
    });

    logger.info(
      `[Email Campaigns POST] Sent ${sentCount}/${emails.length} emails for segment="${seg}" by admin ${user.id}`
    );

    return NextResponse.json({
      success: true,
      sent: sentCount,
      failed: failures.length,
      totalRecipients: emails.length,
      failures: failures.slice(0, 10), // cap exposure
    });
  } catch (err) {
    logger.error('[Email Campaigns POST] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
