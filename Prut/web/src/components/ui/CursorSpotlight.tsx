"use client";

import { useEffect } from "react";
import { motion, useMotionValue, useSpring, useMotionTemplate } from "framer-motion";

export function CursorSpotlight() {
  // Start far off-screen so the orb isn't visible on mount
  const mouseX = useMotionValue(-2000);
  const mouseY = useMotionValue(-2000);

  const springX = useSpring(mouseX, { stiffness: 80, damping: 22 });
  const springY = useSpring(mouseY, { stiffness: 80, damping: 22 });

  const background = useMotionTemplate`radial-gradient(600px circle at ${springX}px ${springY}px, rgba(245,158,11,0.09), transparent 80%)`;

  useEffect(() => {
    // Only register on pointer devices (not touch)
    if (window.matchMedia("(hover: none)").matches) return;

    const handleMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };

    window.addEventListener("mousemove", handleMove);
    return () => window.removeEventListener("mousemove", handleMove);
  }, [mouseX, mouseY]);

  return (
    <motion.div
      className="pointer-events-none fixed inset-0 z-[2]"
      style={{ background }}
      aria-hidden="true"
    />
  );
}
