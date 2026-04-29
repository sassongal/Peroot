import { describe, it, expect } from "vitest";
import { matchHost, resolveSelector } from "../selector-registry.js";

const SAMPLE_REGISTRY = {
  chatgpt: {
    hosts: ["chatgpt.com", "chat.openai.com"],
    input: ["#prompt-textarea"],
    send_button: ["button[data-testid='send-button']"],
    profile_slug: "gpt-5",
  },
  claude: {
    hosts: ["claude.ai"],
    input: ["div.ProseMirror"],
    send_button: ["button[aria-label='Send Message']"],
    profile_slug: "claude-sonnet-4",
  },
  gemini: {
    hosts: ["gemini.google.com"],
    input: ["input-area-v2 .ql-editor"],
    send_button: ["button[aria-label*='Send' i]"],
    profile_slug: "gemini-2.5",
  },
};

describe("matchHost", () => {
  it("matches chatgpt.com", () => {
    expect(matchHost("chatgpt.com", SAMPLE_REGISTRY)).toEqual({
      siteKey: "chatgpt",
      site: SAMPLE_REGISTRY.chatgpt,
    });
  });

  it("matches chat.openai.com (alias)", () => {
    expect(matchHost("chat.openai.com", SAMPLE_REGISTRY)).toEqual({
      siteKey: "chatgpt",
      site: SAMPLE_REGISTRY.chatgpt,
    });
  });

  it("matches claude.ai", () => {
    expect(matchHost("claude.ai", SAMPLE_REGISTRY).siteKey).toBe("claude");
  });

  it("returns null for unknown host", () => {
    expect(matchHost("example.com", SAMPLE_REGISTRY)).toBeNull();
  });

  it("returns null for empty registry", () => {
    expect(matchHost("chatgpt.com", {})).toBeNull();
  });

  it("treats www. prefix as equivalent", () => {
    expect(matchHost("www.chatgpt.com", SAMPLE_REGISTRY).siteKey).toBe("chatgpt");
  });

  it("is case-insensitive", () => {
    expect(matchHost("Chatgpt.COM", SAMPLE_REGISTRY).siteKey).toBe("chatgpt");
  });
});

describe("resolveSelector", () => {
  function makeDoc(html) {
    if (typeof document === "undefined") {
      return {
        querySelector: (sel) => {
          const idMatch = /^#([\w-]+)$/.exec(sel);
          if (idMatch && html.includes(`id="${idMatch[1]}"`)) {
            return { id: idMatch[1] };
          }
          const attrMatch = /^([\w-]+)\[([\w-]+)="([^"]+)"\]$/.exec(sel);
          if (
            attrMatch &&
            html.includes(`<${attrMatch[1]}`) &&
            html.includes(`${attrMatch[2]}="${attrMatch[3]}"`)
          ) {
            return { tag: attrMatch[1] };
          }
          return null;
        },
      };
    }
    const doc = document.implementation.createHTMLDocument();
    doc.body.innerHTML = html;
    return doc;
  }

  it("returns first matching selector and index 0", () => {
    const doc = makeDoc('<input id="prompt-textarea" />');
    const { el, index } = resolveSelector(["#prompt-textarea", "#fallback"], doc);
    expect(el).toBeTruthy();
    expect(index).toBe(0);
  });

  it("falls back to second selector when first misses", () => {
    const doc = makeDoc('<button data-testid="send-button">x</button>');
    const { el, index } = resolveSelector(
      ["#missing", 'button[data-testid="send-button"]'],
      doc,
    );
    expect(el).toBeTruthy();
    expect(index).toBe(1);
  });

  it("returns null el and index -1 when all selectors miss", () => {
    const doc = makeDoc("<div></div>");
    const { el, index } = resolveSelector(["#a", "#b"], doc);
    expect(el).toBeNull();
    expect(index).toBe(-1);
  });

  it("survives invalid selectors and continues", () => {
    const doc = makeDoc('<input id="x" />');
    const { el, index } = resolveSelector(["::::invalid:::", "#x"], doc);
    expect(el).toBeTruthy();
    expect(index).toBe(1);
  });

  it("returns -1 for non-array chain", () => {
    const doc = makeDoc("<div></div>");
    expect(resolveSelector(null, doc)).toEqual({ el: null, index: -1 });
  });

  it("returns -1 for null doc", () => {
    expect(resolveSelector(["#x"], null)).toEqual({ el: null, index: -1 });
  });
});
