"use client";

import React from "react";

// ---------------------------------------------------------------------------
// VIDEO PLATFORMS
// ---------------------------------------------------------------------------

/** Runway - stylized "R" with a diagonal runway stripe cutting through it */
export const RunwayIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    {/* R stem */}
    <rect x="4" y="3" width="2.5" height="18" rx="0.5" fill="currentColor" />
    {/* R bowl top bar */}
    <path
      d="M6.5 3 H13 C15.5 3 17 4.5 17 7 C17 9.5 15.5 11 13 11 H6.5 Z"
      fill="currentColor"
    />
    {/* R bowl cutout */}
    <path
      d="M7.5 4.5 H12.5 C14.2 4.5 15 5.5 15 7 C15 8.5 14.2 9.5 12.5 9.5 H7.5 Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="0"
    />
    <rect x="7.5" y="4.5" width="5" height="5" rx="2" fill="white" fillOpacity="0" />
    {/* R leg */}
    <path d="M10 11 L17 21" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    {/* Runway diagonal stripe - cuts across the icon */}
    <line
      x1="2"
      y1="20"
      x2="22"
      y2="8"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      opacity="0.45"
    />
  </svg>
);

/** Kling - bold "K" with film-frame accents near strokes */
export const KlingIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    {/* K vertical stem */}
    <rect x="4" y="3" width="2.5" height="18" rx="0.5" fill="currentColor" />
    {/* K upper arm */}
    <path d="M6.5 12 L16 3.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    {/* K lower arm */}
    <path d="M6.5 12 L16 20.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    {/* Film-frame accents - two small rectangles near the upper arm */}
    <rect x="17" y="2" width="3" height="2" rx="0.3" fill="currentColor" />
    <rect x="17" y="20" width="3" height="2" rx="0.3" fill="currentColor" />
    {/* Small tick marks on film frames */}
    <rect x="17.7" y="2" width="0.7" height="2" fill="currentColor" opacity="0.4" />
    <rect x="19" y="2" width="0.7" height="2" fill="currentColor" opacity="0.4" />
    <rect x="17.7" y="20" width="0.7" height="2" fill="currentColor" opacity="0.4" />
    <rect x="19" y="20" width="0.7" height="2" fill="currentColor" opacity="0.4" />
  </svg>
);

/** Sora - circle with an eye-like iris inside */
export const SoraIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    {/* Outer circle */}
    <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth="2" />
    {/* Eye-shaped iris */}
    <path
      d="M5.5 12 C7.5 7.5 16.5 7.5 18.5 12 C16.5 16.5 7.5 16.5 5.5 12 Z"
      fill="currentColor"
      opacity="0.25"
    />
    <path
      d="M5.5 12 C7.5 7.5 16.5 7.5 18.5 12 C16.5 16.5 7.5 16.5 5.5 12 Z"
      stroke="currentColor"
      strokeWidth="1.5"
      fill="none"
    />
    {/* Pupil */}
    <circle cx="12" cy="12" r="2.5" fill="currentColor" />
    {/* Highlight dot */}
    <circle cx="13.2" cy="10.8" r="0.7" fill="currentColor" opacity="0.5" />
  </svg>
);

/** Veo - play triangle with a sparkle at top-right */
export const VeoIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    {/* Play triangle */}
    <path d="M5 3.5 L20 12 L5 20.5 Z" fill="currentColor" />
    {/* Sparkle - 4-pointed star at top-right area */}
    <path
      d="M19 3 L19.6 5 L21.5 5 L20 6.2 L20.6 8 L19 7 L17.4 8 L18 6.2 L16.5 5 L18.4 5 Z"
      fill="currentColor"
      opacity="0.75"
    />
  </svg>
);

/** Higgsfield - bold "H" with 3 small particle dots orbiting it */
export const HiggsFieldIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    {/* H left stem */}
    <rect x="3" y="4" width="2.5" height="16" rx="0.5" fill="currentColor" />
    {/* H right stem */}
    <rect x="18.5" y="4" width="2.5" height="16" rx="0.5" fill="currentColor" />
    {/* H crossbar */}
    <rect x="3" y="10.75" width="18" height="2.5" rx="0.5" fill="currentColor" />
    {/* Particle dots - 3 small circles orbiting (top-left, top-right, bottom-center) */}
    <circle cx="1.5" cy="2" r="1.2" fill="currentColor" />
    <circle cx="22.5" cy="3" r="1" fill="currentColor" />
    <circle cx="12" cy="22.5" r="1.1" fill="currentColor" />
  </svg>
);

/** Minimax - bold "M" with a subtle wave underneath */
export const MinimaxIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    {/* M shape */}
    <path
      d="M2.5 19 L2.5 5 L12 14 L21.5 5 L21.5 19"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    {/* Wave underneath */}
    <path
      d="M3 21.5 C5.5 20.5 8 22.5 12 21.5 C16 20.5 18.5 22.5 21 21.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      fill="none"
      opacity="0.6"
    />
  </svg>
);

// ---------------------------------------------------------------------------
// IMAGE PLATFORMS
// ---------------------------------------------------------------------------

/** Midjourney - sailboat silhouette, minimal and elegant */
export const MidjourneyIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    {/* Mast */}
    <line x1="12" y1="2" x2="12" y2="19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    {/* Main sail - large triangle */}
    <path d="M12 3 L20 17 L12 17 Z" fill="currentColor" opacity="0.85" />
    {/* Jib sail - smaller front triangle */}
    <path d="M12 7 L5 16 L12 16 Z" fill="currentColor" opacity="0.5" />
    {/* Hull */}
    <path
      d="M4 19 Q12 22 20 19"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      fill="none"
    />
  </svg>
);

/** DALL-E - square frame with an eye symbol inside */
export const DallEIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    {/* Square frame */}
    <rect x="2" y="2" width="20" height="20" rx="2.5" stroke="currentColor" strokeWidth="2" fill="none" />
    {/* Eye outer shape */}
    <path
      d="M5 12 C7 8 17 8 19 12 C17 16 7 16 5 12 Z"
      stroke="currentColor"
      strokeWidth="1.5"
      fill="none"
    />
    {/* Iris */}
    <circle cx="12" cy="12" r="2.5" fill="currentColor" />
    {/* Pupil highlight */}
    <circle cx="13" cy="11" r="0.8" fill="currentColor" opacity="0.4" />
  </svg>
);

/** Flux - lightning bolt / flowing energy shape */
export const FluxIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    {/* Main lightning bolt */}
    <path
      d="M14 2 L6 13.5 H12.5 L10 22 L18 10.5 H11.5 Z"
      fill="currentColor"
    />
  </svg>
);

/** Stable Diffusion - butterfly shape (two wing pairs meeting at center) */
export const StableDiffusionIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    {/* Upper-left wing */}
    <path
      d="M12 12 C10 9 5 6 3 9 C1.5 11.5 4 14 7 13.5 C9 13 11 12.5 12 12 Z"
      fill="currentColor"
    />
    {/* Upper-right wing */}
    <path
      d="M12 12 C14 9 19 6 21 9 C22.5 11.5 20 14 17 13.5 C15 13 13 12.5 12 12 Z"
      fill="currentColor"
    />
    {/* Lower-left wing */}
    <path
      d="M12 12 C10 15 5.5 17 4 15 C2.5 13 5 11.5 8 12.5 C10 13 11.5 12.5 12 12 Z"
      fill="currentColor"
      opacity="0.7"
    />
    {/* Lower-right wing */}
    <path
      d="M12 12 C14 15 18.5 17 20 15 C21.5 13 19 11.5 16 12.5 C14 13 12.5 12.5 12 12 Z"
      fill="currentColor"
      opacity="0.7"
    />
    {/* Body */}
    <ellipse cx="12" cy="12" rx="1" ry="3.5" fill="currentColor" />
  </svg>
);

/** Imagen - diamond/prism shape with 3 refracted light lines */
export const ImagenIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    {/* Prism / diamond triangle */}
    <path d="M12 2 L22 18 L2 18 Z" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    {/* Refracted rays emerging from right side */}
    <line x1="19" y1="14" x2="23" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="20" y1="17" x2="23" y2="16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="20" y1="19" x2="23" y2="20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

/** Nano Banana / Gemini Image - four-pointed star sparkle */
export const NanoBananaIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    {/* Main 4-pointed sparkle - vertical and horizontal spikes */}
    <path
      d="M12 2 C12 2 13 8.5 12 12 C11 8.5 12 2 12 2 Z"
      fill="currentColor"
    />
    <path
      d="M22 12 C22 12 15.5 13 12 12 C15.5 11 22 12 22 12 Z"
      fill="currentColor"
    />
    <path
      d="M12 22 C12 22 11 15.5 12 12 C13 15.5 12 22 12 22 Z"
      fill="currentColor"
    />
    <path
      d="M2 12 C2 12 8.5 11 12 12 C8.5 13 2 12 2 12 Z"
      fill="currentColor"
    />
    {/* Diagonal secondary sparkle - smaller, 45-degree rotated */}
    <path
      d="M17.5 6.5 C17.5 6.5 15 9.5 12 12 C14 8.5 17.5 6.5 17.5 6.5 Z"
      fill="currentColor"
      opacity="0.5"
    />
    <path
      d="M17.5 17.5 C17.5 17.5 14.5 15 12 12 C15.5 14 17.5 17.5 17.5 17.5 Z"
      fill="currentColor"
      opacity="0.5"
    />
    <path
      d="M6.5 17.5 C6.5 17.5 9.5 15 12 12 C10 15.5 6.5 17.5 6.5 17.5 Z"
      fill="currentColor"
      opacity="0.5"
    />
    <path
      d="M6.5 6.5 C6.5 6.5 9 9 12 12 C8.5 10 6.5 6.5 6.5 6.5 Z"
      fill="currentColor"
      opacity="0.5"
    />
  </svg>
);

// ---------------------------------------------------------------------------
// PLATFORM MAPPINGS
// ---------------------------------------------------------------------------

export const VIDEO_PLATFORM_ICONS: Record<string, React.FC<{ className?: string }>> = {
  runway: RunwayIcon,
  kling: KlingIcon,
  sora: SoraIcon,
  veo: VeoIcon,
  higgsfield: HiggsFieldIcon,
  minimax: MinimaxIcon,
};

export const IMAGE_PLATFORM_ICONS: Record<string, React.FC<{ className?: string }>> = {
  midjourney: MidjourneyIcon,
  dalle: DallEIcon,
  flux: FluxIcon,
  "stable-diffusion": StableDiffusionIcon,
  imagen: ImagenIcon,
  nanobanana: NanoBananaIcon,
};
