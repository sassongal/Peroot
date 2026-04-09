"use client";

import { memo } from "react";
import {
  PLATFORMS_TEXT_CODE,
  PLATFORMS_IMAGE_VIDEO,
  type Platform,
} from "@/lib/supported-platforms";

/**
 * SupportedPlatforms — dual-marquee showcase of every AI engine Peroot supports.
 *
 * Design: two infinite horizontal rows running in opposite directions, with
 * edge fade-out gradients. Logos are monochrome by default and bloom to full
 * color on hover. Pure CSS animation (GPU-accelerated), respects
 * prefers-reduced-motion, and uses locally-hosted SVG logos (under
 * `public/logos/platforms/`) so there's no external runtime dependency.
 */
function Logo({ platform }: { platform: Platform }) {
  const common =
    "opacity-60 grayscale transition-all duration-300 group-hover/item:opacity-100 group-hover/item:grayscale-0 group-hover/item:scale-105";

  if (platform.logo) {
    return (
      // next/image doesn't optimize SVGs; plain img keeps payload minimal and avoids config
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={platform.logo}
        alt={platform.name}
        loading="lazy"
        decoding="async"
        className={`h-7 w-auto object-contain ${common}`}
        draggable={false}
      />
    );
  }

  // Text-wordmark fallback for platforms without a local logo file
  return (
    <span
      className={`text-base md:text-lg font-semibold tracking-tight text-[var(--text-primary)] ${common}`}
    >
      {platform.name}
    </span>
  );
}

function MarqueeRow({
  platforms,
  direction,
  durationSeconds,
}: {
  platforms: Platform[];
  direction: "left" | "right";
  durationSeconds: number;
}) {
  // Duplicate the list for a seamless loop (track translates -50%)
  const doubled = [...platforms, ...platforms];

  return (
    <div className="group/track relative overflow-hidden" dir="ltr">
      <div
        className="flex w-max items-center gap-10 md:gap-14 marquee-track group-hover/track:[animation-play-state:paused]"
        style={{
          animationName: direction === "left" ? "peroot-marquee-left" : "peroot-marquee-right",
          animationDuration: `${durationSeconds}s`,
          animationTimingFunction: "linear",
          animationIterationCount: "infinite",
        }}
      >
        {doubled.map((p, i) => (
          <div
            key={`${p.id}-${i}`}
            className="group/item flex shrink-0 items-center justify-center h-10 min-w-[88px]"
            aria-label={p.name}
          >
            <Logo platform={p} />
          </div>
        ))}
      </div>
    </div>
  );
}

function SupportedPlatformsImpl() {
  return (
    <section
      aria-label="פלטפורמות נתמכות"
      className="mt-6 mb-4 -mx-4 md:-mx-6 select-none"
    >
      {/* Local keyframes + reduced-motion + edge fade */}
      <style jsx>{`
        @keyframes peroot-marquee-left {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        @keyframes peroot-marquee-right {
          from { transform: translateX(-50%); }
          to   { transform: translateX(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          :global(.marquee-track) {
            animation: none !important;
          }
        }
        .marquee-fade {
          mask-image: linear-gradient(
            to right,
            transparent 0%,
            black 8%,
            black 92%,
            transparent 100%
          );
          -webkit-mask-image: linear-gradient(
            to right,
            transparent 0%,
            black 8%,
            black 92%,
            transparent 100%
          );
        }
      `}</style>

      <div className="flex items-center justify-center mb-3 px-4">
        <span className="text-xs font-medium text-[var(--text-muted)] tracking-wide">
          לכל מנוע שפה משלו. פרוט מדבר את כולן.
        </span>
      </div>

      <div className="marquee-fade flex flex-col gap-4">
        <MarqueeRow platforms={PLATFORMS_TEXT_CODE} direction="left" durationSeconds={50} />
        <MarqueeRow platforms={PLATFORMS_IMAGE_VIDEO} direction="right" durationSeconds={55} />
      </div>
    </section>
  );
}

export const SupportedPlatforms = memo(SupportedPlatformsImpl);
