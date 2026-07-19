"use client";

import { useState, useEffect, useRef, useCallback, ComponentType } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Trophy,
  Rocket,
  MessageSquare,
  Globe,
  Palette,
  Bot,
  Video,
  Zap,
  Star,
  Users,
} from "lucide-react";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useScrollLock } from "@/hooks/useScrollLock";
import { cn } from "@/lib/utils";
import { getApiPath } from "@/lib/api-path";
import { logger } from "@/lib/logger";
import { CAPABILITY_CONFIGS, CapabilityMode, type IconName } from "@/lib/capability-mode";

// ─── Types ────────────────────────────────────────────────────────────────────

interface OnboardingOverlayProps {
  onComplete: (data: { role: string; goal: string }) => void;
}

const TOTAL_STEPS = 2;

// Role picker on the finish scene. The id is handed back through onComplete so the
// home view can seed a role-relevant first prompt into the input — turning the
// onboarding from a decorative splash into a real activation step.
const ROLES: { id: string; label: string; Icon: ComponentType<{ className?: string }> }[] = [
  { id: "marketing", label: "שיווק ותוכן", Icon: MessageSquare },
  { id: "business", label: "עסקים ויזמות", Icon: Zap },
  { id: "dev", label: "פיתוח וקוד", Icon: Bot },
  { id: "creative", label: "עיצוב ויצירה", Icon: Palette },
  { id: "study", label: "לימודים והוראה", Icon: Star },
  { id: "other", label: "משהו אחר", Icon: Rocket },
];

const ICON_BY_NAME: Record<IconName, ComponentType<{ className?: string }>> = {
  MessageSquare,
  Globe,
  Palette,
  Bot,
  Video,
};

const ONBOARDING_MODES = [
  { mode: CapabilityMode.STANDARD },
  { mode: CapabilityMode.DEEP_RESEARCH },
  { mode: CapabilityMode.IMAGE_GENERATION },
  { mode: CapabilityMode.VIDEO_GENERATION },
  { mode: CapabilityMode.AGENT_BUILDER },
];

const CAPABILITY_MODES = ONBOARDING_MODES.map(({ mode }) => {
  const cfg = CAPABILITY_CONFIGS[mode];
  return {
    mode,
    icon: ICON_BY_NAME[cfg.icon],
    color: cfg.color,
    labelHe: cfg.labelHe,
  };
});

const COLOR_TEXT: Record<string, string> = {
  sky: "text-sky-400",
  emerald: "text-emerald-400",
  purple: "text-indigo-400",
  amber: "text-amber-400",
  rose: "text-rose-400",
};
const COLOR_BG: Record<string, string> = {
  sky: "bg-sky-500/10",
  emerald: "bg-emerald-500/10",
  purple: "bg-indigo-500/10",
  amber: "bg-amber-500/10",
  rose: "bg-rose-500/10",
};
const COLOR_BORDER: Record<string, string> = {
  sky: "border-sky-500/25",
  emerald: "border-emerald-500/25",
  purple: "border-indigo-500/25",
  amber: "border-amber-500/25",
  rose: "border-rose-500/25",
};

// ─── API ──────────────────────────────────────────────────────────────────────

// ─── Aurora background ────────────────────────────────────────────────────────

function AuroraBackground() {
  const prefersReduced = useReducedMotion();
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      <div className="absolute inset-0 bg-[#060608]" />

      <motion.div
        className="absolute top-[-10%] left-[-10%] w-[70vw] h-[70vw] rounded-full"
        style={{
          background: "radial-gradient(circle at center, #7C3AED 0%, #4F46E5 40%, transparent 70%)",
          filter: "blur(90px)",
          opacity: 0.28,
        }}
        animate={
          prefersReduced
            ? {}
            : { x: [0, "8%", "-5%", 0], y: [0, "6%", "-8%", 0], scale: [1, 1.08, 0.96, 1] }
        }
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        className="absolute bottom-[-10%] right-[-10%] w-[55vw] h-[55vw] rounded-full"
        style={{
          background: "radial-gradient(circle at center, #F59E0B 0%, #D97706 40%, transparent 70%)",
          filter: "blur(110px)",
          opacity: 0.22,
        }}
        animate={
          prefersReduced
            ? {}
            : { x: [0, "-7%", "5%", 0], y: [0, "-6%", "9%", 0], scale: [1.1, 0.92, 1.05, 1.1] }
        }
        transition={{ duration: 28, repeat: Infinity, ease: "easeInOut", delay: 6 }}
      />

      <motion.div
        className="absolute top-[30%] left-[35%] w-[45vw] h-[45vw] rounded-full"
        style={{
          background: "radial-gradient(circle at center, #06B6D4 0%, #0284C7 40%, transparent 70%)",
          filter: "blur(80px)",
          opacity: 0.15,
        }}
        animate={
          prefersReduced
            ? {}
            : { x: [0, "6%", "-8%", 0], y: [0, "-5%", "7%", 0], scale: [0.9, 1.12, 0.98, 0.9] }
        }
        transition={{ duration: 19, repeat: Infinity, ease: "easeInOut", delay: 12 }}
      />

      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />
    </div>
  );
}

// ─── Particles ────────────────────────────────────────────────────────────────

function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const COLORS = ["#F59E0B", "#818CF8", "#34D399", "#60A5FA", "#F472B6", "#A78BFA"];
    const particles = Array.from({ length: 40 }, () => ({
      x: Math.random() * (canvas.width || 400),
      y: Math.random() * (canvas.height || 800),
      size: Math.random() * 1.6 + 0.3,
      speedY: -(Math.random() * 0.3 + 0.07),
      speedX: (Math.random() - 0.5) * 0.15,
      opacity: Math.random() * 0.4 + 0.07,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    }));

    let animId: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        const hex = Math.round(p.opacity * 255)
          .toString(16)
          .padStart(2, "0");
        ctx.fillStyle = p.color + hex;
        ctx.fill();
        p.y += p.speedY;
        p.x += p.speedX;
        if (p.y < -5) {
          p.y = canvas.height + 5;
          p.x = Math.random() * canvas.width;
        }
      }
      animId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      aria-hidden="true"
    />
  );
}

// ─── Scene 1 — Welcome + Capabilities ────────────────────────────────────────

function Scene1({ onNext }: { onNext: () => void }) {
  const prefersReduced = useReducedMotion();

  return (
    <div
      className="relative flex flex-col items-center justify-center text-center h-full px-6 py-12 gap-7"
      dir="rtl"
    >
      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, scale: 0.75, y: -12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        className="relative flex items-center justify-center"
      >
        <motion.div
          className="absolute w-64 h-20 bg-amber-500/20 blur-[55px] rounded-full"
          animate={prefersReduced ? {} : { scale: [1, 1.18, 1], opacity: [0.2, 0.35, 0.2] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/Peroot-hero.png"
          alt="פירוט"
          className="relative z-10 h-24 sm:h-32 w-auto drop-shadow-[0_0_28px_rgba(245,158,11,0.45)]"
        />
      </motion.div>

      {/* Tagline */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        className="space-y-1.5"
      >
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-tight">
          ברוכים הבאים לפירוט
        </h1>
        <p className="text-[0.97rem] text-white/58 max-w-[19rem] mx-auto leading-relaxed">
          מרעיון גולמי לפרומפט מקצועי — תוך שניות
        </p>
      </motion.div>

      {/* Capability mode pills — compact horizontal row */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.55 }}
        className="flex flex-wrap justify-center gap-2 max-w-[22rem]"
      >
        {CAPABILITY_MODES.map(({ icon: Icon, color, labelHe }, i) => (
          <motion.div
            key={labelHe}
            initial={{ opacity: 0, scale: 0.8, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.56 + i * 0.07, duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold",
              COLOR_BG[color] ?? "bg-white/5",
              COLOR_BORDER[color] ?? "border-white/10",
              COLOR_TEXT[color] ?? "text-white",
            )}
          >
            <Icon className="w-3 h-3 shrink-0" />
            <span>{labelHe}</span>
          </motion.div>
        ))}
      </motion.div>

      {/* Stats row */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9 }}
        className="flex items-center gap-5 text-center"
      >
        {[
          { icon: Zap, value: "2", label: "שיפורים חינם ביום", color: "text-amber-400" },
          { icon: Users, value: "ישראלי", label: "עברית ראשית", color: "text-sky-400" },
          { icon: Star, value: "5", label: "מצבי AI", color: "text-indigo-400" },
        ].map(({ icon: Icon, value, label, color }) => (
          <div key={label} className="flex flex-col items-center gap-0.5">
            <Icon className={cn("w-3.5 h-3.5 mb-0.5", color)} />
            <span className="text-sm font-bold text-white">{value}</span>
            <span className="text-[10px] text-white/45 leading-tight">{label}</span>
          </div>
        ))}
      </motion.div>

      {/* CTA */}
      <motion.button
        initial={{ opacity: 0, y: 16 }}
        animate={{
          opacity: 1,
          y: 0,
          ...(prefersReduced
            ? {}
            : {
                boxShadow: [
                  "0 8px 40px -8px rgba(245,158,11,0.4)",
                  "0 8px 60px -4px rgba(245,158,11,0.75)",
                  "0 8px 40px -8px rgba(245,158,11,0.4)",
                ],
              }),
        }}
        transition={{
          delay: 1.1,
          duration: 0.5,
          boxShadow: { duration: 2.4, repeat: Infinity, ease: "easeInOut", delay: 1.5 },
        }}
        onClick={onNext}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.96 }}
        className="flex items-center gap-3 px-10 py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-bold text-lg cursor-pointer"
      >
        <span>בוא נתחיל</span>
        <motion.div
          animate={prefersReduced ? {} : { x: [0, 4, 0] }}
          transition={{ duration: 1.3, repeat: Infinity, ease: "easeInOut" }}
        >
          <ArrowRight className="w-5 h-5" />
        </motion.div>
      </motion.button>
    </div>
  );
}

// ─── Scene 2 — Pioneer badge + Launch ────────────────────────────────────────

function Scene2({
  onFinish,
  role,
  onRole,
}: {
  onFinish: () => void;
  role: string;
  onRole: (id: string) => void;
}) {
  const [badgeIn, setBadgeIn] = useState(false);
  const prefersReduced = useReducedMotion();

  useEffect(() => {
    const t = setTimeout(() => setBadgeIn(true), 280);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className="flex flex-col items-center justify-center h-full px-6 py-14 gap-8 text-center"
      dir="rtl"
    >
      {/* Ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-72 h-72 bg-amber-500/[0.07] blur-[80px] rounded-full pointer-events-none" />

      {/* Pioneer badge */}
      <AnimatePresence>
        {badgeIn && (
          <motion.div
            initial={{ opacity: 0, scale: 0.3, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 18 }}
            className="relative"
          >
            {/* Star-burst rays */}
            <div className="absolute inset-0 flex items-center justify-center">
              {Array.from({ length: 8 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-[3px] h-8 bg-gradient-to-t from-transparent to-amber-400/65 rounded-full origin-bottom"
                  style={{ rotate: i * 45, bottom: "50%" }}
                  initial={{ scaleY: 0, opacity: 0 }}
                  animate={{ scaleY: 1, opacity: 1 }}
                  transition={{ delay: 0.06 + i * 0.05, duration: 0.35, ease: "backOut" }}
                />
              ))}
            </div>

            {/* Badge */}
            <motion.div
              className="w-28 h-28 rounded-3xl bg-gradient-to-br from-amber-500/25 via-yellow-500/15 to-transparent border border-amber-500/40 flex flex-col items-center justify-center shadow-[0_0_70px_-10px_rgba(245,158,11,0.6)] relative z-10"
              animate={prefersReduced ? {} : { rotate: [0, 1, -1, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            >
              <Trophy className="w-10 h-10 text-amber-400 mb-1" />
              <span className="text-[11px] text-amber-300/90 font-bold tracking-wide uppercase">
                Pioneer
              </span>
            </motion.div>

            {/* Outer pulse ring */}
            <motion.div
              className="absolute inset-[-10px] rounded-[2.5rem] border border-amber-400/20"
              animate={{ scale: [1, 1.05, 1], opacity: [0.4, 0.12, 0.4] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Headline */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55, duration: 0.6 }}
        className="space-y-2"
      >
        <h2 className="text-3xl sm:text-4xl font-serif font-bold text-white tracking-tight">
          מוכן להתחיל!
        </h2>
        <p className="text-white/56 max-w-[17rem] mx-auto text-[0.97rem] leading-relaxed">
          קיבלת את תג ה-Pioneer — אחד הראשונים לפלטפורמה
        </p>
      </motion.div>

      {/* Role picker — the answer seeds a tailored first prompt into the input */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.85 }}
        className="w-full max-w-[24rem]"
      >
        <p
          id="onboarding-role-label"
          className="text-[13px] font-semibold text-white/70 mb-3 text-center"
        >
          במה נתחיל? נכין לך פרומפט ראשון
        </p>
        <div
          role="radiogroup"
          aria-labelledby="onboarding-role-label"
          className="grid grid-cols-2 gap-2.5"
        >
          {ROLES.map(({ id, label, Icon }) => {
            const active = role === id;
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onRole(active ? "" : id)}
                className={cn(
                  "flex items-center gap-2.5 px-3.5 py-3 min-h-[48px] rounded-xl border text-right transition-all cursor-pointer",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60",
                  active
                    ? "bg-amber-500/15 border-amber-400/55 text-white"
                    : "bg-white/[0.04] border-white/[0.1] text-white/70 hover:bg-white/[0.07] hover:border-white/20",
                )}
              >
                <Icon
                  className={cn(
                    "w-4 h-4 shrink-0 transition-colors",
                    active ? "text-amber-300" : "text-white/45",
                  )}
                />
                <span className="text-[13px] font-medium leading-tight">{label}</span>
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* Final CTA */}
      <motion.button
        initial={{ opacity: 0, scale: 0.88 }}
        animate={{
          opacity: 1,
          scale: 1,
          ...(prefersReduced
            ? {}
            : {
                boxShadow: [
                  "0 8px 40px -8px rgba(52,211,153,0.4)",
                  "0 8px 60px -4px rgba(52,211,153,0.75)",
                  "0 8px 40px -8px rgba(52,211,153,0.4)",
                ],
              }),
        }}
        transition={{
          delay: 1.2,
          type: "spring",
          stiffness: 240,
          damping: 16,
          boxShadow: { duration: 2.4, repeat: Infinity, ease: "easeInOut", delay: 2 },
        }}
        onClick={onFinish}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.96 }}
        className="flex items-center gap-3 px-10 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-400 text-black font-bold text-lg cursor-pointer"
      >
        <Rocket className="w-5 h-5" />
        <span>התחל עכשיו!</span>
      </motion.button>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export function OnboardingOverlay({ onComplete }: OnboardingOverlayProps) {
  const [step, setStep] = useState(1);
  const [role, setRole] = useState("");
  const [isVisible, setIsVisible] = useState(true);
  const prefersReduced = useReducedMotion();

  const handleNext = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS));

  // The parent's onComplete handler owns the "mark complete" write
  // (completeOnboarding), so we don't POST it here too — that was a double write.
  const awardPioneer = () =>
    fetch(getApiPath("/api/user/achievements/award"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ achievementId: "pioneer" }),
    }).catch((e) => logger.warn("Failed to award pioneer badge", e));

  const handleFinish = () => {
    awardPioneer();
    setIsVisible(false);
    setTimeout(() => onComplete({ role, goal: "" }), 450);
  };

  const handleSkip = () => {
    // Award on skip too — Scene 2 tells the user they already earned the badge.
    // Skipping before Scene 2 means no role was chosen, so nothing gets seeded.
    awardPioneer();
    setIsVisible(false);
    setTimeout(() => onComplete({ role, goal: "" }), 280);
  };

  const trapRef = useFocusTrap<HTMLDivElement>(isVisible);
  useScrollLock(isVisible);

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      className="fixed inset-0 z-[100] flex flex-col overflow-hidden"
      onKeyDown={(e) => {
        if (e.key === "Escape") handleSkip();
      }}
    >
      <AuroraBackground />
      <ParticleCanvas />

      {/* Skip */}
      <div className="absolute top-4 left-4 z-20">
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.8 }}
          onClick={handleSkip}
          className="text-xs text-white/22 hover:text-white/50 transition-colors px-4 py-2.5 min-h-[44px] flex items-center rounded-xl hover:bg-white/5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
        >
          דלג
        </motion.button>
      </div>

      {/* Step indicator */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1.5">
        <div className="flex gap-2">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <motion.div
              key={i}
              className={cn(
                "h-[3px] rounded-full transition-all duration-500",
                i + 1 === step
                  ? "w-8 bg-gradient-to-r from-amber-400 to-yellow-400"
                  : i + 1 < step
                    ? "w-4 bg-white/35"
                    : "w-4 bg-white/12",
              )}
            />
          ))}
        </div>
        <p className="text-[9px] text-white/28 tracking-wide">
          {step} / {TOTAL_STEPS}
        </p>
      </div>

      {/* Scenes */}
      <div
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-label="מסך הכרות"
        className="relative z-10 flex-1 min-h-0 flex flex-col max-w-lg mx-auto w-full"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: prefersReduced ? 0 : 36 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: prefersReduced ? 0 : -36 }}
            transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
            className="flex-1 min-h-0 flex flex-col"
          >
            {step === 1 && <Scene1 onNext={handleNext} />}
            {step === 2 && <Scene2 onFinish={handleFinish} role={role} onRole={setRole} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
