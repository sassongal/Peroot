import sanitizeHtml from "sanitize-html";
import { VARIABLE_TOKEN_REGEX } from "@/lib/variable-utils";
import { STYLE_TEXT_COLORS, STYLE_HIGHLIGHT_COLORS } from "@/lib/text-utils";

/**
 * Renders the personal library's style tokens ([[c:red]], [[hl:yellow]]) into
 * sanitized HTML.
 *
 * This lives apart from `text-utils` on purpose. `sanitize-html` is ~209kB
 * unminified, and text-utils is imported by HomeClient, PromptInput and
 * ResultSection — so a helper used by exactly one component (the library
 * card's styled preview) was shipping the whole sanitizer to every visitor of
 * the homepage. Keeping it here confines it to the personal library, which is
 * already behind a dynamic import.
 *
 * Do NOT re-export this from text-utils; that would put the dependency back on
 * the homepage's critical path.
 */
const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export const toStyledHtml = (value: string) => {
  const escaped = escapeHtml(value);
  const withTokens = escaped
    .replace(/\[\[c:([a-z]+)\]\]/g, (_, color) => {
      const className = STYLE_TEXT_COLORS[color] ?? STYLE_TEXT_COLORS.slate;
      return `<span class="${className}">`;
    })
    .replace(/\[\[hl:([a-z]+)\]\]/g, (_, color) => {
      const className = STYLE_HIGHLIGHT_COLORS[color] ?? STYLE_HIGHLIGHT_COLORS.yellow;
      return `<span class="${className}">`;
    })
    .replace(/\[\[\/c\]\]/g, "</span>")
    .replace(/\[\[\/hl\]\]/g, "</span>");

  const raw = withTokens
    .replace(
      VARIABLE_TOKEN_REGEX,
      (match) => `<span class="text-amber-300 font-semibold">${match}</span>`,
    )
    .replace(/\n/g, "<br />");

  return sanitizeHtml(raw, {
    allowedTags: ["span", "br"],
    allowedAttributes: { span: ["class"] },
  });
};
