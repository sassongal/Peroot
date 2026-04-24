import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/api-middleware";
import { createServiceClient } from "@/lib/supabase/service";
import { getEmailAutomationSnapshot } from "@/lib/emails/automation-env";
import { logger } from "@/lib/logger";

/**
 * GET /api/admin/unsubscribes
 *
 * Returns unsubscribe stats + recent unsubscribes for admin monitoring.
 */
export const GET = withAdmin(async () => {
  const supabase = createServiceClient();
  try {
    // Unsubscribed from email_sequences
    const { data: seqUnsubscribed, count: seqCount } = await supabase
      .from("email_sequences")
      .select("id, user_id, started_at, last_sent_at", { count: "exact" })
      .eq("status", "unsubscribed")
      .order("last_sent_at", { ascending: false })
      .limit(50);

    // Unsubscribed from newsletter_subscribers
    const { data: nlUnsubscribed, count: nlCount } = await supabase
      .from("newsletter_subscribers")
      .select("id, email, subscribed_at, unsubscribed_at", { count: "exact" })
      .not("unsubscribed_at", "is", null)
      .order("unsubscribed_at", { ascending: false })
      .limit(50);

    // Total active newsletter subscribers
    const { count: nlActiveCount } = await supabase
      .from("newsletter_subscribers")
      .select("id", { count: "exact", head: true })
      .is("unsubscribed_at", null);

    // Total active email sequences
    const { count: seqActiveCount } = await supabase
      .from("email_sequences")
      .select("id", { count: "exact", head: true })
      .eq("status", "active");

    // Enrich sequence unsubscribes with user emails (Auth Admin API requires service role)
    const service = createServiceClient();
    const enriched = await Promise.all(
      (seqUnsubscribed ?? []).map(async (seq) => {
        const { data: userData } = await service.auth.admin.getUserById(seq.user_id);
        return {
          ...seq,
          email: userData?.user?.email || "unknown",
          source: "email_sequences" as const,
        };
      }),
    );

    return NextResponse.json({
      automation: getEmailAutomationSnapshot(),
      stats: {
        sequenceUnsubscribed: seqCount ?? 0,
        sequenceActive: seqActiveCount ?? 0,
        newsletterUnsubscribed: nlCount ?? 0,
        newsletterActive: nlActiveCount ?? 0,
      },
      recentUnsubscribes: [
        ...enriched.map((s) => ({
          email: s.email,
          source: "onboarding" as const,
          date: s.last_sent_at || s.started_at,
        })),
        ...(nlUnsubscribed ?? []).map((n) => ({
          email: n.email,
          source: "newsletter" as const,
          date: n.unsubscribed_at,
        })),
      ]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 50),
    });
  } catch (err) {
    logger.error("[admin/unsubscribes] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
});
