import { authenticateConnect, connectError, connectJson, handleOptions } from "@/lib/connect/auth";
import { ConnectOpError, connectListChains } from "@/lib/connect/ops";

/** GET /api/v1/chains — the user's saved multi-step prompt chains (free). */
export function OPTIONS() {
  return handleOptions();
}

export async function GET(req: Request) {
  const auth = await authenticateConnect(req);
  if (auth instanceof Response) return auth;
  try {
    return connectJson({ chains: await connectListChains(auth.userId) });
  } catch (e) {
    if (e instanceof ConnectOpError) {
      return connectError(e.status, e.code, e.message, e.messageEn ?? e.message);
    }
    return connectError(500, "internal_error", "שגיאת שרת פנימית", "Internal server error");
  }
}
