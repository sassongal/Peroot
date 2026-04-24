"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

export function CtaPulse({ children }: { children: ReactNode }) {
  const prefersReduced = useReducedMotion();

  if (prefersReduced) return <div className="relative inline-flex">{children}</div>;

  return (
    <div className="relative inline-flex">
      {/* Pulsing ring */}
      <motion.span
        className="absolute inset-0 rounded-2xl"
        animate={{
          boxShadow: [
            "0 0 0 0px rgba(245,158,11,0.45)",
            "0 0 0 14px rgba(245,158,11,0)",
          ],
        }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
        aria-hidden="true"
      />
      {children}
    </div>
  );
}
