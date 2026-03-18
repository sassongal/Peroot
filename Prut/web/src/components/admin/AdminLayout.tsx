"use client";

import { ReactNode, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Settings,
  Users,
  Database,
  LogOut,
  Home,
  AlertCircle,
  Activity,
  Cpu,
  ChevronLeft,
  Command,
  Layers,
  DollarSign,
  PenTool,
  Globe,
  Menu,
  X,
  Radio,
  HeartPulse,
  TrendingUp,
  Mail,
  FlaskConical,
  Search,
  Filter,
  Bell,
  Shield,
  GitBranch,
  Plug,
  Factory,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getApiPath } from "@/lib/api-path";
import { logger } from "@/lib/logger";

interface AdminLayoutProps {
  children: ReactNode;
}

import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { useI18n } from "@/context/I18nContext";

export function AdminLayout({ children }: AdminLayoutProps) {
  const t = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigation = [
    // ── Core ──
    { name: t.admin.layout.dashboard, href: "/admin", icon: LayoutDashboard },
    { name: t.admin.layout.costs || "Costs", href: "/admin/costs", icon: DollarSign },
    { name: t.admin.layout.engines, href: "/admin/engines", icon: Cpu },
    { name: t.admin.layout.library, href: "/admin/library", icon: FileText },
    { name: t.admin.layout.users, href: "/admin/users", icon: Users },
    { name: t.admin.layout.database, href: "/admin/database", icon: Database },
    { name: t.admin.layout.telemetry, href: "/admin/activity", icon: Activity },
    { name: "בלוג", href: "/admin/blog", icon: PenTool },
    // ── Analytics & Insights ──
    { name: "Google Analytics", href: "/admin/google-analytics", icon: Globe },
    { name: "הכנסות", href: "/admin/revenue", icon: TrendingUp },
    { name: "משפך המרה", href: "/admin/funnel", icon: Filter },
    { name: "ניסויים", href: "/admin/experiments", icon: FlaskConical },
    // ── Operations ──
    { name: "זמן אמת", href: "/admin/realtime", icon: Radio },
    { name: "בריאות מערכת", href: "/admin/health", icon: HeartPulse },
    { name: "התראות", href: "/admin/notifications", icon: Bell },
    { name: "ביקורת מנהלים", href: "/admin/audit", icon: Shield },
    // ── Content & Outreach ──
    { name: "מפעל תוכן", href: "/admin/content-factory", icon: Factory },
    { name: "מודרציה", href: "/admin/moderation", icon: GitBranch },
    { name: "קמפיינים", href: "/admin/email-campaigns", icon: Mail },
    { name: "SEO", href: "/admin/seo-console", icon: Search },
    { name: "אינטגרציות", href: "/admin/integrations", icon: Plug },
    // ── System ──
    { name: t.admin.layout.settings, href: "/admin/settings", icon: Settings },
  ];

  const checkAdminStatus = useCallback(async () => {
    try {
      const response = await fetch(getApiPath('/api/admin/is-admin'));
      const data = await response.json();
      
      if (!data.isAdmin) {
        router.push('/');
      } else {
        setIsAdmin(true);
      }
    } catch (error) {
      logger.error('Failed to verify admin status:', error);
      router.push('/');
    }
  }, [router]);

  useEffect(() => {
    queueMicrotask(() => checkAdminStatus());
  }, [checkAdminStatus]);

  if (isAdmin === null) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
        <Layers className="w-12 h-12 text-blue-500 animate-pulse" />
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-700">{t.admin.dashboard.loading}</span>
      </div>
    );
  }

  if (isAdmin === false) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-10">
        <div className="text-center space-y-6 max-w-sm">
          <div className="p-6 rounded-full bg-red-500/10 border border-red-500/20 inline-block">
            <AlertCircle className="w-12 h-12 text-red-500" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">Access Denied</h1>
          <p className="text-slate-500 font-medium">{t.auth.unexpected_error || "המזהה שלך אינו מורשה לגשת לליבת המערכת של Nexus Admin."}</p>
          <Link href="/" className="inline-block px-8 py-3 bg-white text-black rounded-xl font-bold transition-all hover:bg-slate-200">
             {t.common.back || "חזרה לדף הבית"}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white selection:bg-blue-500">

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Nexus */}
      <div className={cn(
        "fixed inset-y-0 end-0 z-50 w-80 bg-zinc-950 border-s border-white/5 flex flex-col transition-transform duration-300",
        "lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
      )}>

        {/* Header Section */}
        <div className="p-8 border-b border-white/5">
          <div className="flex items-center gap-4 group cursor-default">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center shadow-2xl shadow-blue-500/20 group-hover:scale-110 transition-transform">
              <Command className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-black tracking-tighter text-white">NEXUS ADMIN</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">v2.1 Stable</span>
              </div>
            </div>
            {/* Close button - mobile only */}
            <button
              className="lg:hidden p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
              onClick={() => setSidebarOpen(false)}
              aria-label="סגור תפריט"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Core */}
        <nav className="flex-1 p-6 space-y-2 overflow-y-auto custom-scrollbar">
          <div className="px-4 mb-4 text-[9px] font-black text-zinc-600 uppercase tracking-[0.2em]">Core Subsystems</div>
          {navigation.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== "/admin" && pathname?.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "group flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all duration-300 relative overflow-hidden",
                  isActive
                    ? "bg-blue-600 text-white shadow-3xl shadow-blue-600/20"
                    : "text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.03]"
                )}
              >
                <div className="flex items-center gap-4 relative z-10">
                  <item.icon className={cn("w-5 h-5 transition-colors", isActive ? "text-white" : "group-hover:text-blue-400")} />
                  <span className="text-sm font-bold tracking-tight">{item.name}</span>
                </div>
                {isActive && (
                  <div className="absolute end-0 top-0 bottom-0 w-1 bg-white/20" />
                )}
                {!isActive && (
                  <ChevronLeft className="w-3 h-3 opacity-0 group-hover:opacity-40 transition-all -translate-x-2 group-hover:translate-x-0" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Account / Footer */}
        <div className="p-6 border-t border-white/5 bg-zinc-950/80 backdrop-blur-xl">
          <div className="space-y-3">
            <Link
              href="/"
              className="flex items-center gap-4 px-4 py-3 rounded-2xl text-zinc-400 hover:text-white hover:bg-white/5 transition-all text-sm font-bold"
            >
              <Home className="w-4 h-4" />
              {t.common.back || "חזרה לאתר"}
            </Link>
            <button
              className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-rose-500 hover:bg-rose-500/10 transition-all text-sm font-bold border border-rose-500/0 hover:border-rose-500/20"
              onClick={() => fetch(getApiPath('/api/auth/signout'), { method: 'POST' }).then(() => window.location.href = "/")}
            >
              <LogOut className="w-4 h-4" />
              {t.admin.layout.logout}
            </button>
          </div>
        </div>
      </div>

      {/* Primary Viewport */}
      <div className="lg:me-80">
        {/* Mobile top bar with hamburger */}
        <div className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-zinc-950/90 backdrop-blur-md border-b border-white/5">
          <span className="text-sm font-black tracking-tighter text-white">NEXUS ADMIN</span>
          <button
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
            onClick={() => setSidebarOpen(true)}
            aria-label="פתח תפריט"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        <main className="max-w-6xl mx-auto p-6 lg:p-12 min-h-screen">
          {/* View Transition Effect */}
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-700">
            <ErrorBoundary name="AdminContent">
              {children}
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
}
