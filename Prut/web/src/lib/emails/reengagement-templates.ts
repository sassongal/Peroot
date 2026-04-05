/**
 * Re-exports from the new templates directory.
 * Kept for backward compatibility — all imports should migrate to
 * `@/lib/emails/templates` over time.
 */
export { REENGAGEMENT_TEMPLATES } from './templates/reengagement';
export type { ReengagementTemplate } from './templates/reengagement';
export { churnEmail } from './templates/churn';
