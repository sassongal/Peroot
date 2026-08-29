import { describe, it, expect, vi } from "vitest";
import { validateApiKey, type ApiKeyDb } from "@/lib/api-auth";
import { generateApiKey, hashApiKey } from "@/lib/api-keys";

/** Build an ApiKeyDb mock whose prefix lookup returns the given rows. */
function mockDb(rows: unknown[] | null, error: unknown = null) {
  const update = vi.fn().mockReturnValue({
    eq: vi.fn().mockResolvedValue({ error: null }),
  });
  const db: ApiKeyDb = {
    from: () =>
      ({
        select: () => ({
          eq: () => ({
            eq: () => Promise.resolve({ data: rows, error }),
          }),
        }),
        update,
      }) as unknown as ReturnType<ApiKeyDb["from"]>,
  };
  return { db, update };
}

describe("validateApiKey", () => {
  it("accepts a valid active key and resolves user + key ids", async () => {
    const key = generateApiKey();
    const { db, update } = mockDb([
      { id: "key-1", user_id: "user-1", key_hash: key.hash, is_active: true, expires_at: null },
    ]);

    const res = await validateApiKey(key.raw, db);
    expect(res).toMatchObject({ valid: true, userId: "user-1", keyId: "key-1" });
    // fire-and-forget last_used stamp was attempted
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ last_used_at: expect.any(String) }),
    );
  });

  it("rejects a wrong key that shares the prefix (hash mismatch)", async () => {
    const key = generateApiKey();
    const impostorHash = hashApiKey("prk_live_" + "f".repeat(40));
    const { db } = mockDb([
      { id: "key-1", user_id: "user-1", key_hash: impostorHash, is_active: true, expires_at: null },
    ]);

    const res = await validateApiKey(key.raw, db);
    expect(res.valid).toBe(false);
    expect(res.error).toBe("Invalid API key");
  });

  it("rejects when no active row matches (revoked or unknown)", async () => {
    const key = generateApiKey();
    const { db } = mockDb([]);
    const res = await validateApiKey(key.raw, db);
    expect(res.valid).toBe(false);
  });

  it("rejects an expired key", async () => {
    const key = generateApiKey();
    const { db } = mockDb([
      {
        id: "key-1",
        user_id: "user-1",
        key_hash: key.hash,
        is_active: true,
        expires_at: new Date(Date.now() - 60_000).toISOString(),
      },
    ]);
    const res = await validateApiKey(key.raw, db);
    expect(res).toMatchObject({ valid: false, error: "API key expired" });
  });

  it("accepts a key whose expiry is in the future", async () => {
    const key = generateApiKey();
    const { db } = mockDb([
      {
        id: "key-1",
        user_id: "user-1",
        key_hash: key.hash,
        is_active: true,
        expires_at: new Date(Date.now() + 60_000).toISOString(),
      },
    ]);
    const res = await validateApiKey(key.raw, db);
    expect(res.valid).toBe(true);
  });

  it("rejects malformed keys without touching the DB", async () => {
    const from = vi.fn();
    const db = { from } as unknown as ApiKeyDb;
    for (const bad of ["prk_", "prk_live_short", "sk-nope", "prk_live_" + "Z".repeat(40)]) {
      const res = await validateApiKey(bad, db);
      expect(res.valid).toBe(false);
    }
    expect(from).not.toHaveBeenCalled();
  });

  it("fails closed as a server error when the lookup errors", async () => {
    const key = generateApiKey();
    const { db } = mockDb(null, { message: "boom" });
    const res = await validateApiKey(key.raw, db);
    expect(res).toMatchObject({ valid: false, error: "Key validation unavailable" });
  });
});
