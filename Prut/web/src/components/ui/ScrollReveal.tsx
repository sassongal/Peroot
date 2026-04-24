"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

interface ScrollRevealProps {
  children: ReactNode;
  delay?: number;
  fromX?: number;
  fromY?: number;
  className?: string;
}

export function ScrollReveal({
  children,
  delay = 0,
  fromX = 0,
  fromY = 32,
  className,
}: ScrollRevealProps) {
  const prefersReduced = useReducedMotion();

  return (
    <motion.div
      initial={{
        opacity: 0,
        x: prefersReduced ? 0 : fromX,
        y: prefersReduced ? 0 : fromY,
      }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, margin: "-90px" }}
      transition={{
        duration: 0.65,
        delay,
        ease: [0.21, 0.47, 0.32, 0.98],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
