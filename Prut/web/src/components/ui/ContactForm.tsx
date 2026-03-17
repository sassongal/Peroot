"use client";

import { useState } from "react";
import { Send, Loader2, Check, AlertCircle } from "lucide-react";

export function ContactForm() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === "loading") return;

    setStatus("loading");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) throw new Error("Failed to send");
      setStatus("success");
      setForm({ name: "", email: "", subject: "", message: "" });
    } catch {
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div className="glass-card rounded-2xl border border-green-500/20 p-8 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
          <Check className="w-6 h-6 text-green-400" />
        </div>
        <h3 className="text-lg font-bold text-foreground">ההודעה נשלחה בהצלחה!</h3>
        <p className="text-sm text-muted-foreground">נחזור אליך בהקדם האפשרי.</p>
        <button
          onClick={() => setStatus("idle")}
          className="text-sm text-amber-600 dark:text-amber-400 hover:text-amber-500 dark:hover:text-amber-300 transition-colors"
        >
          שלח הודעה נוספת
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="glass-card rounded-2xl border border-border p-8 space-y-5">
      {status === "error" && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span className="text-sm text-red-300">שגיאה בשליחה. נסה שוב או שלח מייל ישירות.</span>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label htmlFor="name" className="text-sm font-medium text-foreground">שם</label>
          <input
            id="name"
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
            className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-amber-500/50 transition-colors"
            placeholder="השם שלך"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm font-medium text-foreground">אימייל</label>
          <input
            id="email"
            type="email"
            required
            dir="ltr"
            value={form.email}
            onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
            className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-amber-500/50 transition-colors"
            placeholder="your@email.com"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="subject" className="text-sm font-medium text-foreground">נושא</label>
        <select
          id="subject"
          required
          value={form.subject}
          onChange={(e) => setForm(prev => ({ ...prev, subject: e.target.value }))}
          className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-foreground text-sm focus:outline-none focus:border-amber-500/50 transition-colors appearance-none"
        >
          <option value="" className="bg-background">בחר נושא...</option>
          <option value="question" className="bg-background">שאלה כללית</option>
          <option value="bug" className="bg-background">דיווח על באג</option>
          <option value="feature" className="bg-background">הצעה לתכונה חדשה</option>
          <option value="billing" className="bg-background">חיוב ותשלום</option>
          <option value="other" className="bg-background">אחר</option>
        </select>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="message" className="text-sm font-medium text-foreground">הודעה</label>
        <textarea
          id="message"
          required
          rows={5}
          value={form.message}
          onChange={(e) => setForm(prev => ({ ...prev, message: e.target.value }))}
          className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-amber-500/50 transition-colors resize-none"
          placeholder="כתוב את ההודעה שלך כאן..."
        />
      </div>

      <button
        type="submit"
        disabled={status === "loading"}
        className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl accent-gradient text-black font-bold text-sm hover:shadow-[0_0_30px_rgba(245,158,11,0.3)] transition-all disabled:opacity-50"
      >
        {status === "loading" ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            <Send className="w-4 h-4" />
            שלח הודעה
          </>
        )}
      </button>
    </form>
  );
}
