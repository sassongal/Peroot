"use client";

import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";

export function FeaturesHeroParallax() {
  const prefersReduced = useReducedMotion();
  const { scrollY } = useScroll();

  const letterY = useTransform(scrollY, [0, 600], [0, prefersReduced ? 0 : -120]);
  const letterOpacity = useTransform(scrollY, [0, 400], [1, 0]);
  const orb1Y = useTransform(scrollY, [0, 600], [0, prefersReduced ? 0 : -70]);
  const orb2Y = useTransform(scrollY, [0, 600], [0, prefersReduced ? 0 : -35]);
  const orb3Y = useTransform(scrollY, [0, 600], [0, prefersReduced ? 0 : -140]);

  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none select-none"
      aria-hidden="true"
    >
      {/* Large faded Hebrew letter פ — brand parallax anchor */}
      <motion.div
        style={{ y: letterY, opacity: letterOpacity }}
        className="absolute -top-16 left-1/2 -translate-x-1/2 font-serif font-black leading-none text-[360px] md:text-[520px] text-amber-400/[0.055] dark:text-amber-300/[0.045]"
      >
        פ
      </motion.div>

      {/* Orb 1 — top right, slow */}
      <motion.div
        style={{ y: orb1Y }}
        className="absolute top-0 right-[15%] w-80 h-80 rounded-full bg-amber-500/[0.075] dark:bg-amber-500/[0.055] blur-3xl"
      />
      {/* Orb 2 — center left, medium */}
      <motion.div
        style={{ y: orb2Y }}
        className="absolute top-28 left-[20%] w-60 h-60 rounded-full bg-yellow-400/[0.065] blur-2xl"
      />
      {/* Orb 3 — top far right, fast */}
      <motion.div
        style={{ y: orb3Y }}
        className="absolute -top-24 right-[2%] w-[480px] h-[480px] rounded-full bg-orange-500/[0.04] blur-[90px]"
      />
    </div>
  );
}
