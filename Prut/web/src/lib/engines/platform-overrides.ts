/**
 * Optional per-platform prompt overrides stored in prompt_engines.default_params.platform_overrides.
 * Shape: { [platformKey]: { system_template?: string, user_template?: string } }
 */
type PlatformOverrideEntry = {
  system_template?: string;
  user_template?: string;
};

export function getPlatformOverrides(
  defaultParams: Record<string, unknown> | undefined
): Record<string, PlatformOverrideEntry> | undefined {
  if (!defaultParams || typeof defaultParams !== "object") return undefined;
  const raw = defaultParams.platform_overrides;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  return raw as Record<string, PlatformOverrideEntry>;
}
