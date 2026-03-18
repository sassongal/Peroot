"use client";

import { useState, useEffect, useRef } from "react";

export function SplashScreen() {
  const [visible, setVisible] = useState(() => {
    if (typeof window === "undefined") return false;
    return !sessionStorage.getItem("peroot_splash_shown");
  });
  const [fadeOut, setFadeOut] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!visible) return;

    // Mark as shown for this session
    sessionStorage.setItem("peroot_splash_shown", "1");

    // Lock scroll while splash is visible
    document.body.style.overflow = "hidden";

    // Start fade-out after video ends or after 5s max
    const timeout = setTimeout(() => {
      setFadeOut(true);
    }, 5000);

    return () => {
      clearTimeout(timeout);
      document.body.style.overflow = "";
    };
  }, [visible]);

  // Remove from DOM after fade-out animation
  useEffect(() => {
    if (!fadeOut) return;
    const timer = setTimeout(() => {
      setVisible(false);
      document.body.style.overflow = "";
    }, 600);
    return () => clearTimeout(timer);
  }, [fadeOut]);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[200] flex items-center justify-center bg-[#080808] transition-opacity duration-500 ${
        fadeOut ? "opacity-0" : "opacity-100"
      }`}
      aria-hidden="true"
    >
      <video
        ref={videoRef}
        src="/images/peroot_logo_pack/peroot-splash.mp4"
        autoPlay
        muted
        playsInline
        onEnded={() => setFadeOut(true)}
        className="h-full w-auto max-w-none object-contain"
        style={{ maxHeight: "100vh" }}
      />
      {/* Skip button */}
      <button
        onClick={() => setFadeOut(true)}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-xs text-white/40 hover:text-white/70 transition-colors px-4 py-2 rounded-full border border-white/10 backdrop-blur-sm"
      >
        דלג
      </button>
    </div>
  );
}
