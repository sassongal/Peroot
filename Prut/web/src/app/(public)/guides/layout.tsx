import type { ReactNode } from "react";

export default function GuidesLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-background text-foreground" dir="rtl">
      {children}
    </main>
  );
}
