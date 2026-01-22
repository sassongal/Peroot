"use client";

import { useRef } from "react";
import type { HTMLAttributes, PointerEvent } from "react";
import { cn } from "@/lib/utils";

export interface GlowingEdgeCardProps extends HTMLAttributes<HTMLDivElement> {
  contentClassName?: string;
}

const round = (value: number, precision = 3) => Number(value.toFixed(precision));
const clamp = (value: number, min = 0, max = 100) => Math.min(Math.max(value, min), max);

const centerOfElement = (rect: DOMRect) => [rect.width / 2, rect.height / 2] as const;

const getPointerPosition = (rect: DOMRect, e: PointerEvent<HTMLDivElement>) => {
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const px = clamp((100 / rect.width) * x);
  const py = clamp((100 / rect.height) * y);
  return { pixels: [x, y] as const, percent: [px, py] as const };
};

const angleFromPointer = (dx: number, dy: number) => {
  if (dx === 0 && dy === 0) return 0;
  let angle = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
  if (angle < 0) angle += 360;
  return angle;
};

const closenessToEdge = (rect: DOMRect, x: number, y: number) => {
  const [cx, cy] = centerOfElement(rect);
  const dx = x - cx;
  const dy = y - cy;
  const kx = dx === 0 ? Infinity : cx / Math.abs(dx);
  const ky = dy === 0 ? Infinity : cy / Math.abs(dy);
  return clamp(1 / Math.min(kx, ky), 0, 1);
};

export function GlowingEdgeCard({
  className,
  contentClassName,
  children,
  onPointerMove,
  onPointerLeave,
  style,
  ...props
}: GlowingEdgeCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const updatePointerVars = (rect: DOMRect, e: PointerEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const position = getPointerPosition(rect, e);
    const [px, py] = position.pixels;
    const [perx, pery] = position.percent;
    const [cx, cy] = centerOfElement(rect);
    const dx = px - cx;
    const dy = py - cy;
    const edge = closenessToEdge(rect, px, py);
    const angle = angleFromPointer(dx, dy);

    cardRef.current.style.setProperty("--pointer-x", `${round(perx)}%`);
    cardRef.current.style.setProperty("--pointer-y", `${round(pery)}%`);
    cardRef.current.style.setProperty("--pointer-deg", `${round(angle)}deg`);
    cardRef.current.style.setProperty("--pointer-d", `${round(edge * 100)}`);
  };

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    updatePointerVars(rect, e);
    onPointerMove?.(e);
  };

  const handlePointerLeave = (e: PointerEvent<HTMLDivElement>) => {
    if (cardRef.current) {
      cardRef.current.style.setProperty("--pointer-d", "0");
      cardRef.current.style.setProperty("--pointer-x", "50%");
      cardRef.current.style.setProperty("--pointer-y", "50%");
      cardRef.current.style.setProperty("--pointer-deg", "45deg");
    }
    onPointerLeave?.(e);
  };

  return (
    <div
      ref={cardRef}
      className={cn("glow-card group", className)}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      style={style}
      {...props}
    >
      <div className="glow-card__mesh-border" />
      <div className="glow-card__mesh-bg" />
      <div className="glow-card__glow" />
      <div
        className={cn(
          "glow-card__content relative z-10 h-full w-full overflow-hidden rounded-[inherit] border border-white/10 bg-black/40",
          contentClassName
        )}
      >
        {children}
      </div>
    </div>
  );
}
