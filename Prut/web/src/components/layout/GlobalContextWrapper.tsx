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

export function GlobalContextWrapper({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoginRequiredModalOpen, setIsLoginRequiredModalOpen] = useState(false);
  const [loginFeature, setLoginFeature] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

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
