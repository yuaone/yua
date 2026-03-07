"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import WorkspaceLayout from "@/components/workspace/WorkspaceLayout";

export default function WorkspacePage() {
  const { profile, status } = useAuth();
  const router = useRouter();

  const plan = profile?.workspace?.plan ?? "free";
  const isBizPlus = plan === "business" || plan === "enterprise";

  // Redirect Free/Pro users away — workspace admin is Business+ only
  useEffect(() => {
    if (status !== "authed") return;
    if (!isBizPlus) {
      router.replace("/chat");
    }
  }, [status, isBizPlus, router]);

  if (status !== "authed" || !isBizPlus) return null;

  return <WorkspaceLayout />;
}
