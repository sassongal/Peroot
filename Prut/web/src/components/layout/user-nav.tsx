
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";
import { User as UserIcon, Settings, LogOut, Power } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface UserMenuProps {
  user: User | null;
  position: "top" | "bottom";
}

export function UserMenu({ user, position }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success("התנתקת בהצלחה");
      window.location.href = '/?logged-out=true';
    } catch (error: any) {
      toast.error("שגיאה בהתנתקות: " + error.message);
    }
  };

  if (!mounted) return null;

  // Debugging
  if (user) {
    console.log(`[Peroot] User detected: ${user.email} at ${position}`);
  }

  const metadata = user?.user_metadata || {};
  const avatarUrl = metadata.avatar_url || 
                    metadata.picture || 
                    metadata.avatar ||
                    metadata.image ||
                    user?.identities?.[0]?.identity_data?.avatar_url ||
                    user?.identities?.[0]?.identity_data?.picture;

  // TOP POSITION: Only for guests
  if (position === "top") {
    if (user) return null;
    return (
      <div className="flex items-center gap-3 animate-in fade-in duration-700">
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-zinc-900/80 border border-white/10 rounded-full backdrop-blur-md">
            <div className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-pulse" />
            <span className="text-[10px] font-bold text-slate-400 tracking-tight uppercase">Guest Mode</span>
        </div>
        <Link 
            href="/login"
            className="flex items-center gap-2 px-4 py-2 bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/30 rounded-full text-sm font-semibold text-white transition-all group shadow-2xl"
            suppressHydrationWarning
        >
            <UserIcon className="w-4 h-4 group-hover:scale-110 transition-transform text-purple-400" />
            <span>התחבר / הירשם</span>
        </Link>
      </div>
    );
  }

  // BOTTOM POSITION: Only for logged-in users
  if (position === "bottom") {
    if (!user) return null;
    return (
      <div className="flex flex-col gap-4 animate-in slide-in-from-left-4 duration-500">
        {isOpen && (
          <div className="w-64 bg-zinc-950/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden mb-2 z-[9999]">
             <div className="p-4 border-b border-white/10 flex items-center gap-3 bg-white/5">
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
             <div className="p-2 space-y-1">
                <button 
                  onClick={() => setIsOpen(false)}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-300 hover:bg-white/10 rounded-xl transition-colors text-right"
                >
                    <Settings className="w-4 h-4" />
                    <span>הגדרות חשבון</span>
                </button>
                <button 
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-xl transition-colors text-right"
                >
                    <Power className="w-4 h-4" />
                    <span>התנתקות מהמערכת</span>
                </button>
             </div>
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2.5 group px-4 py-2 hover:bg-white/5 rounded-xl transition-all border border-transparent hover:border-white/10"
          >
            <LogOut className="w-4 h-4 text-slate-500 group-hover:text-red-400 transition-colors" />
            <span className="text-sm font-semibold text-slate-400 group-hover:text-white transition-colors">Sign Out</span>
          </button>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-all overflow-hidden shadow-2xl relative active:scale-95 hover:ring-2 hover:ring-purple-500/50"
          >
            {avatarUrl ? (
              <img 
                src={avatarUrl} 
                alt="User" 
                className="w-full h-full object-cover transition-transform duration-500 hover:scale-110" 
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(metadata.full_name || user.email || 'U')}&background=random`;
                }}
              />
            ) : (
              <UserIcon className="w-5 h-5 text-slate-400" />
            )}
          </button>
        </div>
      </div>
    );
  }

  return null;
}
