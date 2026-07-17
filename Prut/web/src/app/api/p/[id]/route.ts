import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { withUser } from "@/lib/api-middleware";

/**
 * GET /api/p/[id]
 * Returns the full prompt body for an authenticated user. Guests get 401 so the
 * prompt text never leaks into public HTML/ISR. Auth (cookie or Bearer) + the
 * publicPromptFetch rate-limit owned by withUser; the query reads
 * public_library_prompts via the service-role client (forceServiceClient).
 */
export const GET = withUser<{ params: Promise<{ id: string }> }>(
  async (_req, ctx, routeContext) => {
    const { id } = await routeContext.params;
    if (!id || !/^[\w-]{2,128}$/i.test(id)) {
      return NextResponse.json({ error: "מזהה לא תקין", code: "invalid_id" }, { status: 400 });
    }

    try {
      const { data, error } = await ctx.db
        .from("public_library_prompts")
        .select("id, prompt, variables")
        .eq("id", id)
        .eq("is_active", true)
        .maybeSingle();

      if (error || !data) {
        return NextResponse.json({ error: "לא נמצא", code: "not_found" }, { status: 404 });
      }

      return NextResponse.json(data, { headers: { "Cache-Control": "private, max-age=300" } });
    } catch (e) {
      logger.error("[api/p/[id]] error:", e);
      return NextResponse.json(
        { error: "שגיאת שרת פנימית", code: "internal_error" },
        { status: 500 },
      );
    }
  },
  { rateLimit: "publicPromptFetch", forceServiceClient: true },
);
