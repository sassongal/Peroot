/**
 * Strip PostgREST metacharacters from user-supplied values before
 * interpolation into `.or()` / `.filter()` strings.
 *
 * PostgREST treats the following as structural tokens inside filter strings:
 *   . , ( ) * % \ ' : !
 * Plus whitespace and control characters, which can desync the parser's
 * column/operator boundaries (e.g. turn `name.ilike.%foo%` into a
 * multi-operator payload).
 *
 * Preferred usage: avoid `.or(...)` with user input entirely and use
 * typed `.ilike(col, '%x%')` calls instead. This helper exists only for
 * the unavoidable multi-column OR case.
 */
export function escapePostgrestValue(value: string): string {
  return value
    .replace(/[\x00-\x1f\x7f]/g, "") // control chars
    .replace(/[.,()*%\\':!]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
