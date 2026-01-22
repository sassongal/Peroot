/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function TopLogo() {
  const pathname = usePathname();
  if (pathname === "/") return null;

  return (
    <div className="fixed top-6 right-6 z-[9999]">
      <Link href="/" className="block">
        <img
          src="/assets/branding/logo.svg"
          alt="Peroot"
          className="h-14 md:h-20 w-auto drop-shadow-[0_12px_30px_rgba(0,0,0,0.6)]"
        />
      </Link>
    </div>
  );
}
