"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * THE button primitive (U4.1, DESIGN.md > Components > Buttons).
 *
 * - primary: Signal Gold fill (#F59E0B), obsidian text, 10px radius,
 *   ~10/20 padding; hover lightens to Warm Gold + soft gold glow. The ONE
 *   gold-filled element on a typical screen (One Gold rule).
 * - ghost: transparent with silver/secondary text and a glass border;
 *   hover raises the glass tint. Everything that isn't the primary action.
 * - danger: destructive actions — red text on a red-tinted glass border.
 *
 * No gradients, no hover:scale/translate bounce (both explicitly banned by
 * DESIGN.md); transitions 0.2s ease-out; focus-visible gold ring.
 */

export type ButtonVariant = "primary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: cn(
    "bg-[#F59E0B] text-[#080808] font-bold border border-amber-400/50",
    "hover:bg-[#FBBF24] hover:shadow-[0_0_20px_rgba(245,158,11,0.35)]",
  ),
  ghost: cn(
    "bg-transparent text-(--text-secondary) font-medium border border-(--glass-border)",
    "hover:bg-black/5 dark:hover:bg-white/5 hover:text-(--text-primary)",
  ),
  danger: cn(
    "bg-transparent text-red-600 dark:text-red-400 font-medium border border-red-500/30",
    "hover:bg-red-500/10 hover:border-red-500/50",
  ),
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 min-h-[36px] text-xs",
  md: "px-5 py-2.5 min-h-[44px] text-sm",
  lg: "px-8 py-3 min-h-[48px] text-base",
};

const BASE_CLASSES = cn(
  "inline-flex items-center justify-center gap-2 rounded-[10px] cursor-pointer",
  "transition-all duration-200 ease-out",
  "focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none",
  "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none",
);

export function buttonClasses(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className?: string,
): string {
  return cn(BASE_CLASSES, VARIANT_CLASSES[variant], SIZE_CLASSES[size], className);
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", className, type = "button", ...props },
  ref,
) {
  return (
    <button ref={ref} type={type} className={buttonClasses(variant, size, className)} {...props} />
  );
});

/** Link styled as a button — same variants, for navigation CTAs. */
export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  href,
  children,
  ...props
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  href: string;
  children: React.ReactNode;
} & Omit<React.ComponentProps<typeof Link>, "href" | "className">) {
  return (
    <Link href={href} className={buttonClasses(variant, size, className)} {...props}>
      {children}
    </Link>
  );
}
