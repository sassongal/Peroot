"use client";

import { lazy, Suspense, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { cn } from "@/lib/utils";
import { Factory, PenTool, FileText, Mail, Search } from "lucide-react";

// ── Lazy-loaded tab components ─────────────────────────────────────────────────

const ContentFactoryTab = lazy(() =>
  import("@/components/admin/tabs/ContentFactoryTab").then((m) => ({ default: m.ContentFactoryTab }))
);
const BlogTab = lazy(() =>
  import("@/components/admin/tabs/BlogTab").then((m) => ({ default: m.BlogTab }))
);
const LibraryTab = lazy(() =>
  import("@/components/admin/tabs/LibraryTab").then((m) => ({ default: m.LibraryTab }))
);
const EmailCampaignsTab = lazy(() =>
  import("@/components/admin/tabs/EmailCampaignsTab").then((m) => ({ default: m.EmailCampaignsTab }))
);
const SeoConsoleTab = lazy(() =>
  import("@/components/admin/tabs/SeoConsoleTab").then((m) => ({ default: m.SeoConsoleTab }))
);

// ── Types ──────────────────────────────────────────────────────────────────────

type TabId = "factory" | "blog" | "library" | "campaigns" | "seo";

interface TabConfig {
  id: TabId;
  label: string;
  icon: React.ElementType;
}

const TABS: TabConfig[] = [
  { id: "factory",   label: "מפעל תוכן", icon: Factory  },
  { id: "blog",      label: "בלוג",       icon: PenTool  },
  { id: "library",   label: "ספריה",      icon: FileText },
  { id: "campaigns", label: "קמפיינים",   icon: Mail     },
  { id: "seo",       label: "SEO",        icon: Search   },
];

// ── Tab loading skeleton ───────────────────────────────────────────────────────

function TabSkeleton() {
  return (
    <div className="flex flex-col gap-6 py-12 px-2 animate-pulse" dir="rtl">
      <div className="h-10 w-64 rounded-2xl bg-white/[0.04]" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 rounded-3xl bg-white/[0.03]" />
        ))}
      </div>
      <div className="h-64 rounded-3xl bg-white/[0.03]" />
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function ContentHubPage() {
  const [activeTab, setActiveTab] = useState<TabId>("factory");

  return (
    <AdminLayout>
      <div dir="rtl" className="space-y-8 animate-in fade-in duration-700 pb-24">

        {/* Page header */}
        <div className="space-y-1">
          <h1 className="text-4xl font-black text-white tracking-tight">Content Hub</h1>
          <p className="text-sm font-bold text-zinc-500">ניהול תוכן, בלוג, קמפיינים ו-SEO</p>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1.5 p-1.5 bg-zinc-950 border border-white/5 rounded-[28px] w-fit overflow-x-auto">
          {TABS.map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={cn(
                  "flex items-center gap-2 px-5 py-3 rounded-[20px] transition-all duration-200 shrink-0",
                  "font-black text-[10px] uppercase tracking-widest",
                  isActive
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                    : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <Suspense fallback={<TabSkeleton />}>
          {activeTab === "factory"   && <ContentFactoryTab />}
          {activeTab === "blog"      && <BlogTab />}
          {activeTab === "library"   && <LibraryTab />}
          {activeTab === "campaigns" && <EmailCampaignsTab />}
          {activeTab === "seo"       && <SeoConsoleTab />}
        </Suspense>

      </div>
    </AdminLayout>
  );
}
