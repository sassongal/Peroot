"use client";

import { LibraryProvider } from "@/context/LibraryContext";
import { LoginRequiredModal } from "@/components/ui/LoginRequiredModal";
import { useState, useEffect } from "react";
import { ExtensionBanner } from "@/components/ui/ExtensionBanner";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

const Toaster = dynamic(() => import("sonner").then((mod) => mod.Toaster), { ssr: false });

function InnerWrapper({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ExtensionBanner />
      <Toaster
        position="top-center"
        theme="system"
        closeButton
        richColors
        expand={false}
        gap={8}
        toastOptions={{
          style: {
            fontSize: "15px",
            padding: "14px 18px",
            minWidth: "340px",
            borderRadius: "14px",
          },
          duration: 4000,
          classNames: {
            toast: "shadow-xl",
          },
        }}
      />
      {children}
    </>
  );
}

export function GlobalContextWrapper({
  children,
  initialUser = null,
}: {
  children: React.ReactNode;
  initialUser?: User | null;
}) {
  const [user, setUser] = useState<User | null>(initialUser);
  const [isLoginRequiredModalOpen, setIsLoginRequiredModalOpen] = useState(false);
  const [loginFeature, setLoginFeature] = useState("");

  // In dev, React Strict Mode may still double-invoke effects — extra auth noise is local-only.
  useEffect(() => {
    const supabase = createClient();
    // Only fetch user client-side if no server-prefetched user was provided.
    // This eliminates the extra round-trip after hydration for logged-in users.
    if (!initialUser) {
      supabase.auth.getUser().then(({ data }) => {
        // Always apply getUser() — fresh session/metadata vs id-only dedupe.
        setUser(data.user ?? null);
      });
    }
    // Always subscribe to auth state changes so sign-in/sign-out updates live.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const next = session?.user ?? null;
      setUser((prev) => {
        if (next === null) {
          return prev === null ? prev : null;
        }
        if (prev === null || prev.id !== next.id) {
          return next;
        }
        // Same user id: refresh state when the session/user actually changes.
        if (event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
          return next;
        }
        // INITIAL_SESSION often duplicates SSR + getUser; skip identical id to reduce flicker.
        if (event === "INITIAL_SESSION") {
          return prev;
        }
        return next;
      });
    });
    return () => subscription.unsubscribe();
  }, [initialUser]);

  const showLoginRequired = (feature: string) => {
    setLoginFeature(feature);
    setIsLoginRequiredModalOpen(true);
  };

  return (
    <LibraryProvider user={user} showLoginRequired={showLoginRequired}>
      <InnerWrapper>{children}</InnerWrapper>
      <LoginRequiredModal
        isOpen={isLoginRequiredModalOpen}
        onClose={() => setIsLoginRequiredModalOpen(false)}
        title="התחברות נדרשת"
        message={`כדי להשתמש ב${loginFeature}, יש להתחבר לחשבון.`}
        feature={loginFeature}
      />
    </LibraryProvider>
  );
}
