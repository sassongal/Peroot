/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLibraryContext } from "@/context/LibraryContext";

export function TopLogo() {
  const pathname = usePathname();
  const { viewMode } = useLibraryContext();
  
  // Show logo if we are NOT on root OR if we are on root but in a sub-view (personal/library)
  // Actually, page.tsx renders everything on "/", so we check viewMode.
  // If viewMode is 'home', we hide it (because home has the big logo).
  // If viewMode is 'library' or 'personal', we show it.
  
  const isHomeView = pathname === "/" && viewMode === "home";
  if (isHomeView) return null;

  return (
    <div className="fixed top-6 right-6 z-[9999]">
      <Link href="/" className="block">
        <img
          src="/assets/branding/logo.svg"
          alt="Peroot"
          className="h-8 md:h-10 w-auto drop-shadow-[0_12px_30px_rgba(0,0,0,0.6)]"
        />
      </Link>
    </div>
  );
}
