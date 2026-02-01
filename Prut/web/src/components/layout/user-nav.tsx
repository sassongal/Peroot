
/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";
import { User as UserIcon, Settings, LogOut } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { getAssetPath } from "@/lib/asset-path";

interface UserMenuProps {
  user: User | null;
  position: "top" | "bottom";
}

import { useI18n } from "@/context/I18nContext";

export function UserMenu({ user, position }: UserMenuProps) {
  const t = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const supabase = createClient();

  const getErrorMessage = (err: unknown) =>
    err instanceof Error ? err.message : t.auth.unexpected_error;

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success(t.auth.logout_success);
      window.location.href = '/?logged-out=true';
    } catch (err) {
      toast.error(t.auth.logout_error + ": " + getErrorMessage(err));
    }
  };

  if (!mounted) return null;

  const metadata = user?.user_metadata || {};
  const avatarUrl = metadata.avatar_url ||
                    metadata.picture ||
                    metadata.avatar ||
                    metadata.image ||
                    user?.identities?.[0]?.identity_data?.avatar_url ||
                    user?.identities?.[0]?.identity_data?.picture;

  // TOP POSITION: For guests (login button) OR logged-in users (avatar + menu)
  if (position === "top") {
    if (!user) {
      // Guest - show Guest Mode indicator and login button
      return (
        <div className="flex items-center gap-3 animate-in fade-in duration-700">
          <div className="flex flex-col items-end hidden md:flex">
             <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                <span className="text-[10px] font-medium text-amber-400">{t.auth.guest_mode}</span>
             </div>
          </div>
          <Link
              href="/login"
              className="flex items-center gap-2 px-4 py-2 bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/30 rounded-full text-sm font-semibold text-white transition-all group shadow-2xl"
              suppressHydrationWarning
          >
              <UserIcon className="w-4 h-4 group-hover:scale-110 transition-transform text-purple-400" />
              <span>{t.auth.login_signup}</span>
          </Link>
        </div>
      );
    }

    // Logged in user - show avatar and dropdown menu
    return (
      <div className="relative flex items-center gap-3 animate-in fade-in duration-700">
        <div className="flex flex-col items-end hidden md:flex">
             <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                <span className="text-[10px] font-medium text-emerald-400">{t.auth.connected}</span>
             </div>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-all overflow-hidden shadow-2xl relative active:scale-95 hover:ring-2 hover:ring-purple-500/50"
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="User"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(metadata.full_name || user.email || 'U')}&background=random`;
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white font-bold bg-gradient-to-br from-purple-500 to-blue-500">
              {user.email?.[0].toUpperCase()}
            </div>
          )}
        </button>

        {isOpen && (
          <>
            {/* Backdrop to close menu */}
            <div
              className="fixed inset-0 z-[9998]"
              onClick={() => setIsOpen(false)}
            />
            {/* Dropdown menu */}
            <div className="absolute top-12 left-0 w-64 bg-zinc-950/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[9999] animate-in fade-in slide-in-from-top-2 duration-200">
               <div className="p-4 border-b border-white/10 flex flex-col gap-3 bg-white/5">
                   {/* Embedded Logo in Menu */}
                   <div className="flex justify-center pb-2 border-b border-white/5">
                        <img src={getAssetPath("/logo.svg")} alt="Peroot" className="h-5 w-auto opacity-70" />
                   </div>
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 overflow-hidden shrink-0 border border-white/10">
                        {avatarUrl ? (
                          <img
                            src={avatarUrl}
                            alt=""
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(metadata.full_name || user.email || 'U')}&background=random`;
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white font-bold opacity-60">
                            {user.email?.[0].toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white truncate">
                            {metadata.full_name || user.email?.split('@')[0]}
                        </p>
                        <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
                      </div>
                   </div>
               </div>
               <div className="p-2 space-y-1">
                  <Link
                    href="/settings"
                    onClick={() => setIsOpen(false)}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-300 hover:bg-white/10 rounded-xl transition-colors text-right"
                  >
                      <Settings className="w-4 h-4" />
                      <span>{t.auth.account_settings}</span>
                  </Link>
               </div>
            </div>
          </>
        )}
      </div>
    );
  }

  // BOTTOM POSITION: Only for logged-in users - just the sign out button
  if (position === "bottom") {
    if (!user) return null;
    return (
      <div className="flex items-center animate-in slide-in-from-left-4 duration-500">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2.5 group px-4 py-2 hover:bg-white/5 rounded-xl transition-all border border-transparent hover:border-white/10"
        >
          <LogOut className="w-4 h-4 text-slate-500 group-hover:text-red-400 transition-colors" />
          <span className="text-sm font-semibold text-slate-400 group-hover:text-white transition-colors">{t.auth.logout}</span>
        </button>
      </div>
    );
  }

  return null;
}
