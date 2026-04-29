# Extension v2.0.0 — M3: Selector Registry & Site Cuts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Chrome Extension v2.0.0 — drop the 7 long-tail AI sites, replace hardcoded selectors with a server-driven registry fetched from `/api/extension-config`, add target-model auto-detect with manual override, fire telemetry beacons on selector misses and key UX events, and surface a score-gate hint in the popup.

**Architecture:** A new pure-JS `selector-registry.js` module loads config from `chrome.storage.local` (refreshed by the service worker on install + every 24h alarm). The injector reads selectors and the host-matched `profile_slug` from the registry instead of a hardcoded `SITES` map. The popup adds a target-model dropdown that overrides the auto-detected slug and persists per-host. Every `/api/enhance` call passes `model_profile_slug`. A thin `lib/telemetry.js` wrapper fires fire-and-forget POSTs to `/api/extension-telemetry`.

**Tech Stack:** Manifest v3 Chrome extension (plain JS, no build step), Vitest (with `*.test.js` glob added) for pure-utility tests, existing peroot.space M1+M2 backend (commit `24a47dc` in production: `/api/extension-config`, `/api/extension-telemetry`, `/api/enhance` with `model_profile_slug` + `X-Peroot-Cache: score-gate` header).

**Source spec:** `docs/superpowers/specs/2026-04-29-extension-v2-model-aware-design.md` §3.4, §5.1–§5.5, §10 (M3 row), §12.

---

## File Structure

**Create:**
- `chrome-extension-v2.1/lib/selector-registry.js` — pure utility: `matchHost(hostname, registry)`, `resolveSelector(chain, doc)`, dual export (window + CommonJS for vitest).
- `chrome-extension-v2.1/lib/telemetry.js` — `fireTelemetry(event, payload)` via `chrome.runtime.sendMessage({ type: "API_FETCH", path: "/api/extension-telemetry", method: "POST", body: {...} })`.
- `chrome-extension-v2.1/lib/__tests__/selector-registry.test.js` — Vitest tests for pure utilities.
- `chrome-extension-v2.1/lib/config-store.js` — `getConfig()`, `setConfig(cfg)`, `refreshConfig()` thin wrappers around `chrome.storage.local` keyed `peroot.extension_config`.
- `chrome-extension-v2.1/lib/target-model.js` — `getTargetModel(host, registry)`, `setTargetModelOverride(host, slug)`, `clearTargetModelOverride(host)`.

**Modify:**
- `chrome-extension-v2.1/manifest.json` — version 1.3.0→2.0.0; remove DeepSeek/Perplexity/Mistral/Minimaxi/Grok/Copilot/Poe from `host_permissions`, `content_scripts.matches`, and `web_accessible_resources.matches`. Inject `lib/selector-registry.js`, `lib/telemetry.js`, `lib/config-store.js`, `lib/target-model.js` ahead of `content/ai-chat-injector.js`.
- `chrome-extension-v2.1/background/service-worker.js` — add config bootstrap on `onInstalled`, daily `chrome.alarms` for refresh, message handler `REFRESH_CONFIG`.
- `chrome-extension-v2.1/content/ai-chat-injector.js` — replace hardcoded `SITES` map with registry lookup; on full selector miss fire `selector_miss` telemetry; pass `model_profile_slug` on every `/api/enhance` call.
- `chrome-extension-v2.1/popup/popup.html` — add target-model row with dropdown + score-gate hint container.
- `chrome-extension-v2.1/popup/popup.js` — wire dropdown to `target-model.js`; pass `model_profile_slug` on enhance; show "✨ הפרומפט שלך כבר חזק" hint when response has `X-Peroot-Cache: score-gate`.
- `chrome-extension-v2.1/popup/popup.css` — styles for new elements.
- `chrome-extension-v2.1/popup/options.html` — add "Refresh config now" button.
- `vitest.config.ts` — add `**/*.test.js` to `include`.

---

## Task 1: Add `*.test.js` to vitest include

**Files:**
- Modify: `vitest.config.ts:11`

- [ ] **Step 1: Update include glob**

Replace:

```ts
    include: ['**/*.test.ts', '**/*.test.tsx'],
```

with:

```ts
    include: ['**/*.test.ts', '**/*.test.tsx', '**/*.test.js'],
```

- [ ] **Step 2: Verify vitest still loads**

Run: `npm run test -- --run --reporter=basic 2>&1 | tail -5`
Expected: existing test suite passes (no `.test.js` files exist yet, no behavior change).

- [ ] **Step 3: Commit**

```bash
git add vitest.config.ts
git commit -m "test(ext): include *.test.js in vitest glob for extension utility tests"
```

---

## Task 2: Pure host-matcher utility (TDD)

**Files:**
- Create: `chrome-extension-v2.1/lib/selector-registry.js`
- Create: `chrome-extension-v2.1/lib/__tests__/selector-registry.test.js`

- [ ] **Step 1: Write failing test for `matchHost`**

Create `chrome-extension-v2.1/lib/__tests__/selector-registry.test.js`:

```js
const { describe, it, expect } = require("vitest");
const { matchHost, resolveSelector } = require("../selector-registry");

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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- --run chrome-extension-v2.1/lib/__tests__/selector-registry.test.js 2>&1 | tail -20`
Expected: FAIL — `Cannot find module '../selector-registry'`.

- [ ] **Step 3: Implement `selector-registry.js` minimally**

Create `chrome-extension-v2.1/lib/selector-registry.js`:

```js
/**
 * Peroot Extension — Selector Registry (M3)
 *
 * Pure utilities for host-to-site matching and selector chain resolution.
 * No DOM access in `matchHost`; `resolveSelector` takes the `doc` as an arg
 * for testability.
 *
 * Dual export: attaches to `window.PerootSelectorRegistry` for content scripts,
 * exports CommonJS for vitest.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    root.PerootSelectorRegistry = api;
  }
})(typeof self !== "undefined" ? self : this, function () {
  function normalizeHost(h) {
    if (!h) return "";
    return String(h).toLowerCase().replace(/^www\./, "");
  }

  function matchHost(hostname, registry) {
    const norm = normalizeHost(hostname);
    if (!norm || !registry || typeof registry !== "object") return null;
    for (const siteKey of Object.keys(registry)) {
      const site = registry[siteKey];
      const hosts = Array.isArray(site?.hosts) ? site.hosts : [];
      for (const h of hosts) {
        if (normalizeHost(h) === norm) {
          return { siteKey, site };
        }
      }
    }
    return null;
  }

  function resolveSelector(chain, doc) {
    if (!Array.isArray(chain) || !doc) return { el: null, index: -1 };
    for (let i = 0; i < chain.length; i++) {
      try {
        const el = doc.querySelector(chain[i]);
        if (el) return { el, index: i };
      } catch {
        // Invalid selector — try next
      }
    }
    return { el: null, index: -1 };
  }

  return { matchHost, resolveSelector, normalizeHost };
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- --run chrome-extension-v2.1/lib/__tests__/selector-registry.test.js 2>&1 | tail -10`
Expected: PASS, 7 tests.

- [ ] **Step 5: Add failing test for `resolveSelector`**

Append to `chrome-extension-v2.1/lib/__tests__/selector-registry.test.js`:

```js
describe("resolveSelector", () => {
  function makeDoc(html) {
    if (typeof document === "undefined") {
      // Vitest node env — use a minimal fake
      return {
        querySelector: (sel) => {
          // very small matcher: id (#x), tag (a), class (.x), attribute ([k="v"])
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
      ["#missing", "button[data-testid=\"send-button\"]"],
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
```

- [ ] **Step 6: Run test to verify all pass**

Run: `npm run test -- --run chrome-extension-v2.1/lib/__tests__/selector-registry.test.js 2>&1 | tail -10`
Expected: PASS, 13 tests total.

- [ ] **Step 7: Commit**

```bash
git add chrome-extension-v2.1/lib/selector-registry.js chrome-extension-v2.1/lib/__tests__/selector-registry.test.js
git commit -m "feat(ext): selector registry with host matcher and chain resolver (M3)"
```

---

## Task 3: Config store wrapper

**Files:**
- Create: `chrome-extension-v2.1/lib/config-store.js`

- [ ] **Step 1: Implement `config-store.js`**

```js
/**
 * Peroot Extension — Config Store (M3)
 *
 * Thin wrapper around `chrome.storage.local` for the extension config blob
 * (selectors + feature flags + model_profiles list). Read/written from
 * background/service-worker.js and read-only from content scripts.
 *
 * Storage key: `peroot.extension_config`
 * Shape mirrors the GET /api/extension-config response.
 */
(function (root) {
  const STORAGE_KEY = "peroot.extension_config";
  const SITE_URL = "https://www.peroot.space";

  async function getConfig() {
    if (typeof chrome === "undefined" || !chrome.storage?.local) return null;
    return new Promise((resolve) => {
      chrome.storage.local.get(STORAGE_KEY, (data) => {
        resolve(data?.[STORAGE_KEY] || null);
      });
    });
  }

  async function setConfig(cfg) {
    if (typeof chrome === "undefined" || !chrome.storage?.local) return;
    return new Promise((resolve) => {
      chrome.storage.local.set({ [STORAGE_KEY]: cfg, "peroot.extension_config_fetched_at": Date.now() }, resolve);
    });
  }

  async function refreshConfig() {
    try {
      const res = await fetch(`${SITE_URL}/api/extension-config`, {
        method: "GET",
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      if (!res.ok) return { ok: false, status: res.status };
      const cfg = await res.json();
      await setConfig(cfg);
      return { ok: true, cfg };
    } catch (err) {
      return { ok: false, error: String(err?.message || err) };
    }
  }

  const api = { getConfig, setConfig, refreshConfig, STORAGE_KEY };
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    root.PerootConfigStore = api;
  }
})(typeof self !== "undefined" ? self : this);
```

- [ ] **Step 2: Lint check**

Run: `npx eslint chrome-extension-v2.1/lib/config-store.js 2>&1 | tail -10`
Expected: no errors (or pre-existing project rules only — no new violations).

- [ ] **Step 3: Commit**

```bash
git add chrome-extension-v2.1/lib/config-store.js
git commit -m "feat(ext): config store wrapper for /api/extension-config blob"
```

---

## Task 4: Telemetry beacon

**Files:**
- Create: `chrome-extension-v2.1/lib/telemetry.js`

- [ ] **Step 1: Implement `telemetry.js`**

```js
/**
 * Peroot Extension — Telemetry Beacon (M3)
 *
 * Fire-and-forget POST to /api/extension-telemetry. All calls are best-effort
 * and must never block UX or surface errors to the user.
 *
 * Routes through service-worker's API_FETCH handler when called from a content
 * script (avoids CORS quirks); calls fetch directly when invoked from the SW.
 */
(function (root) {
  const SITE_URL = "https://www.peroot.space";
  const EXT_VERSION =
    (typeof chrome !== "undefined" && chrome.runtime?.getManifest?.()?.version) || "unknown";

  function basePayload(extra) {
    return {
      ext_version: EXT_VERSION,
      ts: Date.now(),
      ...extra,
    };
  }

  async function fireTelemetry(event, payload) {
    const body = { event, ...basePayload(payload) };

    // From content script: route through SW to keep cookie auth + avoid CORS.
    if (typeof chrome !== "undefined" && chrome.runtime?.sendMessage && !chrome.tabs) {
      try {
        chrome.runtime.sendMessage({
          type: "API_FETCH",
          path: "/api/extension-telemetry",
          method: "POST",
          body,
        });
      } catch {
        // Service worker may be inactive — drop event.
      }
      return;
    }

    // From service worker / popup: fetch directly.
    try {
      await fetch(`${SITE_URL}/api/extension-telemetry`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        keepalive: true,
      });
    } catch {
      // Ignore — telemetry is best-effort.
    }
  }

  const api = { fireTelemetry };
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    root.PerootTelemetry = api;
  }
})(typeof self !== "undefined" ? self : this);
```

- [ ] **Step 2: Commit**

```bash
git add chrome-extension-v2.1/lib/telemetry.js
git commit -m "feat(ext): telemetry beacon wrapper (M3)"
```

---

## Task 5: Target-model resolver (TDD)

**Files:**
- Create: `chrome-extension-v2.1/lib/target-model.js`
- Create: `chrome-extension-v2.1/lib/__tests__/target-model.test.js`

- [ ] **Step 1: Write failing test**

Create `chrome-extension-v2.1/lib/__tests__/target-model.test.js`:

```js
const { describe, it, expect, beforeEach } = require("vitest");
const { resolveTargetModel } = require("../target-model");

const REGISTRY = {
  chatgpt: { hosts: ["chatgpt.com"], profile_slug: "gpt-5" },
  claude: { hosts: ["claude.ai"], profile_slug: "claude-sonnet-4" },
};

describe("resolveTargetModel", () => {
  it("returns host-matched profile_slug when no override", () => {
    const slug = resolveTargetModel({
      hostname: "chatgpt.com",
      registry: REGISTRY,
      override: null,
    });
    expect(slug).toBe("gpt-5");
  });

  it("returns override when present", () => {
    const slug = resolveTargetModel({
      hostname: "chatgpt.com",
      registry: REGISTRY,
      override: "claude-sonnet-4",
    });
    expect(slug).toBe("claude-sonnet-4");
  });

  it("returns null when host unknown and no override", () => {
    const slug = resolveTargetModel({
      hostname: "example.com",
      registry: REGISTRY,
      override: null,
    });
    expect(slug).toBeNull();
  });

  it("override beats unknown host", () => {
    const slug = resolveTargetModel({
      hostname: "example.com",
      registry: REGISTRY,
      override: "gpt-5",
    });
    expect(slug).toBe("gpt-5");
  });

  it("ignores empty-string override", () => {
    const slug = resolveTargetModel({
      hostname: "chatgpt.com",
      registry: REGISTRY,
      override: "",
    });
    expect(slug).toBe("gpt-5");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- --run chrome-extension-v2.1/lib/__tests__/target-model.test.js 2>&1 | tail -10`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `target-model.js`**

Create `chrome-extension-v2.1/lib/target-model.js`:

```js
/**
 * Peroot Extension — Target Model Resolver (M3)
 *
 * Picks the model_profile_slug to send on /api/enhance:
 *   1. Manual override (chrome.storage.local key `peroot.target_model_override.<host>`)
 *   2. Host-matched profile_slug from the registry
 *   3. null (server falls back to default behavior)
 */
(function (root) {
  const OVERRIDE_PREFIX = "peroot.target_model_override.";

  function normalizeHost(h) {
    if (!h) return "";
    return String(h).toLowerCase().replace(/^www\./, "");
  }

  function resolveTargetModel({ hostname, registry, override }) {
    if (override && typeof override === "string" && override.length > 0) {
      return override;
    }
    const norm = normalizeHost(hostname);
    if (!registry || typeof registry !== "object") return null;
    for (const siteKey of Object.keys(registry)) {
      const site = registry[siteKey];
      const hosts = Array.isArray(site?.hosts) ? site.hosts : [];
      if (hosts.some((h) => normalizeHost(h) === norm)) {
        return site?.profile_slug || null;
      }
    }
    return null;
  }

  async function getOverride(hostname) {
    if (typeof chrome === "undefined" || !chrome.storage?.local) return null;
    const key = OVERRIDE_PREFIX + normalizeHost(hostname);
    return new Promise((resolve) => {
      chrome.storage.local.get(key, (data) => resolve(data?.[key] || null));
    });
  }

  async function setOverride(hostname, slug) {
    if (typeof chrome === "undefined" || !chrome.storage?.local) return;
    const key = OVERRIDE_PREFIX + normalizeHost(hostname);
    return new Promise((resolve) => {
      if (!slug) chrome.storage.local.remove(key, resolve);
      else chrome.storage.local.set({ [key]: slug }, resolve);
    });
  }

  const api = { resolveTargetModel, getOverride, setOverride, OVERRIDE_PREFIX };
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    root.PerootTargetModel = api;
  }
})(typeof self !== "undefined" ? self : this);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- --run chrome-extension-v2.1/lib/__tests__/target-model.test.js 2>&1 | tail -10`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add chrome-extension-v2.1/lib/target-model.js chrome-extension-v2.1/lib/__tests__/target-model.test.js
git commit -m "feat(ext): target-model resolver (override → host → null) (M3)"
```

---

## Task 6: Manifest cuts and version bump

**Files:**
- Modify: `chrome-extension-v2.1/manifest.json`

- [ ] **Step 1: Replace manifest contents**

Overwrite `chrome-extension-v2.1/manifest.json` with:

```json
{
  "manifest_version": 3,
  "name": "Peroot - AI Prompt Enhancer",
  "short_name": "Peroot",
  "version": "2.0.0",
  "description": "Enhance prompts on ChatGPT, Claude, and Gemini with model-aware tailoring. Iterative refinement, output language control, and prompt library sync.",
  "homepage_url": "https://www.peroot.space",
  "author": "Peroot by Joyatech",
  "permissions": [
    "contextMenus",
    "activeTab",
    "tabs",
    "storage",
    "scripting",
    "identity",
    "alarms"
  ],
  "host_permissions": [
    "https://peroot.space/*",
    "https://www.peroot.space/*",
    "https://ravinxlujmlvxhgbjxti.supabase.co/*",
    "https://chat.openai.com/*",
    "https://chatgpt.com/*",
    "https://claude.ai/*",
    "https://gemini.google.com/*"
  ],
  "background": {
    "service_worker": "background/service-worker.js"
  },
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "icons/icon-16.png",
      "48": "icons/icon-48.png",
      "128": "icons/icon-128.png"
    },
    "default_title": "Peroot - שדרוג פרומפטים"
  },
  "commands": {
    "_execute_action": {
      "suggested_key": {
        "default": "Alt+P",
        "mac": "Alt+P"
      },
      "description": "Open Peroot popup"
    },
    "enhance-selection": {
      "suggested_key": {
        "default": "Alt+Shift+E",
        "mac": "Alt+Shift+E"
      },
      "description": "Enhance selected text"
    }
  },
  "content_scripts": [
    {
      "matches": [
        "https://peroot.space/*",
        "https://www.peroot.space/*"
      ],
      "js": ["content/auth-sync.js"],
      "run_at": "document_idle"
    },
    {
      "matches": [
        "https://chat.openai.com/*",
        "https://chatgpt.com/*",
        "https://claude.ai/*",
        "https://gemini.google.com/*"
      ],
      "js": [
        "lib/selector-registry.js",
        "lib/config-store.js",
        "lib/target-model.js",
        "lib/telemetry.js",
        "content/ai-chat-injector.js"
      ],
      "css": ["content/ai-chat-injector.css"],
      "run_at": "document_idle"
    }
  ],
  "icons": {
    "16": "icons/icon-16.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  },
  "web_accessible_resources": [
    {
      "resources": ["icons/*.png"],
      "matches": [
        "https://chat.openai.com/*",
        "https://chatgpt.com/*",
        "https://claude.ai/*",
        "https://gemini.google.com/*"
      ]
    }
  ],
  "privacy_policy_url": "https://www.peroot.space/privacy",
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'; base-uri 'self'; frame-ancestors 'none'"
  },
  "options_ui": {
    "page": "popup/options.html",
    "open_in_tab": true
  }
}
```

- [ ] **Step 2: Validate JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('chrome-extension-v2.1/manifest.json','utf8')); console.log('ok')"`
Expected: `ok`.

- [ ] **Step 3: Commit**

```bash
git add chrome-extension-v2.1/manifest.json
git commit -m "feat(ext): bump 1.3.0 to 2.0.0, drop 7 long-tail sites, inject lib/* (M3)"
```

---

## Task 7: Service-worker config bootstrap and refresh alarm

**Files:**
- Modify: `chrome-extension-v2.1/background/service-worker.js`

- [ ] **Step 1: Add `importScripts` and bootstrap logic**

At the top of `chrome-extension-v2.1/background/service-worker.js`, after the existing JSDoc header (above `const SITE_URL`), add:

```js
// ─── Config Bootstrap (M3) ───
try {
  importScripts("../lib/config-store.js", "../lib/telemetry.js");
} catch {
  // importScripts failure: extension is misconfigured. Continue without registry.
}

const CONFIG_REFRESH_ALARM = "peroot-config-refresh";
const CONFIG_REFRESH_PERIOD_MIN = 24 * 60; // 24h

async function bootstrapConfig() {
  if (typeof self.PerootConfigStore?.refreshConfig !== "function") return;
  await self.PerootConfigStore.refreshConfig();
}
```

- [ ] **Step 2: Hook bootstrap into `onInstalled`**

Inside the existing `chrome.runtime.onInstalled.addListener(() => { ... })` block, append (after the existing `chrome.alarms.create("peroot-token-refresh", ...)` line):

```js
  chrome.alarms.create(CONFIG_REFRESH_ALARM, { periodInMinutes: CONFIG_REFRESH_PERIOD_MIN });
  bootstrapConfig();
```

- [ ] **Step 3: Handle the new alarm**

In the existing `chrome.alarms.onAlarm.addListener(async (alarm) => { ... })` block, immediately after `if (alarm.name !== "peroot-token-refresh") return;` REPLACE that line with:

```js
  if (alarm.name === CONFIG_REFRESH_ALARM) {
    await bootstrapConfig();
    return;
  }
  if (alarm.name !== "peroot-token-refresh") return;
```

- [ ] **Step 4: Add `REFRESH_CONFIG` message handler**

In the existing `chrome.runtime.onMessage.addListener((message, sender, sendResponse) => { ... })` block, immediately before the closing `});` of the listener, add:

```js
  if (message.type === "REFRESH_CONFIG") {
    bootstrapConfig().then(() => sendResponse({ ok: true })).catch(() => sendResponse({ ok: false }));
    return true;
  }
```

- [ ] **Step 5: Lint + JSON sanity check**

Run: `npx eslint chrome-extension-v2.1/background/service-worker.js 2>&1 | tail -10`
Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add chrome-extension-v2.1/background/service-worker.js
git commit -m "feat(ext): bootstrap extension-config on install + 24h refresh alarm (M3)"
```

---

## Task 8: Replace hardcoded `SITES` map in injector with registry lookup

**Files:**
- Modify: `chrome-extension-v2.1/content/ai-chat-injector.js`

- [ ] **Step 1: Read current `SITES` block to anchor the diff**

Open `chrome-extension-v2.1/content/ai-chat-injector.js`. Confirm the `const SITES = {` block starts at line 25 and `currentSite` is computed around line 276 with `const currentSite = Object.values(SITES).find(s => s.match());`. Note the line numbers — they anchor the replacement in Step 2.

- [ ] **Step 2: Replace `SITES` map and detection logic**

In `chrome-extension-v2.1/content/ai-chat-injector.js`, locate the block that begins with `const SITES = {` (line ~25) and ends at the matching closing `};` of the SITES object (currently around line ~274 — just before `const currentSite = ...`).

Replace the entire `SITES` definition AND the existing `const currentSite = ...` / `detectedSiteKey = Object.keys(SITES)...` block (lines ~25 through ~290) with:

```js
  // ── Site Detection (M3 — config-driven) ────────────────────────────────────

  // Hardcoded fallback selectors used only on cold start before
  // /api/extension-config has been fetched. These match the seeded server
  // registry rows for the 3 supported sites.
  const FALLBACK_REGISTRY = {
    chatgpt: {
      hosts: ["chatgpt.com", "chat.openai.com"],
      input: [
        "#prompt-textarea",
        "textarea[data-id=\"root\"]",
        "div[contenteditable=\"true\"][id=\"prompt-textarea\"]",
      ],
      send_button: [
        "button[data-testid=\"send-button\"]",
        "button[aria-label=\"Send prompt\"]",
      ],
      composer: ["form.stretch", "form[class*=\"composer\"]", "main form"],
      profile_slug: "gpt-5",
      kind: "text",
    },
    claude: {
      hosts: ["claude.ai"],
      input: [
        "div.ProseMirror[contenteditable=\"true\"]",
        "div[contenteditable=\"true\"][data-placeholder]",
        "fieldset div[contenteditable=\"true\"]",
        "fieldset textarea",
        "textarea",
      ],
      send_button: [
        "button[aria-label=\"Send Message\"]",
        "button[data-testid=\"send-message\"]",
      ],
      composer: ["fieldset", "div[class*=\"composer\"]", "form"],
      profile_slug: "claude-sonnet-4",
      kind: "text",
    },
    gemini: {
      hosts: ["gemini.google.com"],
      input: [
        "input-area-v2 .ql-editor",
        "input-area-v2 div[contenteditable=\"true\"]",
        "rich-textarea .ql-editor",
        "rich-textarea div[contenteditable=\"true\"]",
        "div.ql-editor[contenteditable=\"true\"]",
        "div[contenteditable=\"true\"][aria-label*=\"prompt\" i]",
        "div[contenteditable=\"true\"][aria-label*=\"Enter\" i]",
        "p[data-placeholder]",
        "div[contenteditable=\"true\"]",
      ],
      send_button: [
        "button[aria-label*=\"Send\" i]",
        "button[mattooltip*=\"Send\" i]",
        "button.send-button",
      ],
      composer: ["input-area-v2", "rich-textarea"],
      profile_slug: "gemini-2.5",
      kind: "text",
    },
  };

  function getRegistry(cfg) {
    return cfg?.selectors && Object.keys(cfg.selectors).length > 0
      ? cfg.selectors
      : FALLBACK_REGISTRY;
  }

  // Generic input read/write helpers (replace the per-site getInputText/setInputText).
  function readInputText(el) {
    if (!el) return "";
    if (el.tagName === "TEXTAREA") return el.value;
    if (el.tagName === "P" && el.dataset?.placeholder) {
      const parent = el.closest('[contenteditable="true"]');
      return parent ? parent.innerText?.trim() || "" : el.innerText?.trim() || "";
    }
    return el.innerText?.trim() || el.textContent?.trim() || "";
  }

  function writeInputText(el, text) {
    if (!el) return;
    if (el.tagName === "TEXTAREA") {
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
      if (setter) setter.call(el, text);
      else el.value = text;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      return;
    }
    let target = el;
    if (!target.isContentEditable) {
      target = target.closest('[contenteditable="true"]') || target;
    }
    target.focus();
    document.execCommand("selectAll", false, null);
    document.execCommand("insertText", false, text);
    target.dispatchEvent(new Event("input", { bubbles: true }));
    target.dispatchEvent(new Event("change", { bubbles: true }));
  }

  // Resolve current site against the live registry.
  let detectedSiteKey = null;
  let currentSite = null;
  let activeRegistry = FALLBACK_REGISTRY;

  async function detectSite() {
    const cfg = await (window.PerootConfigStore?.getConfig?.() || Promise.resolve(null));
    activeRegistry = getRegistry(cfg);
    const match = window.PerootSelectorRegistry?.matchHost(location.hostname, activeRegistry);
    if (match) {
      detectedSiteKey = match.siteKey;
      currentSite = match.site;
    } else {
      detectedSiteKey = null;
      currentSite = null;
    }
    return { detectedSiteKey, currentSite };
  }
```

- [ ] **Step 3: Replace inline `currentSite.inputSelector` / `getInputText` / `setInputText` usages**

Search `ai-chat-injector.js` for the remaining call sites of the old per-site shape and migrate them:

| Old | New |
|---|---|
| `currentSite.inputSelector` | use `window.PerootSelectorRegistry.resolveSelector(currentSite.input, document).el` |
| `currentSite.sendButtonSelector` | `window.PerootSelectorRegistry.resolveSelector(currentSite.send_button, document).el` |
| `currentSite.inputArea()` | `window.PerootSelectorRegistry.resolveSelector(currentSite.composer || [], document).el` |
| `currentSite.getInputText(el)` | `readInputText(el)` |
| `currentSite.setInputText(el, t)` | `writeInputText(el, t)` |

For each occurrence:

1. Open the file and locate the call.
2. Replace exactly per the table above.
3. If the old code resolved `inputSelector` via `document.querySelector(currentSite.inputSelector)`, swap to the chain resolver. Wrap the `selector_miss` telemetry around resolver calls that return `index === -1`:

```js
const { el: inputEl, index } = window.PerootSelectorRegistry.resolveSelector(
  currentSite?.input || [],
  document,
);
if (!inputEl && currentSite) {
  window.PerootTelemetry?.fireTelemetry("selector_miss", {
    site: detectedSiteKey,
    selector_kind: "input",
    chain_length: (currentSite.input || []).length,
  });
}
```

Apply the same wrapper for `send_button` and `composer` resolutions where a miss is meaningful.

- [ ] **Step 4: Wire `detectSite()` into init**

Find the existing init block (the place that previously did `const currentSite = Object.values(SITES).find(s => s.match()); if (!currentSite) return;`) and replace with:

```js
  detectSite().then(({ currentSite }) => {
    if (!currentSite) return;
    initInjector(); // existing init function name; keep whatever the file currently calls.
  });
```

If there is no existing `initInjector()` wrapper, wrap the body of the IIFE that ran after `currentSite` resolution into a function `initInjector()` and call it from the `.then()` above.

- [ ] **Step 5: Pass `model_profile_slug` on `/api/enhance` calls**

Find every `chrome.runtime.sendMessage({ type: "API_FETCH", path: "/api/enhance", ... })` (and any direct `fetch(...)` to `/api/enhance`) in this file. Before each call, resolve the slug:

```js
const overrideSlug = await window.PerootTargetModel.getOverride(location.hostname);
const modelProfileSlug = window.PerootTargetModel.resolveTargetModel({
  hostname: location.hostname,
  registry: activeRegistry,
  override: overrideSlug,
});
```

Then merge `model_profile_slug: modelProfileSlug` into the request body alongside existing fields.

- [ ] **Step 6: Manual smoke**

```
1. cd C:\Users\sasso\dev\Peroot\Prut\web
2. Open Chrome → chrome://extensions → Developer mode ON → "Load unpacked" → select chrome-extension-v2.1\
3. Visit chatgpt.com — confirm injector loads (logo button appears near composer).
4. Visit claude.ai — same.
5. Visit gemini.google.com — same.
6. Visit chat.deepseek.com — confirm NO injection (manifest cuts).
7. DevTools console on chatgpt.com — no errors with "Peroot" in stack.
```

- [ ] **Step 7: Commit**

```bash
git add chrome-extension-v2.1/content/ai-chat-injector.js
git commit -m "feat(ext): injector reads selectors from registry; selector_miss telemetry; model_profile_slug on /api/enhance (M3)"
```

---

## Task 9: Popup target-model dropdown + score-gate hint

**Files:**
- Modify: `chrome-extension-v2.1/popup/popup.html`
- Modify: `chrome-extension-v2.1/popup/popup.js`
- Modify: `chrome-extension-v2.1/popup/popup.css`

- [ ] **Step 1: Add target-model row to `popup.html`**

Open `chrome-extension-v2.1/popup/popup.html`. Locate the area where the enhance result panel renders (search for the input/textarea for the prompt-to-enhance — typically a `<textarea id="...">` or similar block). Immediately above the enhance button row, insert:

```html
    <div class="peroot-target-model-row" id="peroot-target-model-row">
      <label class="peroot-target-model-label" for="peroot-target-model-select">
        🎯 משדרג עבור:
      </label>
      <select id="peroot-target-model-select" class="peroot-target-model-select">
        <option value="">(זיהוי אוטומטי)</option>
      </select>
      <span class="peroot-target-model-detected" id="peroot-target-model-detected"></span>
    </div>
    <div class="peroot-score-gate-hint" id="peroot-score-gate-hint" hidden>
      ✨ הפרומפט שלך כבר חזק — דילגנו על AI
    </div>
```

- [ ] **Step 2: Add styles to `popup.css`**

Append to `chrome-extension-v2.1/popup/popup.css`:

```css
.peroot-target-model-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  font-family: 'Alef', system-ui, sans-serif;
  direction: rtl;
  font-size: 13px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 6px;
  margin: 4px 0;
}
.peroot-target-model-label { color: var(--peroot-fg-muted, #9ca3af); white-space: nowrap; }
.peroot-target-model-select {
  flex: 1;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: inherit;
  padding: 4px 8px;
  border-radius: 4px;
  font: inherit;
}
.peroot-target-model-detected {
  font-size: 11px;
  color: var(--peroot-fg-muted, #9ca3af);
  font-style: italic;
}
.peroot-score-gate-hint {
  margin: 6px 0 8px;
  padding: 6px 10px;
  background: rgba(34, 197, 94, 0.12);
  border: 1px solid rgba(34, 197, 94, 0.35);
  color: #86efac;
  border-radius: 6px;
  font-size: 12px;
  font-family: 'Alef', system-ui, sans-serif;
  direction: rtl;
  text-align: center;
}
```

- [ ] **Step 3: Wire up dropdown in `popup.js`**

At the top of `chrome-extension-v2.1/popup/popup.js` (after any existing constants), add:

```js
const PerootPopupTargetModel = (() => {
  const SITE_URL = "https://www.peroot.space";

  async function getCfgFromBackground() {
    return new Promise((resolve) => {
      chrome.storage.local.get("peroot.extension_config", (data) => {
        resolve(data?.["peroot.extension_config"] || null);
      });
    });
  }

  function normalizeHost(h) {
    return String(h || "").toLowerCase().replace(/^www\./, "");
  }

  async function getActiveTabHost() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    try {
      return tab?.url ? new URL(tab.url).hostname : "";
    } catch {
      return "";
    }
  }

  async function getOverride(host) {
    const key = "peroot.target_model_override." + normalizeHost(host);
    return new Promise((resolve) => {
      chrome.storage.local.get(key, (data) => resolve(data?.[key] || null));
    });
  }

  async function setOverride(host, slug) {
    const key = "peroot.target_model_override." + normalizeHost(host);
    return new Promise((resolve) => {
      if (!slug) chrome.storage.local.remove(key, resolve);
      else chrome.storage.local.set({ [key]: slug }, resolve);
    });
  }

  function hostMatchedSlug(host, registry) {
    const norm = normalizeHost(host);
    if (!registry) return null;
    for (const k of Object.keys(registry)) {
      const hosts = (registry[k]?.hosts || []).map(normalizeHost);
      if (hosts.includes(norm)) return registry[k]?.profile_slug || null;
    }
    return null;
  }

  async function init() {
    const select = document.getElementById("peroot-target-model-select");
    const detectedLabel = document.getElementById("peroot-target-model-detected");
    if (!select) return null;

    const cfg = await getCfgFromBackground();
    const profiles = Array.isArray(cfg?.model_profiles) ? cfg.model_profiles : [];
    for (const p of profiles) {
      const opt = document.createElement("option");
      opt.value = p.slug;
      opt.textContent = p.display_name_he || p.displayNameHe || p.display_name || p.slug;
      select.appendChild(opt);
    }

    const host = await getActiveTabHost();
    const detected = hostMatchedSlug(host, cfg?.selectors);
    const override = await getOverride(host);
    select.value = override || "";

    if (detected) {
      const detectedProfile = profiles.find((p) => p.slug === detected);
      const label = detectedProfile?.display_name_he || detectedProfile?.display_name || detected;
      detectedLabel.textContent = `(זיהוי: ${label})`;
    } else {
      detectedLabel.textContent = "";
    }

    select.addEventListener("change", async () => {
      await setOverride(host, select.value || null);
    });

    return { host, registry: cfg?.selectors || null, detected };
  }

  function resolveSlugForRequest(state) {
    const select = document.getElementById("peroot-target-model-select");
    const overrideValue = select?.value || null;
    if (overrideValue) return overrideValue;
    return state?.detected || null;
  }

  function showScoreGateHint() {
    const el = document.getElementById("peroot-score-gate-hint");
    if (el) el.hidden = false;
  }

  function hideScoreGateHint() {
    const el = document.getElementById("peroot-score-gate-hint");
    if (el) el.hidden = true;
  }

  return { init, resolveSlugForRequest, showScoreGateHint, hideScoreGateHint };
})();

let PerootPopupTargetModelState = null;
document.addEventListener("DOMContentLoaded", async () => {
  PerootPopupTargetModelState = await PerootPopupTargetModel.init();
});
```

- [ ] **Step 4: Pass `model_profile_slug` and detect score-gate header**

Find every call in `popup.js` that hits `/api/enhance` (search for `"/api/enhance"`). For each:

1. Before the call, read the slug:

   ```js
   const modelProfileSlug = PerootPopupTargetModel.resolveSlugForRequest(PerootPopupTargetModelState);
   ```

2. Add `model_profile_slug: modelProfileSlug` into the request body alongside existing fields.

3. Hide the hint before each new call:

   ```js
   PerootPopupTargetModel.hideScoreGateHint();
   ```

4. After receiving the response, inspect the `X-Peroot-Cache` header. If the existing call goes through `chrome.runtime.sendMessage({ type: "API_FETCH", ..., stream: true })`, the SW returns `{ ok, status, text }` — there is currently no header surfaced. To wire the header:

   - In `chrome-extension-v2.1/background/service-worker.js`, locate the `API_FETCH` handler (the streaming branch around line 217). Replace:

     ```js
         if (message.stream) {
           const text = await res.text();
           sendResponse({ ok: res.ok, status: res.status, text });
         } else {
     ```

     with:

     ```js
         const cacheHeader = res.headers.get("X-Peroot-Cache") || null;
         if (message.stream) {
           const text = await res.text();
           sendResponse({ ok: res.ok, status: res.status, text, cacheHeader });
         } else {
     ```

     and update the non-streaming branch immediately below to also include `cacheHeader`:

     ```js
           const data = await res.json().catch(() => null);
           sendResponse({ ok: res.ok, status: res.status, data, cacheHeader });
     ```

   - In `popup.js`, after the response resolves:

     ```js
     if (response?.cacheHeader === "score-gate") {
       PerootPopupTargetModel.showScoreGateHint();
     }
     ```

- [ ] **Step 5: Add Refresh-config button to options.html**

Open `chrome-extension-v2.1/popup/options.html`. Append before the closing `</body>` tag:

```html
    <div class="peroot-options-row">
      <button id="peroot-refresh-config" class="peroot-options-button">רענן הגדרות מהשרת</button>
      <span id="peroot-refresh-config-status"></span>
    </div>
    <script>
      document.getElementById("peroot-refresh-config").addEventListener("click", () => {
        const status = document.getElementById("peroot-refresh-config-status");
        status.textContent = "מרענן…";
        chrome.runtime.sendMessage({ type: "REFRESH_CONFIG" }, (resp) => {
          status.textContent = resp?.ok ? "עודכן" : "שגיאה — נסה שוב";
        });
      });
    </script>
```

- [ ] **Step 6: Manual smoke**

```
1. Reload extension at chrome://extensions.
2. Open popup on chatgpt.com.
3. Confirm dropdown shows GPT-5 / Claude / Gemini and "(זיהוי: GPT-5)" is shown.
4. Type a strong, well-structured prompt (>= 80 score per server gate). Click enhance.
5. Confirm the green "✨ הפרומפט שלך כבר חזק — דילגנו על AI" hint appears.
6. Type a weak prompt, enhance — hint stays hidden.
7. Change dropdown to Claude on chatgpt.com tab. Reopen popup — dropdown remembers Claude. Detected label still says GPT-5.
8. Open options page → click "רענן הגדרות מהשרת" → status flips to "עודכן".
```

- [ ] **Step 7: Commit**

```bash
git add chrome-extension-v2.1/popup/popup.html chrome-extension-v2.1/popup/popup.css chrome-extension-v2.1/popup/popup.js chrome-extension-v2.1/popup/options.html chrome-extension-v2.1/background/service-worker.js
git commit -m "feat(ext): popup target-model dropdown, score-gate hint, refresh-config button (M3)"
```

---

## Task 10: Telemetry events at injector & popup hot points

**Files:**
- Modify: `chrome-extension-v2.1/content/ai-chat-injector.js`
- Modify: `chrome-extension-v2.1/popup/popup.js`

- [ ] **Step 1: Fire `popup_enhance` from popup**

In `popup.js`, immediately before the `/api/enhance` fetch call:

```js
chrome.runtime.sendMessage({
  type: "API_FETCH",
  path: "/api/extension-telemetry",
  method: "POST",
  body: {
    event: "popup_enhance",
    target_model: modelProfileSlug || null,
    site: PerootPopupTargetModelState?.host || null,
    ext_version: chrome.runtime.getManifest().version,
    ts: Date.now(),
  },
});
```

After the response resolves, if `response?.cacheHeader === "score-gate"`, also fire:

```js
chrome.runtime.sendMessage({
  type: "API_FETCH",
  path: "/api/extension-telemetry",
  method: "POST",
  body: {
    event: "score_gate_hit",
    target_model: modelProfileSlug || null,
    site: PerootPopupTargetModelState?.host || null,
    ext_version: chrome.runtime.getManifest().version,
    ts: Date.now(),
  },
});
```

- [ ] **Step 2: Verify injector telemetry already wired**

Confirm `ai-chat-injector.js` Task 8 Step 3 wrappers fire `selector_miss` on every chain miss. Search for `fireTelemetry("selector_miss"` — should appear at least 2× (input + send_button).

- [ ] **Step 3: Manual smoke**

```
1. Open popup on chatgpt.com, click enhance.
2. In peroot.space admin (or via SQL): SELECT event, count(*) FROM extension_telemetry_events WHERE created_at > now() - interval '5 min' GROUP BY event;
3. Confirm a popup_enhance row appears.
4. Trigger a known-bad selector (e.g. open chatgpt.com in incognito where login is missing — composer DOM may differ) → confirm a selector_miss row appears.
```

- [ ] **Step 4: Commit**

```bash
git add chrome-extension-v2.1/popup/popup.js chrome-extension-v2.1/content/ai-chat-injector.js
git commit -m "feat(ext): fire popup_enhance + score_gate_hit telemetry events (M3)"
```

---

## Task 11: Full preflight + manual end-to-end smoke

**Files:** none (verification task)

- [ ] **Step 1: Run preflight**

Run: `npm run preflight 2>&1 | tail -30`
Expected: lint clean (or only pre-existing warnings unrelated to M3), typecheck clean, all tests pass including the 13 new ones from Tasks 2 + 5.

- [ ] **Step 2: Knip dead-code check**

Run: `npm run knip 2>&1 | tail -20`
Expected: no new flags pointing at extension files.

- [ ] **Step 3: Build passes**

Run: `npm run build 2>&1 | tail -10`
Expected: build succeeds (extension is not part of the Next.js build, but a clean web build proves nothing in `src/` was broken by the vitest config change in Task 1).

- [ ] **Step 4: End-to-end smoke checklist**

Reload extension at `chrome://extensions`. For each site below, run the full sequence:

| Site | Hostname | Expected profile in popup | Inline button visible? |
|---|---|---|---|
| ChatGPT | chatgpt.com | GPT-5 | yes |
| ChatGPT (alias) | chat.openai.com | GPT-5 | yes |
| Claude | claude.ai | Claude Sonnet 4 | yes |
| Gemini | gemini.google.com | Gemini 2.5 | yes |
| DeepSeek | chat.deepseek.com | — (popup works, no injector) | no |
| Perplexity | www.perplexity.ai | — (popup works, no injector) | no |

For each "yes" row:
1. Open popup → confirm dropdown auto-selects the right profile.
2. Enhance a low-quality prompt ("write blog about ai") → expect normal AI response.
3. Enhance a high-quality prompt (well-structured, ≥80 score) → expect "✨ הפרומפט שלך כבר חזק" hint.
4. Override profile via dropdown → confirm next enhance request uses the override (check Network tab for `model_profile_slug` in request body).
5. Reload tab → dropdown still remembers override.

For each "no" row:
1. Confirm no logo button appears in the page composer.
2. Open popup — popup itself still functions (enter text → enhance → result returned).

- [ ] **Step 5: Verify telemetry rows**

```sql
-- Run in Supabase SQL editor against project ravinxlujmlvxhgbjxti
SELECT event, count(*)
FROM extension_telemetry_events
WHERE created_at > now() - interval '15 min'
GROUP BY event
ORDER BY count(*) DESC;
```

Expected: rows for at least `popup_enhance`. May include `selector_miss` and `score_gate_hit` depending on tests run.

- [ ] **Step 6: Final commit (release marker)**

```bash
git commit --allow-empty -m "release(ext): v2.0.0 — selector registry, site cuts, target-model UI, telemetry (M3)"
```

- [ ] **Step 7: Tag**

```bash
git tag -a ext-v2.0.0 -m "Extension v2.0.0 — M3 (selector registry + site cuts + target-model UI)"
git push --follow-tags
```

---

## Out of Scope (M4)

Quick-Library picker (`Alt+Shift+L`) and Inline Rewrite Chips are deferred to the next plan: `2026-04-29-extension-v2-m4-quicklib-and-chips.md`.

## Success Criteria (M3)

- Extension loads on ChatGPT, Claude, Gemini only (manifest cuts verified).
- Selectors come from `chrome.storage.local["peroot.extension_config"]`, refreshed on install + every 24h.
- All `/api/enhance` calls from popup and injector include `model_profile_slug`.
- Popup shows auto-detected profile and persists per-host override.
- Score-gate header surfaces a visible hint to the user.
- `selector_miss`, `popup_enhance`, `score_gate_hit` events appear in `extension_telemetry_events` within 1 hour of test traffic.
- Zero regressions in existing Vitest suite.
