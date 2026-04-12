import { ReactNode, Fragment } from "react";
import sanitizeHtml from "sanitize-html";
import { cn } from "@/lib/utils";
import { VARIABLE_TOKEN_REGEX, extractVariables, getVariableLabel } from "@/lib/variable-utils";

/**
 * Placeholder rendering uses `VARIABLE_TOKEN_REGEX` from `@/lib/variable-utils`.
 * `extractPlaceholders` is an alias for `extractVariables` for older imports.
 */
const PLACEHOLDER_REGEX = VARIABLE_TOKEN_REGEX;
export const extractPlaceholders = extractVariables;

/**
 * Render a prompt string into React nodes with visually distinct treatment
 * for every `{token}` placeholder:
 *
 *   - Unfilled token → sky-blue chip showing the Hebrew label (from the
 *     variable registry, see `getVariableLabel`). The user never sees raw
 *     English snake_case in the rendered prompt.
 *   - Filled token → emerald-tinted inline mark showing the typed value.
 *     This gives instant visual confirmation that a variable has been
 *     bound without the user having to scroll up to the input panel.
 *
 * Colors match the input-side styling in `highlightTextWithPlaceholders`
 * (sky blue) so the prompt feels continuous from input → result. Emerald
 * is used only for the "already filled" state, following the pattern
 * already in use elsewhere in the app for success/bound states.
 *
 * The function is side-effect-free and memoization-friendly — callers
 * should wrap the call in `useMemo(..., [text, values])`.
 */
interface RenderPromptOptions {
    /**
     * The variable key currently hovered in the Variables Panel input
     * column. When set, the matching chip/mark in the rendered prompt
     * gets a stronger ring so the user can visually trace
     * input ↔ prompt position. Used by ResultSection.
     */
    hoveredKey?: string | null;
    /**
     * Callback fired when the user hovers a chip/mark inside the
     * rendered prompt. Lets the parent ResultSection sync the highlight
     * back to the matching input row in the Variables Panel.
     */
    onHoverKey?: (key: string | null) => void;
}

export function renderPromptWithVariables(
    text: string,
    values: Record<string, string | undefined> = {},
    options: RenderPromptOptions = {}
): ReactNode[] {
    if (!text) return [];

    const { hoveredKey = null, onHoverKey } = options;

    // Clone the global regex into a local one so concurrent callers don't
    // share `lastIndex` state. matchAll would also work but we need the
    // per-match index for slicing gaps.
    const regex = new RegExp(VARIABLE_TOKEN_REGEX.source, "g");
    const parts: ReactNode[] = [];
    let cursor = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
        const [full, rawKey] = match;
        const start = match.index;

        // Emit the plain-text gap leading up to this match.
        if (start > cursor) {
            parts.push(
                <Fragment key={`txt-${cursor}`}>{text.slice(cursor, start)}</Fragment>
            );
        }

        const key = rawKey.trim();
        const value = values[key]?.trim();
        const isHovered = hoveredKey === key;

        // Hover handlers — only attached when the parent provided an
        // onHoverKey callback. Otherwise the chips behave as before.
        const hoverProps = onHoverKey
            ? {
                  onMouseEnter: () => onHoverKey(key),
                  onMouseLeave: () => onHoverKey(null),
              }
            : {};

        if (value) {
            // Filled: show the user's value prominently so they can
            // read the prompt as it will actually run.
            parts.push(
                <mark
                    key={`v-${start}-${key}`}
                    data-var-key={key}
                    className={cn(
                        "rounded-md bg-emerald-500/10 dark:bg-emerald-400/10 border text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 font-semibold transition-all",
                        isHovered
                            ? "border-emerald-500 dark:border-emerald-400 ring-2 ring-emerald-500/40 dark:ring-emerald-400/40"
                            : "border-emerald-500/30 dark:border-emerald-400/30"
                    )}
                    title={`${getVariableLabel(key)}: ${value}`}
                    {...hoverProps}
                >
                    {value}
                </mark>
            );
        } else {
            // Unfilled: show the Hebrew label wrapped in curly braces.
            // The outer span is forced to dir="ltr" so the `{` and `}`
            // characters never get re-ordered by the BiDi algorithm in
            // RTL parents — without this, in a Hebrew-direction container
            // the brackets can flip to the wrong sides because they are
            // BiDi neutrals adjacent to strong-RTL Hebrew text. The inner
            // span carries dir="rtl" so the Hebrew label itself still
            // reads in its natural direction.
            parts.push(
                <span
                    key={`p-${start}-${key}`}
                    data-var-key={key}
                    dir="ltr"
                    className={cn(
                        "inline-flex items-center rounded-md bg-sky-500/10 dark:bg-sky-400/10 border text-sky-700 dark:text-sky-300 px-1.5 py-0.5 font-medium whitespace-nowrap transition-all",
                        isHovered
                            ? "border-sky-500 dark:border-sky-400 ring-2 ring-sky-500/40 dark:ring-sky-400/40"
                            : "border-sky-500/40 dark:border-sky-400/40"
                    )}
                    title={key}
                    {...hoverProps}
                >
                    <span aria-hidden="true">{"{"}</span>
                    <span dir="rtl" className="px-0.5">
                        {getVariableLabel(key)}
                    </span>
                    <span aria-hidden="true">{"}"}</span>
                </span>
            );
        }

        cursor = start + full.length;
    }

    if (cursor < text.length) {
        parts.push(<Fragment key={`txt-${cursor}`}>{text.slice(cursor)}</Fragment>);
    }

    return parts;
}

/**
 * Live highlighting for the input textarea side. Renders `{token}`
 * placeholders and `[header]` section markers as colored chips so the
 * user can see structure as they type.
 *
 * Uses the canonical VARIABLE_TOKEN_REGEX for the `{token}` part so the
 * input side rejects JSON-shaped braces the same way the output side
 * does — pasting a JSON snippet into the input field no longer produces
 * mis-highlighted "placeholder" chips around object bodies.
 *
 * Color tokens match `renderPromptWithVariables` (sky-blue chips) so
 * the visual treatment is continuous from input → result.
 */
export const highlightTextWithPlaceholders = (text: string): ReactNode[] => {
  // Combine the strict variable regex with the section-header regex.
  // Both alternatives carry their own capture groups so we can tell
  // them apart by which one matched.
  const variableSource = VARIABLE_TOKEN_REGEX.source; // \{(...)\}
  const COMBINED_REGEX = new RegExp(`${variableSource}|(\\[[^\\]\\n]+\\])`, "g");
  const matches = Array.from(text.matchAll(COMBINED_REGEX));
  if (matches.length === 0) return [text];

  const parts: ReactNode[] = [];
  let cursor = 0;
  matches.forEach((match, index) => {
    const start = match.index ?? 0;
    if (start > cursor) {
      parts.push(text.slice(cursor, start));
    }
    const token = match[0];
    const headerMatch = match[2]; // group 2 = the [header] alternative
    const isHeader = !!headerMatch;

    if (isHeader) {
      parts.push(
        <span
          key={`header-${start}-${index}`}
          className="text-amber-600 dark:text-amber-400 font-bold"
        >
          {token}
        </span>
      );
    } else {
      parts.push(
        <span
          key={`ph-${start}-${index}`}
          className="inline-flex items-center rounded-md bg-sky-500/10 dark:bg-sky-400/10 border border-sky-500/40 dark:border-sky-400/40 text-sky-700 dark:text-sky-300 px-1.5 py-0.5 text-[0.85em] font-medium whitespace-nowrap"
        >
          {token}
        </span>
      );
    }
    cursor = start + token.length;
  });
  if (cursor < text.length) {
    parts.push(text.slice(cursor));
  }
  return parts;
};

const STYLE_TOKEN_REGEX = /\[\[(\/?)(c|hl)(?::([a-z]+))?\]\]/g;

export const STYLE_TEXT_COLORS: Record<string, string> = {
  red: "text-red-300",
  amber: "text-amber-300",
  emerald: "text-emerald-300",
  blue: "text-amber-300",
  violet: "text-violet-300",
  slate: "text-slate-200",
};

export const STYLE_HIGHLIGHT_COLORS: Record<string, string> = {
  yellow: "bg-yellow-400/20 text-yellow-200",
  pink: "bg-pink-400/20 text-pink-200",
  green: "bg-emerald-400/20 text-emerald-200",
  blue: "bg-sky-400/20 text-sky-200",
  violet: "bg-violet-400/20 text-violet-200",
};

export const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Pattern-based example values for variable names (personal library filler, etc.). */
const PLACEHOLDER_SUGGESTIONS: Array<{ pattern: RegExp; suggestions: string[] }> = [
  { pattern: /קהל|audience|persona/i, suggestions: ["מנהלי שיווק B2B", "בעלי עסקים קטנים", "סטודנטים"] },
  { pattern: /מטרה|goal|objective|יעד/i, suggestions: ["להגדיל הרשמות", "לשכנע לרכישה", "להסביר תהליך"] },
  { pattern: /פורמט|format|מבנה|output/i, suggestions: ["רשימה של 5 נקודות", "טבלה קצרה", "פסקה אחת"] },
  { pattern: /טון|tone|סגנון|style/i, suggestions: ["אסרטיבי", "ידידותי", "מקצועי"] },
  { pattern: /ערוץ|channel|פלטפורמה|platform/i, suggestions: ["לינקדאין", "מייל", "וואטסאפ"] },
  { pattern: /זמן|timeline|תאריך|דדליין/i, suggestions: ["שבועיים", "עד יום חמישי", "סוף החודש"] },
  { pattern: /תקציב|budget/i, suggestions: ["₪2,000", "₪10,000", "גמיש"] },
];

/** Suggested example strings for a `{variable}` name — used by VariableFiller quick chips. */
export function getPlaceholderSuggestions(placeholder: string): string[] {
  const normalized = placeholder.toLowerCase();
  const match = PLACEHOLDER_SUGGESTIONS.find((p) => p.pattern.test(normalized));
  return match ? match.suggestions : [];
}

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export const stripStyleTokens = (value: string) =>
  value.replace(STYLE_TOKEN_REGEX, "");

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
    .replace(PLACEHOLDER_REGEX, (match) => `<span class="text-amber-300 font-semibold">${match}</span>`)
    .replace(/\n/g, "<br />");

  return sanitizeHtml(raw, {
    allowedTags: ['span', 'br'],
    allowedAttributes: { span: ['class'] },
  });
};
