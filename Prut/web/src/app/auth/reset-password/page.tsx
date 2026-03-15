"use client";

import { useState, useTransition } from "react";
import { Loader2, ArrowRight, Lock, Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { getAssetPath } from "@/lib/asset-path";
import Image from "next/image";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!password || !confirmPassword) {
      toast.error("אנא מלא/י את כל השדות");
      return;
    }

    if (password.length < 6) {
      toast.error("הסיסמה חייבת להכיל לפחות 6 תווים");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("הסיסמאות אינן תואמות");
      return;
    }

    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        toast.error("שגיאה בעדכון הסיסמה: " + error.message);
      } else {
        setDone(true);
        toast.success("הסיסמה עודכנה בהצלחה!");
        setTimeout(() => {
          router.push("/login");
        }, 2000);
      }
    });
  };

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="min-h-screen bg-black text-silver font-sans relative overflow-hidden flex items-center justify-center p-4"
      dir="rtl"
    >
      {/* Background Gradients */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-amber-900/10 blur-[150px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-yellow-900/10 blur-[150px] rounded-full" />
        <div
          className="absolute inset-0 opacity-20"
          style={{ backgroundImage: `url(${getAssetPath("/noise.svg")})` }}
        />
      </div>

      <div className="relative z-10 w-full max-w-md animate-in fade-in zoom-in duration-500">
        <div className="glass-card p-8 rounded-2xl border border-white/10 bg-black/40 shadow-2xl shadow-black/50">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <Image
              src={getAssetPath("/assets/branding/logo.svg")}
              alt="לוגו פרוט"
              width={48}
              height={48}
              className="h-12 w-auto brightness-110 contrast-110"
            />
          </div>

          {done ? (
            /* Success state */
            <div className="space-y-6 text-center animate-in fade-in zoom-in-95 duration-500">
              <div className="flex justify-center">
                <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center">
                  <Lock className="w-10 h-10 text-amber-400" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-white">הסיסמה עודכנה!</h2>
              <p className="text-slate-400 text-sm">
                מיד תועבר/י לדף הכניסה...
              </p>
              <Loader2 className="w-5 h-5 animate-spin text-amber-400 mx-auto" />
            </div>
          ) : (
            /* Form state */
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="text-center space-y-3">
                <h1 className="text-3xl font-bold tracking-tight text-white">
                  הגדרת סיסמה חדשה
                </h1>
                <p className="text-sm text-slate-400 font-medium">
                  בחר/י סיסמה חדשה לחשבון שלך
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* New password */}
                <div className="relative group">
                  <label htmlFor="new-password" className="sr-only">
                    סיסמה חדשה
                  </label>
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-amber-400 transition-colors" />
                  <input
                    id="new-password"
                    dir="rtl"
                    type={showPassword ? "text" : "password"}
                    placeholder="סיסמה חדשה"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pe-11 ps-11 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500/50 focus:bg-white/10 transition-all shadow-inner"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                    aria-label={showPassword ? "הסתר סיסמה" : "הצג סיסמה"}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Confirm password */}
                <div className="relative group">
                  <label htmlFor="confirm-password" className="sr-only">
                    אימות סיסמה
                  </label>
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-amber-400 transition-colors" />
                  <input
                    id="confirm-password"
                    dir="rtl"
                    type={showConfirm ? "text" : "password"}
                    placeholder="אימות סיסמה"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pe-11 ps-11 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500/50 focus:bg-white/10 transition-all shadow-inner"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                    aria-label={showConfirm ? "הסתר סיסמה" : "הצג סיסמה"}
                  >
                    {showConfirm ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
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
                      <span>עדכון סיסמה</span>
                      <ArrowRight className="w-4 h-4 rtl-flip" />
                    </>
                  )}
                </button>
              </form>

              <div className="text-center">
                <a
                  href="/login"
                  className="text-xs text-slate-400 hover:text-white transition-colors font-medium"
                >
                  חזרה להתחברות
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
