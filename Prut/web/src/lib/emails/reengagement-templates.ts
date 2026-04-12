/**
 * Re-exports from the new templates directory.
 * Kept for backward compatibility — all imports should migrate to
 * `@/lib/emails/templates` over time.
 */
export { REENGAGEMENT_TEMPLATES } from './templates/reengagement';
// ReengagementTemplate is internal — import directly from ./templates/reengagement if needed
export { churnEmail } from './templates/churn';
