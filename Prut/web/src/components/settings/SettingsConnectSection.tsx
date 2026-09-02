"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Bot,
  Check,
  Copy,
  ExternalLink,
  KeyRound,
  Loader2,
  Plug,
  Terminal,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { CopySetupPrompt } from "@/components/connect/CopySetupPrompt";
import { formatDateHe } from "@/lib/dates/format";

interface ApiKeyMeta {
  id: string;
  name: string;
  key_prefix: string;
  is_active: boolean;
  created_at: string | null;
  last_used_at: string | null;
}

const MCP_URL = "https://www.peroot.space/api/mcp";

function snippetFor(client: "claude" | "cursor" | "curl", key: string): string {
  const k = key || "prk_live_XXXX…";
  if (client === "claude") {
    return JSON.stringify(
      {
        mcpServers: {
          peroot: {
            command: "npx",
            args: ["-y", "mcp-remote", MCP_URL, "--header", `Authorization: Bearer ${k}`],
          },
        },
      },
      null,
      2,
    );
  }
  if (client === "cursor") {
    return JSON.stringify(
      {
        mcpServers: {
          peroot: { url: MCP_URL, headers: { Authorization: `Bearer ${k}` } },
        },
      },
      null,
      2,
    );
  }
  return [
    "curl -X POST https://www.peroot.space/api/v1/enhance \\",
    `  -H "Authorization: Bearer ${k}" \\`,
    '  -H "Content-Type: application/json" \\',
    `  -d '{"prompt":"כתוב פוסט על…","mode":"STANDARD","target_model":"claude"}'`,
  ].join("\n");
}

/**
 * Peroot Connect — developer key management (Settings tab).
 * Self-contained: fetches its own state from /api/developer-keys.
 * The raw key is displayed exactly once, right after creation.
 */
export function SettingsConnectSection() {
  const [keys, setKeys] = useState<ApiKeyMeta[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  /** The one-time raw key from the last create — never persisted client-side. */
  const [freshKey, setFreshKey] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [snippetTab, setSnippetTab] = useState<"claude" | "cursor" | "curl">("claude");

  const loadKeys = useCallback(async () => {
    try {
      const res = await fetch("/api/developer-keys");
      if (res.ok) {
        const data = await res.json();
        setKeys((data.keys ?? []).filter((k: ApiKeyMeta) => k.is_active));
      }
    } catch (e) {
      logger.warn("[Connect] keys load failed:", e);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void loadKeys();
  }, [loadKeys]);

  const copyText = async (text: string, tag: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(tag);
      setTimeout(() => setCopied(null), 2000);
      toast.success("הועתק ללוח");
    } catch {
      toast.error("ההעתקה נחסמה על ידי הדפדפן, סמן והעתק ידנית");
    }
  };

  const createKey = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/developer-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setFreshKey(data.key);
        setNewName("");
        toast.success("המפתח נוצר, שמור אותו עכשיו, הוא לא יוצג שוב");
        void loadKeys();
      } else {
        toast.error(data.error || "יצירת המפתח נכשלה");
      }
    } catch {
      toast.error("יצירת המפתח נכשלה");
    } finally {
      setCreating(false);
    }
  };

  const revokeKey = async (id: string, name: string) => {
    if (!window.confirm(`לבטל את המפתח "${name}"? חיבורים שמשתמשים בו יפסיקו לעבוד מיד.`)) {
      return;
    }
    setRevokingId(id);
    try {
      const res = await fetch("/api/developer-keys", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        toast.success("המפתח בוטל");
        if (freshKey) setFreshKey(null);
        void loadKeys();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "ביטול המפתח נכשל");
      }
    } catch {
      toast.error("ביטול המפתח נכשל");
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <section
      className="space-y-6 animate-in fade-in duration-300"
      aria-labelledby="settings-connect-heading"
    >
      <header className="space-y-1">
        <h2 id="settings-connect-heading" className="text-xl font-bold flex items-center gap-2">
          <Plug className="w-5 h-5 text-amber-400" />
          Peroot Connect
        </h2>
        <p className="text-sm text-(--text-muted)">
          חבר את Peroot לסוכן ה-AI שלך, Claude, Cursor או כל כלי אחר, ושדרג פרומפטים מכל מקום.
          השדרוגים נספרים מהמכסה הרגילה שלך.
        </p>
      </header>

      {/* One-time fresh key display */}
      {freshKey && (
        <div className="p-5 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-3">
          <h3 className="font-semibold text-amber-300 flex items-center gap-2">
            <KeyRound className="w-4 h-4" />
            המפתח החדש שלך, מוצג פעם אחת בלבד
          </h3>
          <div className="flex items-center gap-3">
            <code
              dir="ltr"
              className="flex-1 px-4 py-3 bg-(--glass-bg) rounded-lg border border-amber-500/20 font-mono text-sm text-amber-200 break-all select-all"
            >
              {freshKey}
            </code>
            <button
              type="button"
              onClick={() => copyText(freshKey, "fresh")}
              className="cursor-pointer shrink-0 p-3 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg transition-colors"
              aria-label="העתק מפתח"
            >
              {copied === "fresh" ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
            </button>
          </div>
          <p className="text-xs text-amber-200/70">
            שמור את המפתח במקום בטוח. אם יאבד, בטל אותו וצור חדש.
          </p>
          <div className="pt-1">
            <CopySetupPrompt apiKey={freshKey} />
            <p className="text-xs text-amber-200/60 mt-2">
              הדרך המהירה: העתק את פרומפט החיבור (כולל המפתח) והדבק אצל הסוכן, הוא כבר יידע להתחבר
              לבד.
            </p>
          </div>
        </div>
      )}

      {/* Create */}
      <div className="p-5 bg-(--glass-bg) rounded-xl border border-(--glass-border) space-y-3">
        <h3 className="font-semibold text-(--text-primary) text-sm">יצירת מפתח חדש</h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder='שם למפתח (למשל "Claude Desktop")'
            maxLength={60}
            className="flex-1 bg-(--glass-bg) border border-(--glass-border) rounded-lg px-3 py-2.5 text-(--text-primary) text-sm placeholder:text-(--text-muted) focus:outline-none focus:border-amber-500/50 transition-colors"
          />
          <button
            type="button"
            onClick={createKey}
            disabled={creating || !newName.trim()}
            className="cursor-pointer shrink-0 px-4 py-2.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-medium rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-amber-500/30"
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : "צור מפתח"}
          </button>
        </div>
        <p className="text-xs text-(--text-muted)">
          מומלץ מפתח נפרד לכל כלי, כך אפשר לבטל אחד בלי לשבור את השאר.
        </p>
      </div>

      {/* Keys list */}
      <div className="p-5 bg-(--glass-bg) rounded-xl border border-(--glass-border) space-y-3">
        <h3 className="font-semibold text-(--text-primary) text-sm flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-amber-400" />
          המפתחות שלך
        </h3>
        {!loaded ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />
          </div>
        ) : keys.length === 0 ? (
          <p className="text-sm text-(--text-muted) text-center py-4">אין מפתחות פעילים עדיין</p>
        ) : (
          <ul className="space-y-2">
            {keys.map((k) => (
              <li
                key={k.id}
                className="flex items-center gap-3 p-3 bg-(--glass-bg) rounded-lg border border-(--glass-border)"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-(--text-primary) font-medium truncate">{k.name}</div>
                  <div className="text-xs text-(--text-muted) font-mono" dir="ltr">
                    {k.key_prefix}••••{" "}
                    {k.last_used_at
                      ? `· שימוש אחרון ${formatDateHe(k.last_used_at)}`
                      : "· טרם נעשה שימוש"}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => revokeKey(k.id, k.name)}
                  disabled={revokingId === k.id}
                  className="cursor-pointer shrink-0 p-2 text-red-400/70 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                  aria-label={`בטל את המפתח ${k.name}`}
                >
                  {revokingId === k.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Setup snippets */}
      <div className="p-5 bg-(--glass-bg) rounded-xl border border-(--glass-border) space-y-3">
        <h3 className="font-semibold text-(--text-primary) text-sm flex items-center gap-2">
          <Terminal className="w-4 h-4 text-amber-400" />
          חיבור לכלי שלך
        </h3>
        <div className="flex gap-1">
          {(
            [
              ["claude", "Claude Desktop", Bot],
              ["cursor", "Cursor", Terminal],
              ["curl", "REST / curl", Terminal],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setSnippetTab(id)}
              className={`cursor-pointer px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                snippetTab === id
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                  : "bg-(--glass-bg) text-(--text-muted) border border-(--glass-border) hover:bg-(--glass-bg)"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="relative">
          <pre
            dir="ltr"
            className="p-4 bg-(--glass-bg) rounded-lg border border-(--glass-border) font-mono text-xs text-(--text-secondary) overflow-x-auto whitespace-pre"
          >
            {snippetFor(snippetTab, freshKey ?? "")}
          </pre>
          <button
            type="button"
            onClick={() =>
              copyText(snippetFor(snippetTab, freshKey ?? ""), `snippet-${snippetTab}`)
            }
            className="cursor-pointer absolute top-2 left-2 p-2 bg-(--glass-bg) hover:bg-(--glass-bg) text-(--text-muted) rounded-lg transition-colors"
            aria-label="העתק הגדרות"
          >
            {copied === `snippet-${snippetTab}` ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
        {snippetTab === "claude" && (
          <p className="text-xs text-(--text-muted)" dir="rtl">
            הדבק ב-<code dir="ltr">claude_desktop_config.json</code> והפעל מחדש את Claude Desktop.
            אחר כך הקלד <code dir="ltr">/peroot:enhance</code> בשיחה.
          </p>
        )}
        <div className="flex items-center gap-3 flex-wrap">
          <CopySetupPrompt apiKey={freshKey ?? undefined} />
          <a
            href="/connect"
            className="inline-flex items-center gap-1.5 text-xs text-amber-400/80 hover:text-amber-300 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            המדריך המלא ורשימת הפקודות
          </a>
        </div>
      </div>

      {/* API endpoints — copyable */}
      <div className="p-5 bg-(--glass-bg) rounded-xl border border-(--glass-border) space-y-3">
        <h3 className="font-semibold text-(--text-primary) text-sm flex items-center gap-2">
          <ExternalLink className="w-4 h-4 text-amber-400" />
          כתובות ה-API
        </h3>
        <ul className="space-y-2">
          {(
            [
              ["MCP (סוכנים)", MCP_URL],
              ["REST Base", "https://www.peroot.space/api/v1"],
              ["OpenAPI (תיעוד מכונה)", "https://www.peroot.space/api/v1/openapi"],
            ] as const
          ).map(([label, url]) => (
            <li
              key={url}
              className="flex items-center gap-3 p-3 bg-(--glass-bg) rounded-lg border border-(--glass-border)"
            >
              <div className="flex-1 min-w-0">
                <div className="text-xs text-(--text-muted) mb-0.5">{label}</div>
                <code
                  dir="ltr"
                  className="block text-xs font-mono text-(--text-secondary) truncate"
                >
                  {url}
                </code>
              </div>
              <button
                type="button"
                onClick={() => copyText(url, `url-${label}`)}
                className="cursor-pointer shrink-0 p-2 bg-(--glass-bg) hover:bg-(--glass-bg) text-(--text-muted) rounded-lg transition-colors"
                aria-label={`העתק ${label}`}
              >
                {copied === `url-${label}` ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </li>
          ))}
        </ul>
        <p className="text-xs text-(--text-muted)">
          התיעוד האנושי המלא:{" "}
          <a href="/connect/docs" className="text-amber-400/80 hover:text-amber-300">
            /connect/docs
          </a>
        </p>
      </div>
    </section>
  );
}
