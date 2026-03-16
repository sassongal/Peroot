
"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Loader2, ShieldOff } from "lucide-react";

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [revoked, setRevoked] = useState(false);
  const initialCheckDone = useRef(false);
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/");
        return;
      }

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin");

      const isAdmin = !!(roles && roles.length > 0);

      if (isAdmin) {
        setIsAuthorized(true);
        setRevoked(false);
      } else {
        if (initialCheckDone.current) {
          setIsAuthorized(false);
          setRevoked(true);
          redirectTimerRef.current = setTimeout(() => {
            router.replace("/");
          }, 2500);
        } else {
          setIsAuthorized(false);
          router.replace("/");
        }
      }

      if (!initialCheckDone.current) {
        initialCheckDone.current = true;
        setLoading(false);
      }
    };

    checkAuth();

    const interval = setInterval(checkAuth, 5 * 60 * 1000);
    return () => {
      clearInterval(interval);
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
    };
  }, [router]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
      </div>
    );
  }

  if (revoked) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-black" dir="rtl">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10">
          <ShieldOff className="h-10 w-10 text-red-400" />
        </div>
        <h2 className="text-xl font-bold text-white">הגישה בוטלה</h2>
        <p className="text-sm text-slate-400">הרשאות הניהול שלך בוטלו. מועבר/ת לדף הבית...</p>
        <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
      </div>
    );
  }

  if (!isAuthorized) return null;

  return <>{children}</>;
}
