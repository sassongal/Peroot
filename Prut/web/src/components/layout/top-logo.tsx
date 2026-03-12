"use client";

import Link from "next/link";
import { getAssetPath } from "@/lib/asset-path";
import Image from "next/image";

export function TopLogo({ hidden }: { hidden?: boolean }) {
  if (hidden) return null;

  return (
    <div className="fixed top-6 right-6 z-[9999] pointer-events-none px-2 md:px-6 hidden md:block">
      <Link href="/" className="pointer-events-auto block hover:opacity-80 transition-opacity">
        <Image
          src={getAssetPath("/assets/branding/logo.svg")}
          alt="Peroot"
          width={40}
          height={40}
          className="h-8 md:h-10 w-auto drop-shadow-[0_12px_30px_rgba(0,0,0,0.6)]"
        />
      </Link>
    </div>
  );
}
