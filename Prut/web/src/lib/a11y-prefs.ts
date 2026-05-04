export type A11yContrast = "off" | "high" | "invert";
export type A11yTextSize = 100 | 115 | 130 | 150;
export type A11yLineSpacing = "normal" | "relaxed";

export interface A11yPrefs {
  version: 1;
  contrast: A11yContrast;
  textSize: A11yTextSize;
  lineSpacing: A11yLineSpacing;
  reduceMotion: boolean;
  links: boolean;
}

const STORAGE_KEY = "peroot_a11y_v1";

const DEFAULT_PREFS: A11yPrefs = {
  version: 1,
  contrast: "off",
  textSize: 100,
  lineSpacing: "normal",
  reduceMotion: false,
  links: false,
};

// Single source of truth: CSS class per preference state.
// Each entry: [className, runtimePredicate, bootstrapJS (inline script string)]
export const A11Y_CLASS_RULES: ReadonlyArray<[string, (p: A11yPrefs) => boolean, string]> = [
  ["a11y-contrast-high", (p) => p.contrast === "high", "p.contrast==='high'"],
  ["a11y-contrast-invert", (p) => p.contrast === "invert", "p.contrast==='invert'"],
  ["a11y-text-115", (p) => p.textSize === 115, "p.textSize===115"],
  ["a11y-text-130", (p) => p.textSize === 130, "p.textSize===130"],
  ["a11y-text-150", (p) => p.textSize === 150, "p.textSize===150"],
  ["a11y-lines-relaxed", (p) => p.lineSpacing === "relaxed", "p.lineSpacing==='relaxed'"],
  ["a11y-reduce-motion", (p) => p.reduceMotion, "!!p.reduceMotion"],
  ["a11y-links", (p) => p.links, "!!p.links"],
];

export function applyPrefsToElement(el: HTMLElement, prefs: A11yPrefs): void {
  for (const [cls, predicate] of A11Y_CLASS_RULES) {
    el.classList.toggle(cls, predicate(prefs));
  }
}

// Inline bootstrap script — runs synchronously in <head> to prevent FOUC.
// Generated from A11Y_CLASS_RULES so runtime and bootstrap can never drift.
export const A11Y_BOOTSTRAP_SCRIPT =
  `(function(){try{var raw=localStorage.getItem(${JSON.stringify(STORAGE_KEY)});` +
  `if(!raw)return;var p=JSON.parse(raw);if(p.version!==1)return;` +
  `var c=document.documentElement.classList;` +
  A11Y_CLASS_RULES.map(([cls, , js]) => `c.toggle(${JSON.stringify(cls)},${js})`).join(";") +
  `}catch(e){}})()`;

// ── Pub-sub store ──────────────────────────────────────────────────────────

let _state: A11yPrefs = DEFAULT_PREFS;
const _listeners = new Set<() => void>();

function _load(): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Partial<A11yPrefs>;
    if (parsed.version !== 1) return;
    _state = { ...DEFAULT_PREFS, ...parsed };
  } catch {
    /* storage unavailable — use defaults */
  }
}

function _save(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(_state));
  } catch {
    /* storage unavailable */
  }
}

function _notify(): void {
  applyPrefsToElement(document.documentElement, _state);
  _listeners.forEach((l) => l());
}

export function subscribe(listener: () => void): () => void {
  _listeners.add(listener);
  return () => _listeners.delete(listener);
}

export function getSnapshot(): A11yPrefs {
  return _state;
}

export function getServerSnapshot(): A11yPrefs {
  return DEFAULT_PREFS;
}

export function setA11yPref<K extends keyof Omit<A11yPrefs, "version">>(
  key: K,
  value: A11yPrefs[K],
): void {
  _state = { ..._state, [key]: value };
  _save();
  _notify();
}

export function resetA11yPrefs(): void {
  _state = DEFAULT_PREFS;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* storage unavailable */
  }
  _notify();
}

// Load from storage on module init (client only).
if (typeof window !== "undefined") {
  _load();
}
