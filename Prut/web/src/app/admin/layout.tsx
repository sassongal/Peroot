
"use client";

import { AdminGuard } from "@/components/admin/AdminGuard";
import { LayoutDashboard, Settings, Cpu, LogOut, Activity, Users, Database, Library, BarChart3 } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

import { useI18n } from "@/context/I18nContext";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const t = useI18n();
  const pathname = usePathname();
  const supabase = createClient();

  const navItems = [
    { label: t.admin.layout.dashboard, href: "/admin", icon: LayoutDashboard },
    { label: t.admin.layout.analytics, href: "/admin/analytics", icon: BarChart3 },
    { label: t.admin.layout.activity, href: "/admin/activity", icon: Activity },
    { label: t.admin.layout.users, href: "/admin/users", icon: Users },
    { label: t.admin.layout.engines, href: "/admin/engines", icon: Cpu },
    { label: t.admin.layout.library, href: "/admin/prompts", icon: Library },
    { label: t.admin.layout.database, href: "/admin/database", icon: Database },
    { label: t.admin.layout.settings, href: "/admin/settings", icon: Settings },
  ];

  return (
    <AdminGuard>
      <div className="min-h-screen bg-black text-slate-200 flex" dir="rtl">
        {/* Sidebar */}
        <aside className="w-64 border-l border-white/10 flex flex-col bg-zinc-950/50">
          <div className="p-6">
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Peroot Admin
            </h1>
          </div>

          <nav className="flex-1 px-4 space-y-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                    isActive
                      ? "bg-blue-500/10 text-blue-300 border border-blue-500/20"
                      : "hover:bg-white/5 text-slate-400 hover:text-slate-200"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-white/10">
            <button
              onClick={() => supabase.auth.signOut().then(() => window.location.href = "/")}
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-500/10 w-full transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span>{t.admin.layout.logout}</span>
            </button>
          </div>
        </aside>

        {/* content */}
        <main className="flex-1 overflow-auto">
             <div className="p-8 max-w-7xl mx-auto">
                 {children}
             </div>
        </main>
      </div>
    </AdminGuard>
  );
}
