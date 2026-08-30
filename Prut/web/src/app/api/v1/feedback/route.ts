import { z } from "zod";
import { authenticateConnect, connectError, connectJson, handleOptions } from "@/lib/connect/auth";
import { ConnectOpError, connectRatePrompt } from "@/lib/connect/ops";

/**
 * POST /api/v1/feedback — thumbs up/down on an enhancement. Closes the quality
 * loop (scoring + Memory Palace). Free (no credit).
 */
export function OPTIONS() {
  return handleOptions();
}

const Schema = z.object({
  rating: z.union([z.literal(1), z.literal(-1)]),
  input_text: z.string().max(10_000).optional(),
  enhanced_text: z.string().max(50_000).optional(),
  mode: z.string().max(40).optional(),
});

export async function POST(req: Request) {
  const auth = await authenticateConnect(req);
  if (auth instanceof Response) return auth;
  let input;
  try {
    input = Schema.parse(await req.json());
  } catch {
    return connectError(
      400,
      "invalid_request",
      "בקשה לא תקינה — rating חייב להיות 1 או -1",
      "rating must be 1 or -1",
    );
  }
  try {
    await connectRatePrompt(auth.userId, input);
    return connectJson({ saved: true }, 201);
  } catch (e) {
    if (e instanceof ConnectOpError) {
      return connectError(e.status, e.code, e.message, e.messageEn ?? e.message);
    }
    return connectError(500, "internal_error", "שגיאת שרת פנימית", "Internal server error");
  }
}
