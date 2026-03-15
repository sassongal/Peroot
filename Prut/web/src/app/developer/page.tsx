"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Copy, Key, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { getApiPath } from "@/lib/api-path";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface ApiKey {
  id: string;
  key_prefix: string;
  name: string;
  scopes: string[];
  rate_limit: number;
  usage_count: number;
  last_used_at: string | null;
  is_active: boolean;
  created_at: string;
}

export default function DeveloperPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => { loadKeys(); }, []);

  async function loadKeys() {
    try {
      const res = await fetch(getApiPath("/api/developer/keys"));
      if (!res.ok) throw new Error();
      const data = await res.json();
      setKeys(data.keys || []);
    } catch {
      toast.error("שגיאה בטעינת מפתחות API");
    } finally {
      setLoading(false);
    }
  }

  async function createKey() {
    setCreating(true);
    try {
      const res = await fetch(getApiPath("/api/developer/keys"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName || "Default" }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      const data = await res.json();
      setCreatedKey(data.key);
      setNewKeyName("");
      loadKeys();
      toast.success("מפתח API נוצר בהצלחה");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שגיאה ביצירת מפתח");
    } finally {
      setCreating(false);
    }
  }

  async function revokeKey(keyId: string) {
    if (!confirm("לבטל את המפתח? לא ניתן לשחזר.")) return;
    try {
      await fetch(getApiPath("/api/developer/keys"), {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyId }),
      });
      toast.success("מפתח בוטל");
      loadKeys();
    } catch {
      toast.error("שגיאה בביטול מפתח");
    }
  }

  const APP_URL = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div dir="rtl" className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black tracking-tight">API למפתחים</h1>
            <p className="text-sm text-slate-500 mt-1">שלב את Peroot באפליקציה שלך</p>
          </div>
          <Link href="/" className="text-sm text-slate-400 hover:text-white transition-colors">← חזרה</Link>
        </div>

        {/* Create Key */}
        <div className="p-6 rounded-2xl border border-white/10 bg-white/[0.02] mb-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Key className="w-5 h-5 text-amber-400" />
            צור מפתח API חדש
          </h2>
          <div className="flex gap-3">
            <input
              value={newKeyName}
              onChange={e => setNewKeyName(e.target.value)}
              placeholder="שם המפתח (למשל: האפליקציה שלי)"
              className="flex-1 bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-amber-500/50 outline-none"
            />
            <button
              onClick={createKey}
              disabled={creating}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 text-black font-bold text-sm hover:bg-amber-400 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              {creating ? "יוצר..." : "צור מפתח"}
            </button>
          </div>
        </div>

        {/* Newly Created Key (shown once) */}
        {createdKey && (
          <div className="p-6 rounded-2xl border border-amber-500/30 bg-amber-500/5 mb-6 animate-in slide-in-from-top-4">
            <div className="flex items-center gap-2 mb-3">
              <Key className="w-5 h-5 text-amber-400" />
              <h3 className="font-bold text-amber-300">המפתח החדש שלך</h3>
            </div>
            <p className="text-xs text-slate-400 mb-3">שמור את המפתח — הוא לא יוצג שוב!</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-black/50 rounded-lg px-4 py-2.5 font-mono text-sm text-amber-200 select-all">
                {showKey ? createdKey : "•".repeat(createdKey.length)}
              </code>
              <button onClick={() => setShowKey(!showKey)} className="p-2.5 rounded-lg hover:bg-white/10 text-slate-400 cursor-pointer">
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              <button
                onClick={() => { navigator.clipboard.writeText(createdKey); toast.success("הועתק!"); }}
                className="p-2.5 rounded-lg hover:bg-white/10 text-slate-400 cursor-pointer"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
            <button onClick={() => setCreatedKey(null)} className="mt-3 text-xs text-slate-500 hover:text-slate-300 cursor-pointer">סגור</button>
          </div>
        )}

        {/* Keys List */}
        <div className="p-6 rounded-2xl border border-white/10 bg-white/[0.02] mb-8">
          <h2 className="text-lg font-bold mb-4">המפתחות שלך</h2>
          {loading ? (
            <div className="text-slate-500 animate-pulse">טוען...</div>
          ) : keys.length === 0 ? (
            <p className="text-slate-500 text-sm">עדיין לא יצרת מפתחות API</p>
          ) : (
            <div className="space-y-3">
              {keys.map(key => (
                <div key={key.id} className={cn(
                  "flex items-center justify-between p-4 rounded-xl border",
                  key.is_active ? "border-white/10 bg-white/[0.02]" : "border-red-500/10 bg-red-500/5 opacity-60"
                )}>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-sm text-amber-300">{key.key_prefix}...</span>
                      <span className="text-xs text-slate-400">{key.name}</span>
                      {!key.is_active && <span className="text-[10px] px-2 py-0.5 bg-red-500/10 text-red-400 rounded-full">בוטל</span>}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {key.usage_count} שימושים · נוצר {new Date(key.created_at).toLocaleDateString("he-IL")}
                      {key.last_used_at && ` · שימוש אחרון ${new Date(key.last_used_at).toLocaleDateString("he-IL")}`}
                    </div>
                  </div>
                  {key.is_active && (
                    <button onClick={() => revokeKey(key.id)} className="p-2 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors cursor-pointer">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Code Examples */}
        <div className="p-6 rounded-2xl border border-white/10 bg-white/[0.02]">
          <h2 className="text-lg font-bold mb-4">דוגמאות קוד</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-slate-300 mb-2">cURL</h3>
              <pre dir="ltr" className="bg-black/50 rounded-xl p-4 text-xs text-slate-300 overflow-x-auto font-mono">
{`curl -X POST ${APP_URL}/api/enhance \\
  -H "Authorization: Bearer prk_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"prompt": "כתוב מייל שיווקי", "category": "marketing"}'`}
              </pre>
            </div>
            <div>
              <h3 className="text-sm font-medium text-slate-300 mb-2">JavaScript / TypeScript</h3>
              <pre dir="ltr" className="bg-black/50 rounded-xl p-4 text-xs text-slate-300 overflow-x-auto font-mono">
{`const response = await fetch("${APP_URL}/api/enhance", {
  method: "POST",
  headers: {
    "Authorization": "Bearer prk_YOUR_KEY",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    prompt: "כתוב מייל שיווקי",
    category: "marketing",
  }),
});
const data = await response.json();
console.log(data.completion);`}
              </pre>
            </div>
            <div>
              <h3 className="text-sm font-medium text-slate-300 mb-2">Python</h3>
              <pre dir="ltr" className="bg-black/50 rounded-xl p-4 text-xs text-slate-300 overflow-x-auto font-mono">
{`import requests

response = requests.post(
    "${APP_URL}/api/enhance",
    headers={"Authorization": "Bearer prk_YOUR_KEY"},
    json={"prompt": "כתוב מייל שיווקי", "category": "marketing"}
)
print(response.json()["completion"])`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
