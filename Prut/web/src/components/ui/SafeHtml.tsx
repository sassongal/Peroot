import DOMPurify from "isomorphic-dompurify";

const PURIFY_OPTIONS = {
  ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'b', 'i', 'u', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'code', 'img', 'span', 'div', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'hr', 'figure', 'figcaption', 'video', 'source', 'details', 'summary'],
  ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'class', 'id', 'width', 'height', 'loading', 'decoding', 'type', 'controls', 'open'],
};

export function SafeHtml({ html, className, dir }: { html: string; className?: string; dir?: 'rtl' | 'ltr' }) {
  const clean = DOMPurify.sanitize(html, PURIFY_OPTIONS);
  return <div className={className} dir={dir} dangerouslySetInnerHTML={{ __html: clean }} />;
}
