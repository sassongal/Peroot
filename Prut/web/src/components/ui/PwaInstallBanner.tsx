"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Download, X, Share } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "pwa-install-dismissed";
const VISIT_COUNT_KEY = "pwa-visit-count";
const MIN_VISITS = 2;

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

export function PwaInstallBanner() {
  const [show, setShow] = useState(false);
  const [iosMode, setIosMode] = useState(false);
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Don't show if already dismissed or already installed
    if (localStorage.getItem(DISMISS_KEY)) return;
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    // Track visit count
    const count = parseInt(localStorage.getItem(VISIT_COUNT_KEY) || "0", 10) + 1;
    localStorage.setItem(VISIT_COUNT_KEY, String(count));

    if (count < MIN_VISITS) return;

    // iOS doesn't support beforeinstallprompt — show manual instructions
    if (isIos()) {
      setIosMode(true);
      setShow(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e as BeforeInstallPromptEvent;
      setShow(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = useCallback(async () => {
    const prompt = deferredPrompt.current;
    if (!prompt) return;

    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") {
      setShow(false);
    }
    deferredPrompt.current = null;
  }, []);

  const handleDismiss = useCallback(() => {
    setShow(false);
    localStorage.setItem(DISMISS_KEY, "1");
  }, []);

  if (!show) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
      <div className="max-w-md mx-auto flex items-center gap-3 p-4 rounded-2xl border border-amber-500/30 bg-background/95 backdrop-blur-md shadow-lg">
        <div className="w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br from-amber-500/20 to-yellow-500/20 border border-amber-500/20 flex items-center justify-center">
          {iosMode ? (
            <Share className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          ) : (
            <Download className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">התקן את Peroot</p>
          {iosMode ? (
            <p className="text-xs text-muted-foreground">
              לחץ על <Share className="w-3 h-3 inline" /> ואז &quot;הוסף למסך הבית&quot;
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">גישה מהירה ישירות ממסך הבית</p>
          )}
        </div>
        {!iosMode && (
          <button
            onClick={handleInstall}
            className="shrink-0 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-black text-sm font-bold hover:scale-[1.03] transition-transform"
          >
            התקן
          </button>
        )}
        <button
          onClick={handleDismiss}
          aria-label="סגור"
          className="shrink-0 p-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
