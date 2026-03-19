/**
 * Strip PostgREST metacharacters from user-supplied values before
 * interpolation into .or() / .filter() strings.
 *
 * These characters are structural in PostgREST filter syntax and
 * allowing them through enables filter injection attacks.
 */
export function escapePostgrestValue(value: string): string {
  return value.replace(/[.,()*%\\']/g, "");
}
