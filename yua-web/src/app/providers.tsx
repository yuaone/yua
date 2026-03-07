"use client";

import React from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import { ActionPreviewProvider } from "@/hooks/src/hooks/useActionPreview";
import LoginModal from "@/components/auth/LoginModal";
import BillingWarningBanner from "@/components/global/BillingWarningBanner";
import { useThemePreference } from "@/hooks/useThemePreference";

function ThemeBootstrap() {
  useThemePreference();
  return null;
}

export default function Providers({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <ActionPreviewProvider>
        {children}
        <ThemeBootstrap />
        <BillingWarningBanner />
        <LoginModal />
      </ActionPreviewProvider>
    </AuthProvider>
  );
}
