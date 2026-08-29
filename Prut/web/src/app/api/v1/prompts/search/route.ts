import { authenticateConnect, connectError, connectJson, handleOptions } from "@/lib/connect/auth";
import { ConnectOpError, connectSearchPrompts } from "@/lib/connect/ops";

/** GET /api/v1/prompts/search?q=…&limit=… — fuzzy search over the caller's library. */
export function OPTIONS() {
  return handleOptions();
}

export async function GET(req: Request) {
  const auth = await authenticateConnect(req);
  if (auth instanceof Response) return auth;
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  if (!q || q.length > 200) {
    return connectError(
      400,
      "invalid_request",
      "פרמטר q נדרש (עד 200 תווים)",
      "Query param q is required (max 200 chars)",
    );
  }
  const limit = Number(url.searchParams.get("limit") ?? "10") || 10;
  try {
    return connectJson({ results: await connectSearchPrompts(auth.userId, q, limit) });
  } catch (e) {
    if (e instanceof ConnectOpError) {
      return connectError(e.status, e.code, e.message, e.messageEn ?? e.message);
    }
    return connectError(500, "internal_error", "שגיאת שרת פנימית", "Internal server error");
  }
}
