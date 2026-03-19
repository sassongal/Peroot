
"use client";

import { useState, useTransition } from "react";
import { Loader2, ArrowRight, Mail, Lock, User as UserIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { GoogleButton } from "./google-button";

type Mode = "login" | "signup" | "reset";

export function AuthForm() {
  const [mode, setMode] = useState<Mode>("login");
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showEmailSent, setShowEmailSent] = useState(false);
  const [showResetSent, setShowResetSent] = useState(false);

  const isLogin = mode === "login";
  const isReset = mode === "reset";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isReset) {
      if (!email) {
        toast.error("אנא הזן/י כתובת אימייל");
        return;
      }
      startTransition(async () => {
        const supabase = createClient();
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + "/auth/callback?type=recovery",
        });
        if (error) {
          toast.error("שגיאה בשליחת קישור איפוס: " + error.message);
        } else {
          setShowResetSent(true);
        }
      });
      return;
    }

    if (!email || !password || (!isLogin && !fullName)) {
      toast.error("אנא מלא/י את כל השדות");
      return;
    }

    startTransition(async () => {
      const supabase = createClient();

      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          toast.error("שגיאה בהתחברות: " + error.message);
        } else {
          toast.success("התחברת בהצלחה!");
          window.location.href = "/";
        }
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) {
          toast.error("שגיאה בהרשמה: " + error.message);
        } else {
          setShowEmailSent(true);
        }
      }
    });
  };

  // --- Email verification sent screen ---
  if (showEmailSent) {
    return (
      <div className="w-full max-w-sm mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-500 text-center">
        <div className="flex justify-center mb-4">
          <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center animate-bounce">
            <Mail className="w-10 h-10 text-amber-400" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">בדוק את האימייל שלך</h2>
        <p className="text-[var(--text-secondary)]">
          שלחנו קישור אימות לכתובת:
          <br />
          <span className="font-semibold text-amber-300">{email}</span>
        </p>
        <p className="text-sm text-[var(--text-muted)]">
          יש ללחוץ על הקישור באימייל כדי להפעיל את החשבון ולהתחיל להשתמש בפירוט.
        </p>
        <button
          onClick={() => {
            setShowEmailSent(false);
            setMode("login");
            setEmail("");
            setPassword("");
          }}
          className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors underline decoration-[var(--glass-border)] cursor-pointer"
        >
          חזרה להתחברות
        </button>
      </div>
    );
  }

  // --- Password reset link sent screen ---
  if (showResetSent) {
    return (
      <div className="w-full max-w-sm mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-500 text-center" dir="rtl">
        <div className="flex justify-center mb-4">
          <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center animate-bounce">
            <Mail className="w-10 h-10 text-amber-400" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">בדוק את האימייל שלך</h2>
        <p className="text-[var(--text-secondary)]">
          קישור לאיפוס סיסמה נשלח לאימייל שלך
          <br />
          <span className="font-semibold text-amber-300">{email}</span>
        </p>
        <p className="text-sm text-[var(--text-muted)]">
          יש ללחוץ על הקישור באימייל כדי לאפס את הסיסמה.
        </p>
        <button
          onClick={() => {
            setShowResetSent(false);
            setMode("login");
            setEmail("");
          }}
          className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors underline decoration-[var(--glass-border)] cursor-pointer"
        >
          חזרה להתחברות
        </button>
      </div>
    );
  }

  // --- Reset password form ---
  if (isReset) {
    return (
      <div className="w-full max-w-sm mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500" dir="rtl">
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">איפוס סיסמה</h1>
          <p className="text-sm text-[var(--text-muted)] font-medium">
            הזן/י את כתובת האימייל שלך ונשלח קישור לאיפוס הסיסמה
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative group">
            <label htmlFor="reset-email" className="sr-only">כתובת אימייל</label>
            <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-amber-400 transition-colors" />
            <input
              id="reset-email"
              dir="rtl"
              type="email"
              placeholder="כתובת אימייל"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl py-3 pe-11 ps-4 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-amber-500/50 focus:bg-[var(--glass-bg)] transition-all shadow-inner"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full accent-gradient text-black font-bold py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-amber-900/20 active:scale-[0.97] hover:shadow-[0_0_30px_rgba(245,158,11,0.25)] cursor-pointer"
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>שלח קישור לאיפוס</span>
                <ArrowRight className="w-4 h-4 rtl-flip" />
              </>
            )}
          </button>
        </form>

        <div className="text-center">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setEmail("");
            }}
            className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors decoration-[var(--glass-border)] font-medium cursor-pointer"
          >
            חזרה להתחברות
          </button>
        </div>
      </div>
    );
  }

  // --- Login / Signup form ---
  return (
    <div className="w-full max-w-sm mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center space-y-3">
        <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">
          {isLogin ? "ברוכים השבים" : "הצטרפות לפירוט"}
        </h1>
        <p className="text-sm text-[var(--text-muted)] font-medium">
          {isLogin
            ? "התחבר כדי לגשת לספריה ולהיסטוריה האישית שלך"
            : "צור חשבון כדי לשמור ולנהל את הפרומפטים שלך"}
        </p>
      </div>

      <div className="space-y-6">
        <GoogleButton />

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-[var(--glass-border)]" />
          </div>
          <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-bold">
            <span className="bg-[var(--surface-body)] px-3 text-[var(--text-muted)]">או עם אימייל</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="relative group animate-in fade-in zoom-in-95 duration-300">
              <label htmlFor="full-name" className="sr-only">שם מלא</label>
              <UserIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-amber-400 transition-colors" />
              <input
                id="full-name"
                dir="rtl"
                type="text"
                placeholder="שם מלא"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl py-3 pe-11 ps-4 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-amber-500/50 focus:bg-[var(--glass-bg)] transition-all shadow-inner"
              />
            </div>
          )}
          <div className="relative group">
            <label htmlFor="email" className="sr-only">כתובת אימייל</label>
            <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-amber-400 transition-colors" />
            <input
              id="email"
              dir="rtl"
              type="email"
              placeholder="כתובת אימייל"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl py-3 pe-11 ps-4 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-amber-500/50 focus:bg-[var(--glass-bg)] transition-all shadow-inner"
            />
          </div>
          <div className="relative group">
            <label htmlFor="password" className="sr-only">סיסמה</label>
            <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-amber-400 transition-colors" />
            <input
              id="password"
              dir="rtl"
              type="password"
              placeholder="סיסמה"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl py-3 pe-11 ps-4 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-amber-500/50 focus:bg-[var(--glass-bg)] transition-all shadow-inner"
            />
          </div>

          {isLogin && (
            <div className="flex justify-end" dir="rtl">
              <button
                type="button"
                onClick={() => {
                  setMode("reset");
                  setPassword("");
                }}
                className="text-xs text-slate-500 hover:text-amber-400 transition-colors cursor-pointer"
              >
                שכחת סיסמה?
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full accent-gradient text-black font-bold py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-amber-900/20 active:scale-[0.97] hover:shadow-[0_0_30px_rgba(245,158,11,0.25)] cursor-pointer"
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>{isLogin ? "כניסה למערכת" : "הרשמה וחשבון חדש"}</span>
                <ArrowRight className="w-4 h-4 rtl-flip" />
              </>
            )}
          </button>
        </form>

        <div className="text-center">
          <button
            type="button"
            onClick={() => setMode(isLogin ? "signup" : "login")}
            className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors decoration-[var(--glass-border)] font-medium cursor-pointer"
          >
            {isLogin ? (
              <>אין לך חשבון? <span className="text-amber-400 font-bold ms-1">הירשם עכשיו</span></>
            ) : (
              <>כבר רשום? <span className="text-amber-400 font-bold ms-1">התחבר כאן</span></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
