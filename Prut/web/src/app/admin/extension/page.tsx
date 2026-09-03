"use client";

import { lazy, Suspense } from "react";
import { RefreshCw } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";

const ExtensionTab = lazy(() =>
  import("@/components/admin/tabs/ExtensionTab").then((m) => ({ default: m.ExtensionTab })),
);

export default function ExtensionAdminPage() {
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
          <ExtensionTab />
        </Suspense>
      </div>
    </AdminLayout>
  );
}
