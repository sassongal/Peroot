import type { User } from "@supabase/supabase-js";

/**
 * Best-effort avatar URL from Supabase user + OAuth identities.
 * Pass `profileAvatarUrl` when `profiles.avatar_url` (or similar) exists.
 */
export function resolveAvatarUrl(
  user: User | null | undefined,
  profileAvatarUrl?: string | null
): string | undefined {
  if (!user) return undefined;
  const meta = user.user_metadata || {};
  const fromMeta =
    (typeof meta.avatar_url === "string" && meta.avatar_url) ||
    (typeof meta.picture === "string" && meta.picture) ||
    (typeof meta.avatar === "string" && meta.avatar) ||
    (typeof meta.image === "string" && meta.image);

  const id = user.identities?.[0]?.identity_data as
    | { avatar_url?: string; picture?: string }
    | undefined;
  const fromIdentity =
    (id?.avatar_url && String(id.avatar_url)) ||
    (id?.picture && String(id.picture)) ||
    undefined;

  const resolved =
    (typeof profileAvatarUrl === "string" && profileAvatarUrl.trim()) ||
    fromMeta ||
    fromIdentity;

  return resolved || undefined;
}

export function avatarFallbackUrl(user: User | null | undefined): string | undefined {
  if (!user) return undefined;
  const meta = user.user_metadata || {};
  const name =
    (typeof meta.full_name === "string" && meta.full_name.trim()) ||
    user.email ||
    "U";
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=f59e0b&color=fff&bold=true`;
}
