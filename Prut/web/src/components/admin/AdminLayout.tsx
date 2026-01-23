"use client";

import { ReactNode, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutDashboard, 
  FileText, 
  Settings, 
  BarChart3, 
  Users,
  Database,
  LogOut,
  Home,
  AlertCircle,
  Activity
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AdminLayoutProps {
  children: ReactNode;
}

const navigation = [
  { name: "סקירה כללית", href: "/admin", icon: LayoutDashboard },
  { name: "ניהול פרומפטים", href: "/admin/prompts", icon: FileText },
  { name: "הגדרות אתר", href: "/admin/settings", icon: Settings },
  { name: "סטטיסטיקות", href: "/admin/analytics", icon: BarChart3 },
  { name: "משתמשים", href: "/admin/users", icon: Users },
  { name: "מסד נתונים", href: "/admin/database", icon: Database },
  { name: "יומן פעילות", href: "/admin/activity", icon: Activity },
];

export function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  const checkAdminStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/is-admin');
      const data = await response.json();
      
      if (!data.isAdmin) {
        router.push('/');
      } else {
        setIsAdmin(true);
      }
    } catch (error) {
      console.error('Failed to verify admin status:', error);
      router.push('/');
    }
  }, [router]);

  useEffect(() => {
    queueMicrotask(() => checkAdminStatus());
  }, [checkAdminStatus]);

  if (isAdmin === null) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">מאמת הרשאות...</div>
      </div>
    );
  }

  if (isAdmin === false) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto" />
          <h1 className="text-2xl font-bold text-white">אין הרשאה</h1>
          <p className="text-slate-400">אין לך הרשאות מנהל</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Sidebar */}
      <div className="fixed inset-y-0 right-0 z-50 w-72 bg-gradient-to-b from-slate-900 to-black border-l border-white/10">
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-6 border-b border-white/10">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <LayoutDashboard className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold">Peroot Admin</h1>
            <p className="text-xs text-slate-400">לוח בקרה מתקדם</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== "/admin" && pathname?.startsWith(item.href));
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                  isActive
                    ? "bg-white/10 text-white shadow-lg shadow-white/5"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                )}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10 space-y-2">
          <Link
            href="/"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-white/5 hover:text-white transition-all"
          >
            <Home className="w-5 h-5" />
            <span className="font-medium">חזרה לאתר</span>
          </Link>
          <button
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">התנתקות</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="mr-72">
        <div className="max-w-7xl mx-auto p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
