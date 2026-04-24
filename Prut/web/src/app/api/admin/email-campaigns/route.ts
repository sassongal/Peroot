import { NextResponse } from "next/server";
import { Resend } from "resend";
import { withAdmin, withAdminWrite } from "@/lib/api-middleware";
import { createServiceClient } from "@/lib/supabase/service";
import { EmailService } from "@/lib/emails/service";
import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/ratelimit";
// DOMPurify loaded dynamically in POST handler to avoid jsdom import crash on GET

type Segment = "all" | "pro" | "free" | "inactive";

/**
 * GET /api/admin/email-campaigns
 *
 * Returns recent email campaign events from activity_logs,
 * plus per-segment user counts for the composer UI.
 */
export const GET = withAdmin(async () => {
  const supabase = createServiceClient();
  try {
    // Recent campaigns logged to activity_logs
    const { data: campaigns, error: campaignsError } = await supabase
      .from("activity_logs")
      .select("id, user_id, action, details, created_at")
      .or("action.eq.email_sent,action.eq.email_campaign")
      .order("created_at", { ascending: false })
      .limit(50);

    if (campaignsError) {
      logger.error("[Email Campaigns GET] campaigns query error:", campaignsError);
    }

    // Segment counts
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [allUsersResult, proUsersResult, freeUsersResult, inactiveUsersResult] =
      await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("plan_tier", "pro"),
        supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .or("plan_tier.eq.free,plan_tier.is.null"),
        // Inactive = no activity_logs entry in last 30 days
        supabase.from("profiles").select("id").lt("created_at", thirtyDaysAgo),
      ]);

    // Count inactive by finding users with no recent activity
    // Batch .in() calls to avoid URL length limits with large user bases
    const allProfileIds = (inactiveUsersResult.data ?? []).map((p) => p.id);
    let inactiveCount = 0;
    if (allProfileIds.length > 0) {
      const BATCH_SIZE = 500;
      const activeSet = new Set<string>();
      for (let i = 0; i < allProfileIds.length; i += BATCH_SIZE) {
        const batch = allProfileIds.slice(i, i + BATCH_SIZE);
        const { data: recentActiveIds } = await supabase
          .from("activity_logs")
          .select("user_id")
          .gte("created_at", thirtyDaysAgo)
          .in("user_id", batch);
        for (const r of recentActiveIds ?? []) activeSet.add(r.user_id);
      }
      inactiveCount = allProfileIds.filter((id) => !activeSet.has(id)).length;
    }

    // Monthly campaign count
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

    const campaignList = campaigns ?? [];
    const campaignsThisMonth = campaignList.filter((c) => c.created_at >= startOfMonth).length;

    const totalEmailsSent = campaignList.reduce((sum, c) => {
      const sent = (c.details as Record<string, unknown>)?.sent_count;
      return sum + (typeof sent === "number" ? sent : 1);
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
    logger.error("[Email Campaigns GET] Unexpected error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
});

/**
 * POST /api/admin/email-campaigns
 *
 * Body: { subject: string, htmlContent: string, segment: 'all' | 'pro' | 'free' | 'inactive' }
 *
 * Fetches recipient emails based on segment, sends via Resend,
 * logs result to activity_logs, returns success/failure counts.
 */
export const POST = withAdminWrite(async (req, _ssrClient, user) => {
  const supabase = createServiceClient();
  try {
    // Rate limit
    const rateLimit = await checkRateLimit(user.id, "adminEmailCampaign");
    if (!rateLimit.success) {
      return NextResponse.json({ error: "Rate limit exceeded. Try again later." }, { status: 429 });
    }

    let body: { subject?: unknown; htmlContent?: unknown; segment?: unknown };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { subject, htmlContent, segment } = body;

    if (typeof subject !== "string" || subject.trim().length === 0) {
      return NextResponse.json({ error: "subject is required" }, { status: 400 });
    }
    if (typeof htmlContent !== "string" || htmlContent.trim().length === 0) {
      return NextResponse.json({ error: "htmlContent is required" }, { status: 400 });
    }
    if (htmlContent.length > 500000) {
      return NextResponse.json({ error: "htmlContent exceeds maximum length" }, { status: 400 });
    }
    const validSegments: Segment[] = ["all", "pro", "free", "inactive"];
    if (!validSegments.includes(segment as Segment)) {
      return NextResponse.json(
        { error: `segment must be one of: ${validSegments.join(", ")}` },
        { status: 400 },
      );
    }

    const seg = segment as Segment;

    // ── Resolve recipient emails ──────────────────────────────────────────
    let emails: string[] = [];
    const emailToUserId = new Map<string, string>();

    if (seg === "all") {
      const { data } = await supabase.from("profiles").select("id, email").not("email", "is", null);
      for (const p of data ?? []) {
        if (p.email) {
          emails.push(p.email);
          emailToUserId.set(p.email, p.id);
        }
      }
    } else if (seg === "pro") {
      const { data } = await supabase
        .from("profiles")
        .select("id, email")
        .eq("plan_tier", "pro")
        .not("email", "is", null);
      for (const p of data ?? []) {
        if (p.email) {
          emails.push(p.email);
          emailToUserId.set(p.email, p.id);
        }
      }
    } else if (seg === "free") {
      const { data } = await supabase
        .from("profiles")
        .select("id, email")
        .or("plan_tier.eq.free,plan_tier.is.null")
        .not("email", "is", null);
      for (const p of data ?? []) {
        if (p.email) {
          emails.push(p.email);
          emailToUserId.set(p.email, p.id);
        }
      }
    } else if (seg === "inactive") {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const { data: allProfiles } = await supabase
        .from("profiles")
        .select("id, email")
        .lt("created_at", thirtyDaysAgo)
        .not("email", "is", null);

      const profileMap = new Map((allProfiles ?? []).map((p) => [p.id, p.email as string]));
      const allIds = [...profileMap.keys()];

      if (allIds.length > 0) {
        // Batch .in() to avoid URL length limits
        const activeSet = new Set<string>();
        const IN_BATCH = 500;
        for (let i = 0; i < allIds.length; i += IN_BATCH) {
          const batch = allIds.slice(i, i + IN_BATCH);
          const { data: recentActivity } = await supabase
            .from("activity_logs")
            .select("user_id")
            .gte("created_at", thirtyDaysAgo)
            .in("user_id", batch);
          for (const r of recentActivity ?? []) activeSet.add(r.user_id);
        }
        emails = allIds
          .filter((id) => !activeSet.has(id))
          .map((id) => profileMap.get(id)!)
          .filter(Boolean);
        for (const [id, email] of profileMap) {
          if (!activeSet.has(id) && email) emailToUserId.set(email, id);
        }
      }
    }

    // Filter out users who have unsubscribed — check BOTH consent layers:
    //   1. email_sequences.status = 'unsubscribed' (transactional sequences)
    //   2. newsletter_subscribers.unsubscribed_at IS NOT NULL (marketing list)
    // These were previously checked independently, which let newsletter
    // unsubs still receive campaign emails. Unify into a single exclusion set.
    if (emails.length > 0) {
      const exclude = new Set<string>();

      const [{ data: unsubSeq }, { data: unsubNewsletter }] = await Promise.all([
        supabase.from("email_sequences").select("user_id").eq("status", "unsubscribed"),
        supabase.from("newsletter_subscribers").select("email").not("unsubscribed_at", "is", null),
      ]);

      if (unsubSeq && unsubSeq.length > 0) {
        const unsubIds = new Set(unsubSeq.map((u) => u.user_id));
        const { data: unsubProfiles } = await supabase
          .from("profiles")
          .select("email")
          .in("id", [...unsubIds])
          .not("email", "is", null);
        for (const p of unsubProfiles ?? []) {
          if (p.email) exclude.add(p.email.toLowerCase());
        }
      }

      for (const row of unsubNewsletter ?? []) {
        const e = (row as { email: string }).email;
        if (e) exclude.add(e.toLowerCase());
      }

      if (exclude.size > 0) {
        emails = emails.filter((e) => !exclude.has(e.toLowerCase()));
      }
    }

    // Deduplicate — DB rows are unique by user but defensive dedup prevents
    // double-sending if the same address appears via multiple profile rows.
    emails = [...new Set(emails.map((e) => e.toLowerCase()))];

    if (emails.length === 0) {
      return NextResponse.json({
        success: true,
        sent: 0,
        failed: 0,
        message: "No recipients in this segment.",
      });
    }

    // ── Sanitize HTML content ─────────────────────────────────────────────
    const sanitize = (await import("sanitize-html")).default;
    const sanitizedHtml = sanitize(htmlContent as string, {
      allowedTags: [
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "p",
        "br",
        "hr",
        "strong",
        "b",
        "em",
        "i",
        "u",
        "a",
        "img",
        "ul",
        "ol",
        "li",
        "blockquote",
        "pre",
        "code",
        "table",
        "thead",
        "tbody",
        "tr",
        "th",
        "td",
        "div",
        "span",
        "header",
        "footer",
        "section",
      ],
      allowedAttributes: {
        a: ["href", "target", "rel", "title"],
        img: ["src", "alt", "title", "width", "height"],
        "*": ["style", "class", "align", "valign", "bgcolor", "border"],
        table: ["cellpadding", "cellspacing", "border", "width"],
      },
    });

    // ── Send via Resend ───────────────────────────────────────────────────
    const resend = new Resend(process.env.RESEND_API_KEY);
    const fromEmail = process.env.RESEND_FROM_EMAIL || "noreply@example.com";
    const replyToEmail = process.env.RESEND_REPLY_TO || "gal@joya-tech.net";

    let sentCount = 0;
    const failures: { email: string; error: string }[] = [];

    // Send in batches of 50 to stay within rate limits
    const BATCH_SIZE = 50;
    for (let i = 0; i < emails.length; i += BATCH_SIZE) {
      const batch = emails.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(async (to) => {
          const recipientUserId = emailToUserId.get(to);
          try {
            const { data: sendData, error: sendError } = await resend.emails.send({
              from: fromEmail,
              to,
              replyTo: replyToEmail,
              subject: subject.trim(),
              html: sanitizedHtml,
            });
            if (sendError) {
              failures.push({ email: to, error: sendError.message });
              await EmailService.logEmail({
                userId: recipientUserId,
                emailTo: to,
                source: "resend",
                emailType: "campaign",
                subject: subject.trim(),
                status: "failed",
                metadata: { segment: seg, error: sendError.message },
              });
            } else {
              sentCount++;
              await EmailService.logEmail({
                userId: recipientUserId,
                emailTo: to,
                source: "resend",
                emailType: "campaign",
                subject: subject.trim(),
                status: "sent",
                resendId: sendData?.id,
                metadata: { segment: seg },
              });
            }
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            failures.push({ email: to, error: msg });
            await EmailService.logEmail({
              userId: recipientUserId,
              emailTo: to,
              source: "resend",
              emailType: "campaign",
              subject: subject.trim(),
              status: "failed",
              metadata: { segment: seg, error: msg },
            });
          }
        }),
      );
    }

    // ── Log campaign to activity_logs ─────────────────────────────────────
    await supabase.from("activity_logs").insert({
      user_id: user.id,
      action: "email_campaign",
      entity_type: "email_campaign",
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
      `[Email Campaigns POST] Sent ${sentCount}/${emails.length} emails for segment="${seg}" by admin ${user.id}`,
    );

    return NextResponse.json({
      success: true,
      sent: sentCount,
      failed: failures.length,
      totalRecipients: emails.length,
      failures: failures.slice(0, 10), // cap exposure
    });
  } catch (err) {
    logger.error("[Email Campaigns POST] Unexpected error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
});
