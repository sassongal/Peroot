import { authenticateConnect, connectError, connectJson, handleOptions } from "@/lib/connect/auth";
import { ConnectOpError, connectSearchLibrary } from "@/lib/connect/ops";

/** GET /api/v1/library/search?q=… — search the curated PUBLIC library (free). */
export function OPTIONS() {
  return handleOptions();
}

export async function GET(req: Request) {
  const auth = await authenticateConnect(req);
  if (auth instanceof Response) return auth;
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  if (!q || q.length > 200) {
    return connectError(400, "invalid_request", "פרמטר q נדרש (עד 200 תווים)", "q required");
  }
  try {
    const results = await connectSearchLibrary(
      q,
      Number(url.searchParams.get("limit") ?? "10") || 10,
    );
    return connectJson({ results });
  } catch (e) {
    if (e instanceof ConnectOpError) {
      return connectError(e.status, e.code, e.message, e.messageEn ?? e.message);
    }
    return connectError(500, "internal_error", "שגיאת שרת פנימית", "Internal server error");
  }
}
