import sanitizeHtml from "sanitize-html";

/**
 * SafeHtml — renders user/AI-generated HTML after sanitizing with sanitize-html.
 *
 * Bundle note: `sanitize-html` adds ~22 KB (minified) to any client component
 * that imports this file. Currently used by:
 *   - blog/[slug]/page.tsx        (Server Component — no client cost)
 *   - ResultSection.tsx            (Client — AI-generated prompt output)
 *   - PersonalLibraryView.tsx      (Client — saved prompt display)
 *   - ContentFactoryTab.tsx        (Client — admin content preview)
 *
 * A lighter alternative (e.g. DOMPurify at ~7 KB) could reduce the client
 * bundle, but sanitize-html's allow-list approach is stricter by default.
 * Not worth changing unless bundle size becomes a priority.
 */
const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ['p', 'br', 'strong', 'em', 'b', 'i', 'u', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'code', 'img', 'span', 'div', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'hr', 'figure', 'figcaption', 'video', 'source', 'details', 'summary'],
  allowedAttributes: {
    a: ['href', 'target', 'rel'],
    img: ['src', 'alt', 'class', 'width', 'height', 'loading', 'decoding'],
    video: ['src', 'controls', 'width', 'height'],
    source: ['src', 'type'],
    details: ['open'],
    '*': ['class', 'id', 'dir'],
  },
};

export function SafeHtml({ html, className, dir }: { html: string; className?: string; dir?: 'rtl' | 'ltr' }) {
  const clean = sanitizeHtml(html, SANITIZE_OPTIONS);
  return <div className={className} dir={dir} dangerouslySetInnerHTML={{ __html: clean }} />;
}
