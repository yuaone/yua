"use client";

import { useRouter } from "next/navigation";
import { Building2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function WorkspacePanel() {
  const router = useRouter();
  const { profile } = useAuth();

  const plan = profile?.workspace?.plan ?? "free";
  const isBizPlus = plan === "business" || plan === "enterprise";

  // Free/Pro: no workspace admin access
  if (!isBizPlus) {
    return (
      <div className="max-w-3xl py-8 text-center">
        <Building2 size={32} className="mx-auto mb-3 text-[var(--text-muted)]" />
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
          워크스페이스 관리
        </h2>
        <p className="text-sm text-[var(--text-muted)]">
          Business 이상 플랜에서 사용 가능합니다.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl py-8 text-center">
      <Building2 size={32} className="mx-auto mb-3 text-[var(--text-muted)]" />
      <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
        워크스페이스 관리
      </h2>
      <p className="text-sm text-[var(--text-muted)] mb-4">
        워크스페이스 설정이 새 페이지로 이동했습니다.
      </p>
      <button
        onClick={() => router.push("/workspace")}
        className="inline-flex items-center gap-2 rounded-lg bg-[#111827] dark:bg-white px-4 py-2.5 text-sm font-medium text-white dark:text-[#111827] hover:opacity-90 transition"
      >
        <Building2 size={14} />
        워크스페이스 설정으로 이동
      </button>
    </div>
  );
}
