/**
 * Single JSON-LD script element for schema.org (and similar) structured data.
 * Escapes </script> sequences to prevent premature tag closure.
 */
export function JsonLd({ data }: { data: unknown }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
