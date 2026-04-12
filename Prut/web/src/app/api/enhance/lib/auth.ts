import { validateApiKey } from "@/lib/api-auth";

/**
 * Minimal duck-type for the Supabase auth API needed by resolveAuth.
 * Keeps this module decoupled from the specific client factory and easy to mock in tests.
 */
interface AuthClient {
  auth: {
    getUser: (token?: string) => Promise<{ data: { user: { id: string } | null } }>;
  };
}

interface AuthResult {
  userId: string | undefined;
  bearerToken: string | undefined;
  /** true when a Bearer token (extension JWT) or API key was used — signals that the
   *  caller should swap to the service-role client to bypass RLS. */
  useServiceClient: boolean;
}

/**
 * Thrown when an API key (`prk_*`) is supplied but fails validation.
 * The route handler converts this to a 401 response.
 */
export class ApiAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiAuthError";
  }
}

/**
 * Resolves the caller identity from the incoming request:
 * - `prk_*` tokens → Developer API key path (validateApiKey)
 * - Other Bearer tokens → Chrome extension JWT path (supabase.auth.getUser)
 * - No Authorization header → Session cookie path (supabase.auth.getUser with no arg)
 *
 * Pure orchestration — does not create clients or touch the DB beyond auth.getUser.
 * Throws ApiAuthError on invalid API key (caller should return 401).
 */
export async function resolveAuth(req: Request, supabase: AuthClient): Promise<AuthResult> {
  const authHeader = req.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;

  let userId: string | undefined;
  let useServiceClient = false;

  if (bearerToken?.startsWith("prk_")) {
    const apiKeyResult = await validateApiKey(bearerToken);
    if (!apiKeyResult.valid) {
      throw new ApiAuthError(apiKeyResult.error || "Invalid API key");
    }
    userId = apiKeyResult.userId;
    useServiceClient = true;
  } else {
    const {
      data: { user },
    } = bearerToken
      ? await supabase.auth.getUser(bearerToken)
      : await supabase.auth.getUser();
    userId = user?.id;
    if (bearerToken && userId) useServiceClient = true;
  }

  return { userId, bearerToken, useServiceClient };
}
