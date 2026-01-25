
"use client";

import { useState, useTransition } from "react";
import { Loader2, ArrowRight, Mail, Lock, User as UserIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { GoogleButton } from "./google-button";

export function AuthForm() {
  const [isLogin, setIsLogin] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showEmailSent, setShowEmailSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || (!isLogin && !fullName)) {
      toast.error("אנא מלא/י את כל השדות");
      return;
    }

    startTransition(async () => {
      const supabase = createClient();
      
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        if (error) {
            toast.error("שגיאה בהתחברות: " + error.message);
        } else {
            toast.success("התחברת בהצלחה!");
            window.location.href = '/';
        }
      } else {
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                  full_name: fullName,
                },
                emailRedirectTo: `${window.location.origin}/auth/callback`
            }
        });
        if (error) {
            toast.error("שגיאה בהרשמה: " + error.message);
        } else {
            setShowEmailSent(true);
        }
      }
    });
  };

  if (showEmailSent) {
    return (
      <div className="w-full max-w-sm mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-500 text-center">
        <div className="flex justify-center mb-4">
          <div className="w-20 h-20 bg-purple-500/10 rounded-full flex items-center justify-center animate-bounce">
            <Mail className="w-10 h-10 text-purple-400" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-white">בדוק את האימייל שלך</h2>
        <p className="text-slate-300">
          שלחנו קישור אימות לכתובת:
          <br />
          <span className="font-semibold text-purple-300">{email}</span>
        </p>
        <p className="text-sm text-slate-500">
            יש ללחוץ על הקישור באימייל כדי להפעיל את החשבון ולהתחיל להשתמש בפירוט.
        </p>
        <button
            onClick={() => {
                setShowEmailSent(false);
                setIsLogin(true);
                setEmail("");
                setPassword("");
            }}
            className="text-sm text-slate-400 hover:text-white transition-colors underline decoration-slate-400/30"
        >
            חזרה להתחברות
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center space-y-3">
        <h1 className="text-3xl font-bold tracking-tight text-white">
          {isLogin ? "ברוכים השבים" : "הצטרפות לפירוט"}
        </h1>
        <p className="text-sm text-slate-400 font-medium">
          {isLogin 
            ? "התחבר כדי לגשת לספריה ולהיסטוריה האישית שלך" 
            : "צור חשבון כדי לשמור ולנהל את הפרומפטים שלך"}
        </p>
      </div>

      <div className="space-y-6">
        <GoogleButton />

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-white/5" />
          </div>
          <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-bold">
            <span className="bg-[#0a0a0a] px-3 text-slate-500">או עם אימייל</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="relative group animate-in fade-in zoom-in-95 duration-300">
                <UserIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-purple-400 transition-colors" />
                <input
                    dir="rtl"
                    type="text"
                    placeholder="שם מלא"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pr-11 pl-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-500/50 focus:bg-white/10 transition-all shadow-inner"
                />
            </div>
          )}
          <div className="relative group">
              <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-purple-400 transition-colors" />
              <input
                  dir="rtl"
                  type="email"
                  placeholder="כתובת אימייל"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pr-11 pl-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-500/50 focus:bg-white/10 transition-all shadow-inner"
              />
          </div>
          <div className="relative group">
              <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-purple-400 transition-colors" />
              <input
                  dir="rtl"
                  type="password"
                  placeholder="סיסמה"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pr-11 pl-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-500/50 focus:bg-white/10 transition-all shadow-inner"
              />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-purple-900/20 active:scale-[0.98]"
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
                onClick={() => setIsLogin(!isLogin)}
                className="text-xs text-slate-400 hover:text-white transition-colors decoration-slate-400/30 font-medium"
            >
                {isLogin ? (
                  <>אין לך חשבון? <span className="text-purple-400 font-bold ml-1">הירשם עכשיו</span></>
                ) : (
                  <>כבר רשום? <span className="text-purple-400 font-bold ml-1">התחבר כאן</span></>
                )}
            </button>
        </div>
      </div>
    </div>
  );
}
