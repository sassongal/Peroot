"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowLeft, Mail, Lock, User as UserIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { GoogleButton } from "./google-button";
import { trackSignUp } from "@/lib/analytics";

type Mode = "login" | "signup" | "reset";

const INPUT_CLASS =
  "w-full bg-white/[0.04] border border-white/[0.08] rounded-xl py-2.5 pe-10 ps-4 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-amber-500/50 focus:bg-white/[0.06] focus:ring-1 focus:ring-amber-500/15 transition-all duration-200";

const ICON_CLASS =
  "absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-amber-400/70 transition-colors duration-200";

export function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
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
          const nextParam = new URLSearchParams(window.location.search).get("next");
          let dest =
            nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/";
          if (dest.length > 2048) dest = "/";
          // router.refresh() reruns RSCs with the new cookies before navigation,
          // so the destination renders with the authenticated session on first paint.
          router.refresh();
          router.push(dest);
        }
      } else {
        // Server-side signup: creates user with email pre-confirmed (no verification link)
        const res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, fullName }),
        });
        const json = await res.json();
        if (!res.ok) {
          toast.error(json.error || "שגיאה בהרשמה");
          return;
        }
        // Sign in immediately after account creation
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) {
          toast.error("החשבון נוצר אך ההתחברות נכשלה: " + signInError.message);
          return;
        }
        trackSignUp("email");
        toast.success("ברוכים הבאים לפירוט!");
        const nextParam = new URLSearchParams(window.location.search).get("next");
        let dest =
          nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/";
        if (dest.length > 2048) dest = "/";
        router.refresh();
        router.push(dest);
      }
    });
  };

  // --- Reset sent success state ---
  if (showResetSent) {
    return (
      <div className="space-y-5 animate-in fade-in zoom-in-95 duration-500 text-center" dir="rtl">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center">
            <Mail className="w-7 h-7 text-amber-400" />
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-white">בדוק את האימייל שלך</h2>
          <p className="text-sm text-white/50 leading-relaxed">
            קישור לאיפוס סיסמה נשלח לאימייל שלך
            <br />
            <span className="font-semibold text-amber-400/80">{email}</span>
          </p>
          <p className="text-xs text-white/30 leading-relaxed">
            יש ללחוץ על הקישור באימייל כדי לאפס את הסיסמה.
          </p>
        </div>
        <button
          onClick={() => {
            setShowResetSent(false);
            setMode("login");
            setEmail("");
            setPassword("");
          }}
          className="text-xs text-white/30 hover:text-white/60 transition-colors cursor-pointer font-medium"
        >
          חזרה להתחברות
        </button>
      </div>
    );
  }

  // --- Reset password form ---
  if (isReset) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-400" dir="rtl">
        <div className="text-center space-y-1.5">
          <h1 className="text-xl font-bold text-white">איפוס סיסמה</h1>
          <p className="text-[13px] text-white/35 leading-relaxed">
            הזן/י את כתובת האימייל ונשלח קישור לאיפוס
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative group">
            <label htmlFor="reset-email" className="sr-only">
              כתובת אימייל
            </label>
            <Mail className={ICON_CLASS} />
            <input
              id="reset-email"
              dir="rtl"
              type="email"
              placeholder="כתובת אימייל"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={INPUT_CLASS}
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-linear-to-l from-amber-500 to-amber-600 text-black font-bold py-2.5 rounded-xl text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(217,119,6,0.2)] active:scale-[0.98] hover:shadow-[0_4px_24px_rgba(217,119,6,0.3)] cursor-pointer"
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <span>שלח קישור לאיפוס</span>
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
            className="text-xs text-white/30 hover:text-white/50 transition-colors font-medium cursor-pointer"
          >
            חזרה להתחברות
          </button>
        </div>
      </div>
    );
  }

  // --- Login / Signup form ---
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-400">
      <div className="text-center space-y-1.5">
        <h1 className="text-xl font-bold text-white tracking-tight">
          {isLogin ? "ברוכים השבים" : "הצטרפות לפירוט"}
        </h1>
        <p className="text-[13px] text-white/35 leading-relaxed">
          {isLogin
            ? "התחבר כדי לגשת לספריה ולהיסטוריה האישית שלך"
            : "צור חשבון כדי לשמור ולנהל את הפרומפטים שלך"}
        </p>
      </div>

      <div className="space-y-5">
        <GoogleButton />

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-white/6" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-[#0a0a0a] px-3 text-[10px] text-white/20 uppercase tracking-[0.15em]">
              או עם אימייל
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {!isLogin && (
            <div className="relative group animate-in fade-in zoom-in-95 duration-300">
              <label htmlFor="full-name" className="sr-only">
                שם מלא
              </label>
              <UserIcon className={ICON_CLASS} />
              <input
                id="full-name"
                dir="rtl"
                type="text"
                placeholder="שם מלא"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
          )}
          <div className="relative group">
            <label htmlFor="email" className="sr-only">
              כתובת אימייל
            </label>
            <Mail className={ICON_CLASS} />
            <input
              id="email"
              dir="rtl"
              type="email"
              placeholder="כתובת אימייל"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={INPUT_CLASS}
            />
          </div>
          <div className="relative group">
            <label htmlFor="password" className="sr-only">
              סיסמה
            </label>
            <Lock className={ICON_CLASS} />
            <input
              id="password"
              dir="rtl"
              type="password"
              placeholder="סיסמה"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={INPUT_CLASS}
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
                className="text-[11px] text-white/25 hover:text-amber-400/70 transition-colors cursor-pointer"
              >
                שכחת סיסמה?
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-linear-to-l from-amber-500 to-amber-600 text-black font-bold py-2.5 rounded-xl text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(217,119,6,0.2)] active:scale-[0.98] hover:shadow-[0_4px_24px_rgba(217,119,6,0.3)] cursor-pointer mt-4!"
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>{isLogin ? "כניסה למערכת" : "יצירת חשבון"}</span>
                <ArrowLeft className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="text-center">
          <button
            type="button"
            onClick={() => setMode(isLogin ? "signup" : "login")}
            className="text-xs text-white/30 hover:text-white/50 transition-colors font-medium cursor-pointer"
          >
            {isLogin ? (
              <>
                אין לך חשבון?{" "}
                <span className="text-amber-400/70 hover:text-amber-400 font-semibold">
                  הירשם עכשיו
                </span>
              </>
            ) : (
              <>
                כבר רשום?{" "}
                <span className="text-amber-400/70 hover:text-amber-400 font-semibold">
                  התחבר כאן
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
