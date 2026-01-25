"use client";

import { useHistory } from "@/hooks/useHistory";
import { LibraryProvider } from "@/context/LibraryContext";
import { LoginRequiredModal } from "@/components/ui/LoginRequiredModal";
import { useState } from "react";
import { TopLogo } from "@/components/layout/top-logo";
import { Toaster } from "sonner";

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
        <TopLogo />
        <Toaster position="top-center" theme="dark" closeButton />
        {children}
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
