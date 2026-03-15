import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { randomBytes, createHash } from "crypto";
import { logger } from "@/lib/logger";

function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

// GET — list user's API keys
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Auth required" }, { status: 401 });

  const { data: keys, error } = await supabase
    .from("developer_api_keys")
    .select("id, key_prefix, name, scopes, rate_limit, usage_count, last_used_at, is_active, created_at, expires_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    logger.error("[DevKeys] List error:", error);
    return NextResponse.json({ error: "Failed to list keys" }, { status: 500 });
  }

  return NextResponse.json({ keys: keys || [] });
}

// POST — create new API key
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Auth required" }, { status: 401 });

  const { name } = await request.json().catch(() => ({ name: "Default" }));

  // Check limit (max 5 keys per user)
  const { count } = await supabase
    .from("developer_api_keys")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_active", true);

  if ((count ?? 0) >= 5) {
    return NextResponse.json({ error: "Maximum 5 active API keys allowed" }, { status: 400 });
  }

  // Generate key: prk_<32 random hex chars>
  const rawKey = `prk_${randomBytes(16).toString("hex")}`;
  const keyHash = hashKey(rawKey);
  const keyPrefix = rawKey.slice(0, 12);

  const { error } = await supabase
    .from("developer_api_keys")
    .insert({
      user_id: user.id,
      key_hash: keyHash,
      key_prefix: keyPrefix,
      name: name || "Default",
    });

  if (error) {
    logger.error("[DevKeys] Create error:", error);
    return NextResponse.json({ error: "Failed to create key" }, { status: 500 });
  }

  // Return the raw key only once — it won't be shown again
  return NextResponse.json({ key: rawKey, prefix: keyPrefix, name });
}

// DELETE — revoke an API key
export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Auth required" }, { status: 401 });

  const { keyId } = await request.json();
  if (!keyId) return NextResponse.json({ error: "keyId required" }, { status: 400 });

  const { error } = await supabase
    .from("developer_api_keys")
    .update({ is_active: false })
    .eq("id", keyId)
    .eq("user_id", user.id);

  if (error) {
    logger.error("[DevKeys] Revoke error:", error);
    return NextResponse.json({ error: "Failed to revoke key" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
