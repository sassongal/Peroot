import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { checkRateLimit } from "@/lib/ratelimit";
import { logger } from "@/lib/logger";

/**
 * GET /api/p/[id]
 * Returns the full prompt body for an authenticated user. Guests get 401
 * so the prompt text never leaks into public HTML/ISR. The /prompts/[slug]/[id]
 * page renders a short preview in server HTML and the PromptBodyGate client
 * component fetches the full text from here on mount.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const authHeader = req.headers.get("authorization");
    const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;

    const {
      data: { user },
    } = bearerToken ? await supabase.auth.getUser(bearerToken) : await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const rl = await checkRateLimit(user.id, "publicPromptFetch");
    if (!rl.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { id } = await params;
    if (!id || !/^[a-f0-9-]{8,64}$/i.test(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const service = createServiceClient();
    const { data, error } = await service
      .from("public_library_prompts")
      .select("id, prompt, variables")
      .eq("id", id)
      .eq("is_active", true)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(data, {
      headers: { "Cache-Control": "private, max-age=300" },
    });
  } catch (e) {
    logger.error("[api/p/[id]] error:", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
