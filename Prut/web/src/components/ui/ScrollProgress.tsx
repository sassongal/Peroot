"use client";

import { motion, useScroll, useSpring } from "framer-motion";

export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  // spring smooths out jitter on fast scrolls
  const scaleX = useSpring(scrollYProgress, { stiffness: 200, damping: 40, restDelta: 0.001 });

  return (
    <motion.div
      style={{ scaleX }}
      className="fixed top-0 right-0 left-0 h-[2px] bg-gradient-to-l from-amber-500 via-yellow-400 to-amber-600 origin-right z-[200]"
      aria-hidden="true"
    />
  );
}
