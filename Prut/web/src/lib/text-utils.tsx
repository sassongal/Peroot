import { ReactNode, Children, isValidElement, cloneElement, ReactElement } from "react";

export const PLACEHOLDER_REGEX = /{[^}]+}/g;

export const extractPlaceholders = (text: string): string[] => {
  const matches = text.match(PLACEHOLDER_REGEX) || [];
  const unique = new Set(matches.map((match) => match.replace(/[{}]/g, "").trim()));
  return Array.from(unique).filter(Boolean);
};

export const highlightTextWithPlaceholders = (text: string): ReactNode[] => {
  const COMBINED_REGEX = /{[^}]+}|\[[^\]]+\]/g;
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
    const isHeader = token.startsWith("[");
    
    if (isHeader) {
      parts.push(
        <span
          key={`header-${start}-${index}`}
          className="text-yellow-400 font-bold"
        >
          {token}
        </span>
      );
    } else {
      parts.push(
        <span
          key={`ph-${start}-${index}`}
          className="inline-flex items-center rounded-md border border-sky-400/40 bg-sky-400/10 px-1.5 py-0.5 text-[0.8em] text-sky-200"
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

export const highlightPlaceholders = (children: ReactNode): ReactNode =>
  Children.map(children, (child) => {
    if (typeof child === "string") return highlightTextWithPlaceholders(child);
    if (isValidElement(child)) {
      const nodeType = child.type;
      if (typeof nodeType === "string" && (nodeType === "code" || nodeType === "pre")) {
        return child;
      }
      if ((child as any).props?.children) {
        return cloneElement(child as ReactElement<any>, {
          ...(child as any).props,
          children: highlightPlaceholders((child as any).props.children),
        });
      }
    }
    return child;
  });

const PLACEHOLDER_SUGGESTIONS: Array<{ pattern: RegExp; suggestions: string[] }> = [
  { pattern: /קהל|audience|persona/i, suggestions: ["מנהלי שיווק B2B", "בעלי עסקים קטנים", "סטודנטים"] },
  { pattern: /מטרה|goal|objective|יעד/i, suggestions: ["להגדיל הרשמות", "לשכנע לרכישה", "להסביר תהליך"] },
  { pattern: /פורמט|format|מבנה|output/i, suggestions: ["רשימה של 5 נקודות", "טבלה קצרה", "פסקה אחת"] },
  { pattern: /טון|tone|סגנון|style/i, suggestions: ["אסרטיבי", "ידידותי", "מקצועי"] },
  { pattern: /ערוץ|channel|פלטפורמה|platform/i, suggestions: ["לינקדאין", "מייל", "וואטסאפ"] },
  { pattern: /זמן|timeline|תאריך|דדליין/i, suggestions: ["שבועיים", "עד יום חמישי", "סוף החודש"] },
  { pattern: /תקציב|budget/i, suggestions: ["₪2,000", "₪10,000", "גמיש"] },
];

export const getPlaceholderSuggestions = (placeholder: string): string[] => {
  const normalized = placeholder.toLowerCase();
  const match = PLACEHOLDER_SUGGESTIONS.find((p) => p.pattern.test(normalized));
  return match ? match.suggestions : [];
};

export const STYLE_TOKEN_REGEX = /\[\[(\/?)(c|hl)(?::([a-z]+))?\]\]/g;

export const STYLE_TEXT_COLORS: Record<string, string> = {
  red: "text-red-300",
  amber: "text-amber-300",
  emerald: "text-emerald-300",
  blue: "text-sky-300",
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

export const escapeHtml = (value: string) =>
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

  return withTokens
    .replace(PLACEHOLDER_REGEX, (match) => `<span class="text-sky-300 font-semibold">${match}</span>`)
    .replace(/\n/g, "<br />");
};

import DOMPurify from "isomorphic-dompurify";

// Styled prompt rendering for the ResultSection with yellow headers and blue variables
export const renderStyledPrompt = (value: string): string => {
  // Sanitize input to prevent XSS before any manipulation
  let html = DOMPurify.sanitize(value);
  html = escapeHtml(html);
  
  // Style section headers in brackets [כותרת] or [Title] with amber/orange
  html = html.replace(
    /\[([^\]]+)\]/g,
    '<span class="text-amber-500 font-black text-lg tracking-tight bg-amber-500/5 px-2 py-0.5 rounded-lg border border-amber-500/20">[$1]</span>'
  );
  
  // Style variables {variable_name} with blue
  html = html.replace(
    /\{([^}]+)\}/g,
    '<span class="text-sky-400 font-semibold bg-sky-900/30 px-1.5 py-0.5 rounded border border-sky-400/30 whitespace-nowrap shadow-[0_0_15px_rgba(56,189,248,0.1)]">{$1}</span>'
  );
  
  // Convert bullet points to styled bullets
  html = html.replace(
    /^[•\-]\s*/gm,
    '<span class="text-purple-400 mr-2">•</span>'
  );
  
  // Add proper line breaks and spacing
  html = html
    .replace(/\n\n/g, '</p><p class="mt-4">')
    .replace(/\n/g, '<br />');
  
  return `<p>${html}</p>`;
};

