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
 * edge fade-out gradients. Logos are rendered as CSS masks over
 * `--text-primary`, so they're true monochrome and auto-adapt to light/dark
 * mode regardless of their source colors. Pure CSS animation (GPU-
 * accelerated), respects prefers-reduced-motion, and uses locally-hosted
 * SVG/PNG logos under `public/logos/platforms/` — zero runtime deps.
 */
function Logo({ platform }: { platform: Platform }) {
  const common =
    "opacity-60 transition-all duration-300 group-hover/item:opacity-100 group-hover/item:scale-105";

  if (platform.logo) {
    // CSS mask approach: render the logo shape as a mask on a block of
    // currentColor. This gives us true monochrome logos that auto-adapt to
    // light/dark mode (follow --text-primary), regardless of the SVG/PNG's
    // own internal colors. Works for both vector and raster sources because
    // raster masks use the alpha channel.
    return (
      <span
        role="img"
        aria-label={platform.name}
        className={`block h-7 w-10 bg-[var(--text-primary)] ${common}`}
        style={{
          WebkitMaskImage: `url(${platform.logo})`,
          maskImage: `url(${platform.logo})`,
          WebkitMaskRepeat: "no-repeat",
          maskRepeat: "no-repeat",
          WebkitMaskPosition: "center",
          maskPosition: "center",
          WebkitMaskSize: "contain",
          maskSize: "contain",
        }}
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
        className="flex w-max items-center gap-10 md:gap-14 marquee-track group-hover/track:paused"
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
        <span className="text-xs font-medium text-(--text-muted) tracking-wide">
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
