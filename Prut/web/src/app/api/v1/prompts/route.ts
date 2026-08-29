import { z } from "zod";
import {
  authenticateConnect,
  connectError,
  connectJson,
  handleOptions,
  logConnectUsage,
} from "@/lib/connect/auth";
import {
  ConnectOpError,
  ConnectSaveSchema,
  connectListPrompts,
  connectSavePrompt,
} from "@/lib/connect/ops";

/**
 * /api/v1/prompts — Peroot Connect personal library.
 * GET  → list (paginated)      POST → save (explicit-only, optional auto_tag)
 */
export function OPTIONS() {
  return handleOptions();
}

export async function GET(req: Request) {
  const auth = await authenticateConnect(req);
  if (auth instanceof Response) return auth;
  const url = new URL(req.url);
  const page = Number(url.searchParams.get("page") ?? "1") || 1;
  const limit = Number(url.searchParams.get("limit") ?? "20") || 20;
  try {
    return connectJson(await connectListPrompts(auth.userId, page, limit));
  } catch (e) {
    if (e instanceof ConnectOpError) {
      return connectError(e.status, e.code, e.message, e.messageEn ?? e.message);
    }
    return connectError(500, "internal_error", "שגיאת שרת פנימית", "Internal server error");
  }
}

export async function POST(req: Request) {
  const auth = await authenticateConnect(req);
  if (auth instanceof Response) return auth;
  let input;
  try {
    input = ConnectSaveSchema.parse(await req.json());
  } catch (e) {
    const detail = e instanceof z.ZodError ? e.issues[0]?.message : undefined;
    return connectError(
      400,
      "invalid_request",
      "בקשה לא תקינה" + (detail ? ` — ${detail}` : ""),
      "Invalid request" + (detail ? ` — ${detail}` : ""),
    );
  }
  const started = Date.now();
  try {
    const saved = await connectSavePrompt(auth.userId, input);
    logConnectUsage({
      userId: auth.userId,
      keyId: auth.keyId,
      endpoint: "/api/v1/prompts",
      durationMs: Date.now() - started,
    });
    return connectJson({ saved: true, ...saved }, 201);
  } catch (e) {
    if (e instanceof ConnectOpError) {
      return connectError(e.status, e.code, e.message, e.messageEn ?? e.message);
    }
    return connectError(500, "internal_error", "שגיאת שרת פנימית", "Internal server error");
  }
}
