/**
 * Memory injection feature flags.
 *
 * These let us A/B test (and instantly kill-switch) the L2/L3
 * personalization layers in the enhance route without a code deploy.
 *
 * Default behavior: all injections ENABLED. Setting any flag below to "1"
 * in the environment turns the corresponding layer off. The cautious
 * defaults exist because the layers were already running in production
 * silently — disabling them is the reversible operation, not enabling.
 *
 * The "history source" flag is a forward switch: set to "1" to fetch the
 * 3 most recent successful enhances from the `history` table (which
 * contains both `prompt` and `enhanced_prompt`, letting the model see
 * before→after pairs) instead of the legacy use_count-ordered fetch from
 * `personal_library` (which only contains the original prompt).
 */

function readBoolFlag(name: string, defaultValue: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return defaultValue;
  return raw === '1' || raw.toLowerCase() === 'true';
}

export const memoryFlags = {
  /** L3 — inject `[USER_PERSONALITY_TRAITS]` block. Default: ON. */
  get personalityEnabled(): boolean {
    return !readBoolFlag('PEROOT_DISABLE_PERSONALITY_INJECTION', false);
  },
  /** L2 — inject `[USER_STYLE_CONTEXT]` block. Default: ON. */
  get historyEnabled(): boolean {
    return !readBoolFlag('PEROOT_DISABLE_HISTORY_INJECTION', false);
  },
  /**
   * Use the `history` table (recent successful enhances with
   * `enhanced_prompt`) instead of the legacy `personal_library` use_count
   * fetch. Default: ON — this strictly upgrades data quality. Set
   * `PEROOT_LEGACY_HISTORY_RECALL=1` to revert without a deploy.
   */
  get useHistoryTableForRecall(): boolean {
    return !readBoolFlag('PEROOT_LEGACY_HISTORY_RECALL', false);
  },
};
