import dynamic from "next/dynamic";

/**
 * SafeHtml -- renders user/AI-generated HTML after sanitizing with sanitize-html.
 *
 * Lazy-loaded via next/dynamic so that `sanitize-html` (~22 KB) is split into
 * its own chunk and excluded from the main client bundle. SSR is preserved
 * (`ssr: true`) so blog pages and other server-rendered routes still get the
 * sanitized HTML in the initial response.
 *
 * Public API is unchanged: <SafeHtml html={...} className={...} dir={...} />
 */
export const SafeHtml = dynamic(() => import("./SafeHtmlInner"), { ssr: true });
