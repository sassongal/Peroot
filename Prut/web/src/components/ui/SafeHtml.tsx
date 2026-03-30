import sanitizeHtml from "sanitize-html";

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
