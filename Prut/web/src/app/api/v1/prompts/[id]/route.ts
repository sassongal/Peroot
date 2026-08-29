import { z } from "zod";
import { authenticateConnect, connectError, connectJson, handleOptions } from "@/lib/connect/auth";
import { ConnectOpError, connectGetPrompt } from "@/lib/connect/ops";

/** GET /api/v1/prompts/:id — fetch one saved prompt (caller-scoped). */
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
  try {
    return connectJson(await connectGetPrompt(auth.userId, id));
  } catch (e) {
    if (e instanceof ConnectOpError) {
      return connectError(e.status, e.code, e.message, e.messageEn ?? e.message);
    }
    return connectError(500, "internal_error", "שגיאת שרת פנימית", "Internal server error");
  }
}
