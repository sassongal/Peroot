"use client";

import { useRef } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useReducedMotion,
} from "framer-motion";
import type { ReactNode } from "react";

export function MockupFloatTilt({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const prefersReduced = useReducedMotion();

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [7, -7]), {
    stiffness: 200,
    damping: 28,
  });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-7, 7]), {
    stiffness: 200,
    damping: 28,
  });

  function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!ref.current || prefersReduced) return;
    const rect = ref.current.getBoundingClientRect();
    mouseX.set((e.clientX - rect.left) / rect.width - 0.5);
    mouseY.set((e.clientY - rect.top) / rect.height - 0.5);
  }

  function onMouseLeave() {
    mouseX.set(0);
    mouseY.set(0);
  }

  if (prefersReduced) return <>{children}</>;

  return (
    /* Outer: gentle continuous float */
    <motion.div
      animate={{ y: [0, -7, 0] }}
      transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
    >
      {/* Inner: mouse-driven 3D tilt */}
      <motion.div
        ref={ref}
        style={{ rotateX, rotateY, transformPerspective: 900 }}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        className="cursor-default"
      >
        {children}
      </motion.div>
    </motion.div>
  );
}
