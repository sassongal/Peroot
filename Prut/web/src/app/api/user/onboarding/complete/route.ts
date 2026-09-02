import { NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { withUser } from "@/lib/api-middleware";
import { createServiceClient } from "@/lib/supabase/service";
import { roleFact } from "@/lib/onboarding-roles";

/**
 * POST /api/user/onboarding/complete
 *
 * Marks in-app onboarding as finished. Welcome email is sent once at signup
 * (auth callback + onboarding_welcome), not here — avoids duplicate automated mail.
 * Auth owned by withUser.
 *
 * The role the user picked is also written to `user_memory_facts` (master plan
 * 3.5). It used to seed a sample prompt and then be discarded, which left the
 * memory layer with nothing to say about a new user until the style analyzer
 * had ~20 days of library to read. `user_memory_facts` has no user-facing RLS
 * policies, so that one write takes the service client and is scoped by the
 * authenticated id from ctx.
 */

const Schema = z.object({ role: z.string().max(40).optional() }).partial();

export const POST = withUser(
  async (req, ctx) => {
    // The body is optional: the overlay can be skipped before a role is picked,
    // and older clients send nothing at all.
    const body = await req.json().catch(() => ({}));
    const role = Schema.safeParse(body).data?.role;

    const { error: updateError } = await ctx.db
      .from("profiles")
      .update({ onboarding_completed: true, updated_at: new Date().toISOString() })
      .eq("id", ctx.user!.id);

    if (updateError) {
      return NextResponse.json(
        { error: "השלמת ההכרות נכשלה", code: "onboarding_failed" },
        { status: 500 },
      );
    }

    const fact = roleFact(role);
    if (fact) {
      // Fire-and-forget: a memory fact is a bonus, and onboarding must finish
      // even if this write does not.
      void (async () => {
        try {
          const svc = createServiceClient();
          const { data: existing } = await svc
            .from("user_memory_facts")
            .select("id")
            .eq("user_id", ctx.user!.id)
            .eq("fact", fact)
            .limit(1)
            .maybeSingle();
          if (existing) return;
          await svc.from("user_memory_facts").insert({
            user_id: ctx.user!.id,
            fact,
            category: "professional",
            // The user stated it, so it is not an inference.
            source: "manual",
            confidence: 1.0,
          });
        } catch (e) {
          logger.warn("[onboarding] role fact write failed", e);
        }
      })();
    }

    // Log onboarding completion (fire-and-forget)
    void ctx.db.from("activity_logs").insert({
      user_id: ctx.user!.id,
      action: "onboarding_complete",
      entity_type: "profile",
      entity_id: ctx.user!.id,
      details: role ? { role } : {},
    });

    return NextResponse.json({ success: true, message: "Onboarding completed successfully" });
  },
  { rateLimit: "none" },
);
