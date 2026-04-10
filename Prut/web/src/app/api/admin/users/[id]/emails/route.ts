import { NextRequest, NextResponse } from 'next/server';
import { validateAdminSession } from '@/lib/admin/admin-security';
import { logger } from '@/lib/logger';

/**
 * GET /api/admin/users/[id]/emails
 *
 * Returns complete email history for a user from all sources:
 * - email_logs table (centralized: Resend + LemonSqueezy)
 * - email_sequences (onboarding progress)
 * - Fallback: webhook_events for historical LemonSqueezy emails
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
      { data: sequence },
      { data: profile },
      { data: emailLogs },
    ] = await Promise.all([
      // Onboarding sequence
      supabase
        .from('email_sequences')
        .select('*')
        .eq('user_id', id)
        .eq('sequence_type', 'onboarding')
        .maybeSingle(),
      // User profile
      supabase
        .from('profiles')
        .select('email, plan_tier, created_at')
        .eq('id', id)
        .maybeSingle(),
      // Centralized email logs for this user
      supabase
        .from('email_logs')
        .select('*')
        .eq('user_id', id)
        .order('created_at', { ascending: false })
        .limit(100),
    ]);

    // Build onboarding timeline
    const onboardingSteps = [
      { step: 0, name: 'ברוכים הבאים ל-Peroot', delay: 'מיד בהרשמה', key: 'onboarding_welcome' },
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

    // Build complete email history from email_logs
    const allEmails = (emailLogs ?? []).map((log) => ({
      id: log.id,
      source: log.source,
      type: log.email_type,
      subject: log.subject,
      status: log.status,
      sentAt: log.created_at,
      metadata: log.metadata,
    }));

    // Supplement with LemonSqueezy webhook events for this user
    // Fetch only after we know the email, and filter server-side
    const userEmail = profile?.email;
    if (userEmail) {
      // Targeted fetch — only subscription events, with textSearch on body
      const { data: webhookEvents } = await supabase
        .from('webhook_events')
        .select('event_name, body, created_at')
        .in('event_name', [
          'subscription_created', 'subscription_payment_success',
          'subscription_cancelled', 'subscription_expired',
          'subscription_resumed', 'subscription_payment_failed',
        ])
        .order('created_at', { ascending: false })
        .limit(50);
    if (webhookEvents) {
      const lsEventNames: Record<string, string> = {
        subscription_created: 'Subscription Confirmation',
        subscription_payment_success: 'Payment Receipt',
        subscription_cancelled: 'Cancellation Confirmation',
        subscription_expired: 'Subscription Expired',
        subscription_resumed: 'Subscription Resumed',
        subscription_payment_failed: 'Payment Failed Notice',
      };

      // Check existing email_logs IDs to avoid duplicates
      const existingIds = new Set(allEmails.map(e => e.id));

      for (const event of webhookEvents) {
        if (!(event.event_name in lsEventNames)) continue;
        const body = event.body as Record<string, unknown> | null;
        const data = body?.data as Record<string, unknown> | null;
        const attrs = data?.attributes as Record<string, unknown> | null;
        const eventEmail = attrs?.user_email as string;

        if (eventEmail?.toLowerCase() !== userEmail.toLowerCase()) continue;

        const eventId = `ls-${event.event_name}-${event.created_at}`;
        if (existingIds.has(eventId)) continue;

        allEmails.push({
          id: eventId,
          source: 'lemonsqueezy',
          type: event.event_name,
          subject: lsEventNames[event.event_name],
          status: 'sent',
          sentAt: event.created_at,
          metadata: {
            plan: (attrs?.product_name as string) || (attrs?.variant_name as string) || null,
          },
        });
      }

      // Sort by date descending
      allEmails.sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
    }
    }

    // Summary stats
    const totalSent = allEmails.filter(e => e.status === 'sent').length;
    const totalFailed = allEmails.filter(e => e.status === 'failed').length;
    const sources = [...new Set(allEmails.map(e => e.source))];

    return NextResponse.json({
      email: userEmail ?? null,
      userCreatedAt: profile?.created_at ?? null,
      onboarding,
      emails: allEmails,
      summary: {
        totalSent,
        totalFailed,
        sources,
      },
    });
  } catch (err) {
    logger.error('[Admin User Emails] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
