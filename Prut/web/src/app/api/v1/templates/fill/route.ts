import { z } from "zod";
import { authenticateConnect, connectError, connectJson, handleOptions } from "@/lib/connect/auth";
import { ConnectOpError, connectFillTemplate } from "@/lib/connect/ops";

/**
 * POST /api/v1/templates/fill — fill a public-library template's {variables}.
 * Returns the filled prompt + any variables still missing so the agent can ask
 * the user for them. Free (no credit).
 */
export function OPTIONS() {
  return handleOptions();
}

const Schema = z.object({
  template_id: z.string().uuid(),
  variables: z.record(z.string().max(60), z.string().max(2_000)).default({}),
});

export async function POST(req: Request) {
  const auth = await authenticateConnect(req);
  if (auth instanceof Response) return auth;
  let input;
  try {
    input = Schema.parse(await req.json());
  } catch {
    return connectError(400, "invalid_request", "בקשה לא תקינה", "Invalid request");
  }
  try {
    return connectJson(await connectFillTemplate(input.template_id, input.variables));
  } catch (e) {
    if (e instanceof ConnectOpError) {
      return connectError(e.status, e.code, e.message, e.messageEn ?? e.message);
    }
    return connectError(500, "internal_error", "שגיאת שרת פנימית", "Internal server error");
  }
}
