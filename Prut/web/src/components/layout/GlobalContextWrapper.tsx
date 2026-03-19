"use client";

import { useHistory } from "@/hooks/useHistory";
import { LibraryProvider, useLibraryContext } from "@/context/LibraryContext";
import { LoginRequiredModal } from "@/components/ui/LoginRequiredModal";
import { useState } from "react";
import { ExtensionBanner } from "@/components/ui/ExtensionBanner";
import dynamic from "next/dynamic";

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
  const { user } = useHistory();
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
