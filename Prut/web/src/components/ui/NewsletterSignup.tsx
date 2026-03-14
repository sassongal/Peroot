"use client";

import { useState } from "react";
import { Mail, Check, Loader2, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || status === "loading") return;

    setStatus("loading");
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("newsletter_subscribers")
        .upsert({ email: email.trim().toLowerCase() }, { onConflict: "email" });

      if (error) throw error;
      setStatus("success");
      setEmail("");
    } catch {
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div className="flex items-center justify-center gap-2 p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
        <Check className="w-5 h-5 text-green-400" />
        <span className="text-sm text-green-300">תודה! נעדכן אותך כשיעלה תוכן חדש</span>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl space-y-3">
        <div className="flex items-center justify-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-400" />
          <span className="text-sm text-red-300">שגיאה בהרשמה. נסה שוב.</span>
        </div>
        <button
          onClick={() => setStatus("idle")}
          className="w-full text-xs text-slate-400 hover:text-white transition-colors"
        >
          נסה שוב
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="p-5 bg-white/5 border border-white/10 rounded-xl space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Mail className="w-4 h-4 text-amber-400" />
        <h3 className="font-semibold text-white text-sm">עדכונים ותוכן חדש</h3>
      </div>
      <p className="text-xs text-slate-400">הירשם לקבלת מאמרים חדשים וטיפים ישירות למייל</p>
      <div className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          dir="ltr"
          required
          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-amber-500/50 transition-colors"
        />
        <button
          type="submit"
          disabled={status === "loading" || !email.trim()}
          className="shrink-0 px-4 py-2.5 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-300 text-sm font-semibold hover:bg-amber-500/30 transition-colors disabled:opacity-50"
        >
          {status === "loading" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            "הרשמה"
          )}
        </button>
      </div>
    </form>
  );
}
