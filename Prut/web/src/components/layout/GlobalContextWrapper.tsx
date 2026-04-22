"use client";

import { LibraryProvider } from "@/context/LibraryContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { LoginRequiredModal } from "@/components/ui/LoginRequiredModal";
import { useState } from "react";
import { ExtensionBanner } from "@/components/ui/ExtensionBanner";
import dynamic from "next/dynamic";
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

function LibraryShell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [isLoginRequiredModalOpen, setIsLoginRequiredModalOpen] = useState(false);
  const [loginFeature, setLoginFeature] = useState("");

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

export function GlobalContextWrapper({
  children,
  initialUser = null,
}: {
  children: React.ReactNode;
  initialUser?: User | null;
}) {
  return (
    <AuthProvider initialUser={initialUser}>
      <LibraryShell>{children}</LibraryShell>
    </AuthProvider>
  );
}
