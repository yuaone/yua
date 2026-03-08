"use client";

import type { ApiKey } from "@/lib/platform-api";

interface ApiKeyRowProps {
  apiKey: ApiKey;
  onRevoke: (id: number) => void;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return d.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });
}

export default function ApiKeyRow({ apiKey, onRevoke }: ApiKeyRowProps) {
  const isActive = apiKey.status === "active";
  const displayKey = `${apiKey.key_prefix}${"*".repeat(40)}`;

  return (
    <div
      className={`rounded-2xl border p-5 transition-all duration-200 ${
        isActive
          ? "border-[var(--line)] hover:border-violet-200 dark:hover:border-violet-500/20 hover:-translate-y-0.5"
          : "border-[var(--line)] opacity-60"
      }`}
      style={{
        background: "var(--surface-main)",
        boxShadow: "0 1px 3px 0 rgba(0,0,0,0.04), 0 1px 2px -1px rgba(0,0,0,0.04)",
      }}
    >
      {/* Top row: name + status + actions */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          {/* Icon */}
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center ${
              isActive
                ? "bg-violet-100 dark:bg-violet-500/15"
                : "bg-gray-100 dark:bg-gray-500/10"
            }`}
          >
            <svg
              className={`${
                isActive
                  ? "text-violet-600 dark:text-violet-400"
                  : "text-gray-400 dark:text-gray-500"
              }`}
              style={{ width: "18px", height: "18px" }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z"
              />
            </svg>
          </div>
          {/* Name */}
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">{apiKey.name}</p>
            <p className="text-xs text-[var(--text-muted)]">
              생성일: {formatDate(apiKey.created_at)}
              {apiKey.last_used_at && (
                <span className="ml-2">
                  마지막 사용: {formatDate(apiKey.last_used_at)}
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Status badge */}
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
              isActive
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                : "bg-gray-100 text-gray-500 dark:bg-gray-500/10 dark:text-gray-400"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isActive ? "bg-emerald-500" : "bg-gray-400"
              }`}
            />
            {isActive ? "활성" : "폐기됨"}
          </span>
          {/* Revoke button */}
          {isActive && (
            <button
              onClick={() => onRevoke(apiKey.id)}
              className="text-xs font-medium text-[var(--text-muted)] hover:text-red-500 dark:hover:text-red-400 transition-colors px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10"
            >
              폐기
            </button>
          )}
        </div>
      </div>

      {/* Key display (prefix only — full key is never stored) */}
      <div className="flex items-center gap-2 rounded-xl bg-[var(--surface-panel)] border border-[var(--line)] px-4 py-2.5">
        <code className="text-[13px] text-[var(--text-secondary)] font-mono flex-1 truncate">
          {displayKey}
        </code>
      </div>
    </div>
  );
}
