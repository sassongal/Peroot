"use client";

import { lazy, Suspense } from "react";
import { RefreshCw } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";

const LanguageEvalTab = lazy(() =>
  import("@/components/admin/tabs/LanguageEvalTab").then((m) => ({
    default: m.LanguageEvalTab,
  })),
);

export default function LanguagesAdminPage() {
  return (
    <AdminLayout>
      <div className="space-y-8 animate-in fade-in duration-700 pb-20" dir="rtl">
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-32">
              <RefreshCw className="w-8 h-8 animate-spin text-amber-500/30" />
            </div>
          }
        >
          <LanguageEvalTab />
        </Suspense>
      </div>
    </AdminLayout>
  );
}
