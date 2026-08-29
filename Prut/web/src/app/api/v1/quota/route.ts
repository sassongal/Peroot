import { authenticateConnect, connectError, connectJson, handleOptions } from "@/lib/connect/auth";
import { ConnectOpError, connectQuota } from "@/lib/connect/ops";

/**
 * GET /api/v1/quota — free tool (no credit). Lets an agent check the user's
 * remaining allowance BEFORE spending it — essential for free-tier users
 * whose whole day is a single enhancement.
 */
export function OPTIONS() {
  return handleOptions();
}

export async function GET(req: Request) {
  const auth = await authenticateConnect(req);
  if (auth instanceof Response) return auth;
  try {
    return connectJson(await connectQuota(auth.userId));
  } catch (e) {
    if (e instanceof ConnectOpError) {
      return connectError(e.status, e.code, e.message, e.messageEn ?? e.message);
    }
    return connectError(500, "internal_error", "שגיאת שרת פנימית", "Internal server error");
  }
}
