import { z } from "zod";
import { authenticateConnect, connectError, connectJson, handleOptions } from "@/lib/connect/auth";
import { ConnectOpError, connectRelatedPrompts } from "@/lib/connect/ops";

/**
 * GET /api/v1/prompts/:id/related — Memory Palace neighbors (Jaccard keyword
 * similarity + 24h usage co-occurrence, same engine as the web graph). Free.
 */
export function OPTIONS() {
  return handleOptions();
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await authenticateConnect(req);
  if (auth instanceof Response) return auth;
  const { id } = await ctx.params;
  if (!z.string().uuid().safeParse(id).success) {
    return connectError(400, "invalid_request", "מזהה לא תקין", "Invalid id");
  }
  const limit = Number(new URL(req.url).searchParams.get("limit") ?? "8") || 8;
  try {
    return connectJson({ related: await connectRelatedPrompts(auth.userId, id, limit) });
  } catch (e) {
    if (e instanceof ConnectOpError) {
      return connectError(e.status, e.code, e.message, e.messageEn ?? e.message);
    }
    return connectError(500, "internal_error", "שגיאת שרת פנימית", "Internal server error");
  }
}
