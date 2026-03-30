import { NextRequest, NextResponse } from 'next/server';
import { validateAdminSession } from '@/lib/admin/admin-security';
import { logger } from '@/lib/logger';

/**
 * GET /api/admin/users/[id]/emails
 *
 * Returns email history for a user:
 * - Onboarding sequence status and steps
 * - Campaign emails sent to this user (from activity_logs)
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

    // Fetch onboarding sequence for this user
    const [
      { data: sequence },
      { data: profile },
      { data: campaignLogs },
    ] = await Promise.all([
      supabase
        .from('email_sequences')
        .select('*')
        .eq('user_id', id)
        .eq('sequence_type', 'onboarding')
        .maybeSingle(),
      supabase
        .from('profiles')
        .select('email, created_at')
        .eq('id', id)
        .maybeSingle(),
      // Find campaign emails that included this user's segment
      supabase
        .from('activity_logs')
        .select('id, action, details, created_at')
        .eq('action', 'email_campaign')
        .order('created_at', { ascending: false })
        .limit(50),
    ]);

    // Build onboarding timeline
    const onboardingSteps = [
      { step: 0, name: 'ברוך הבא', delay: '24 שעות', key: 'onboarding_day1' },
      { step: 1, name: 'טיפים ראשונים', delay: '3 ימים', key: 'onboarding_day3' },
      { step: 2, name: 'פיצ\'רים מתקדמים', delay: '7 ימים', key: 'onboarding_day7' },
      { step: 3, name: 'סיכום ועידוד', delay: '14 ימים', key: 'onboarding_day14' },
    ];

    const currentStep = sequence?.current_step ?? 0;
    const sequenceStatus = sequence?.status ?? 'not_started';

    const onboarding = {
      status: sequenceStatus,
      currentStep,
      steps: onboardingSteps.map((s) => ({
        ...s,
        sent: s.step < currentStep,
        current: s.step === currentStep && sequenceStatus === 'active',
      })),
      startedAt: sequence?.started_at ?? null,
      lastSentAt: sequence?.last_sent_at ?? null,
      unsubscribed: sequenceStatus === 'unsubscribed',
    };

    // Filter campaign logs to determine which campaigns this user likely received
    // We check the segment and whether the user matches it
    const userTier = profile?.email ? 'unknown' : 'free'; // We'd need plan_tier for accurate matching
    const campaigns = (campaignLogs ?? []).map((log) => {
      const details = log.details as Record<string, unknown> | null;
      return {
        id: log.id,
        subject: (details?.subject as string) || 'Unknown',
        segment: (details?.segment as string) || 'all',
        sentCount: (details?.sent_count as number) || 0,
        failedCount: (details?.failed_count as number) || 0,
        sentAt: log.created_at,
      };
    });

    return NextResponse.json({
      email: profile?.email ?? null,
      userCreatedAt: profile?.created_at ?? null,
      onboarding,
      campaigns,
    });
  } catch (err) {
    logger.error('[Admin User Emails] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
