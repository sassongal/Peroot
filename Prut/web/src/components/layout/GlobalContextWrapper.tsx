"use client";

import { LibraryProvider, useLibraryContext } from "@/context/LibraryContext";
import { LoginRequiredModal } from "@/components/ui/LoginRequiredModal";
import { useState, useEffect } from "react";
import { ExtensionBanner } from "@/components/ui/ExtensionBanner";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

const Toaster = dynamic(
  () => import("sonner").then((mod) => mod.Toaster),
  { ssr: false }
);

function InnerWrapper({ children }: { children: React.ReactNode }) {
  const { viewMode } = useLibraryContext();

  return (
    <>
      <ExtensionBanner />
      <Toaster position="top-center" theme="system" closeButton />
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
        const next = data.user ?? null;
        setUser((prev) => (prev?.id === next?.id ? prev : next));
      });
    }
    // Always subscribe to auth state changes so sign-in/sign-out updates live.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const next = session?.user ?? null;
      // Avoid redundant re-renders when Supabase emits the same session/user again on mount.
      setUser((prev) => (prev?.id === next?.id ? prev : next));
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
