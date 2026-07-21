import Image from "next/image";

type BrandWatermarkProps = {
  /** Extra classes for positioning the wrapper (defaults to centered fill). */
  className?: string;
  /** Rendered width in px of the wordmark (kept square via object-contain). */
  size?: number;
  /** Opacity of the mark. Keep low (0.03-0.08) so the gold stays a texture,
   *  not a flood — honours the One-Gold rule (<=10% gold per screen). */
  opacity?: number;
};

/**
 * Faint Peroot wordmark used as a background brand texture behind hero/CTA
 * content. Decorative only: pointer-events-none + aria-hidden, and sits behind
 * content via a negative z-index. Reusable on any `relative` section site-wide.
 */
export function BrandWatermark({
  className = "inset-0 flex items-center justify-center",
  size = 560,
  opacity = 0.05,
}: BrandWatermarkProps) {
  return (
    <div aria-hidden className={`pointer-events-none absolute -z-10 overflow-hidden ${className}`}>
      <Image
        src="/Peroot-hero.png"
        alt=""
        width={size}
        height={size}
        priority={false}
        sizes="(max-width: 768px) 60vw, 560px"
        style={{ opacity }}
        className="select-none object-contain"
      />
    </div>
  );
}
