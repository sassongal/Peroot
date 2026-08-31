import { z } from "zod";
import { authenticateConnect, connectError, connectJson, handleOptions } from "@/lib/connect/auth";
import { ConnectOpError, connectListFacts, connectRememberFact } from "@/lib/connect/ops";

/**
 * /api/v1/user/memory — the user's "brain" (memory facts every enhancement
 * draws from). GET → list · POST → remember a new fact. Free (no credit).
 */
export function OPTIONS() {
  return handleOptions();
}

export async function GET(req: Request) {
  const auth = await authenticateConnect(req);
  if (auth instanceof Response) return auth;
  try {
    return connectJson({ facts: await connectListFacts(auth.userId) });
  } catch (e) {
    if (e instanceof ConnectOpError) {
      return connectError(e.status, e.code, e.message, e.messageEn ?? e.message);
    }
    return connectError(500, "internal_error", "שגיאת שרת פנימית", "Internal server error");
  }
}

const Schema = z.object({
  fact: z.string().min(3).max(300),
  category: z
    .enum(["professional", "personal", "preference", "project", "language", "general"])
    .optional(),
});

export async function POST(req: Request) {
  const auth = await authenticateConnect(req);
  if (auth instanceof Response) return auth;
  let input;
  try {
    input = Schema.parse(await req.json());
  } catch {
    return connectError(400, "invalid_request", "עובדה חייבת להיות 3-300 תווים", "Invalid fact");
  }
  try {
    const fact = await connectRememberFact(auth.userId, input.fact, input.category);
    return connectJson({ saved: true, fact }, 201);
  } catch (e) {
    if (e instanceof ConnectOpError) {
      return connectError(e.status, e.code, e.message, e.messageEn ?? e.message);
    }
    return connectError(500, "internal_error", "שגיאת שרת פנימית", "Internal server error");
  }
}
