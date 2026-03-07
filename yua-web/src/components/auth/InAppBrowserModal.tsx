"use client";

import { useState, useEffect } from "react";
import { ExternalLink, Copy, Check, AlertTriangle } from "lucide-react";
import {
  detectInAppBrowser,
  openInExternalBrowser,
  type InAppBrowserResult,
} from "@/lib/detectInAppBrowser";

interface InAppBrowserModalProps {
  open: boolean;
  onClose: () => void;
}

export function InAppBrowserModal({ open, onClose }: InAppBrowserModalProps) {
  const [result, setResult] = useState<InAppBrowserResult | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) {
      setResult(detectInAppBrowser());
    }
  }, [open]);

  if (!open || !result) return null;

  const handleOpenBrowser = () => {
    openInExternalBrowser();
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select+copy
      const input = document.createElement("input");
      input.value = window.location.href;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div
        className="relative w-full max-w-sm rounded-2xl p-6 shadow-2xl"
        style={{
          background: "var(--surface-panel, #fff)",
          border: "1px solid var(--line)",
        }}
      >
        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-full"
            style={{ background: "rgba(245,158,11,0.1)" }}
          >
            <AlertTriangle size={24} style={{ color: "#f59e0b" }} />
          </div>
        </div>

        {/* Title */}
        <h2
          className="text-center text-lg font-semibold mb-2"
          style={{ color: "var(--text-primary)" }}
        >
          외부 브라우저에서 열어주세요
        </h2>

        {/* Description */}
        <p
          className="text-center text-sm leading-relaxed mb-1"
          style={{ color: "var(--text-secondary)" }}
        >
          {result.appName
            ? `${result.appName} 내부 브라우저에서는 Google 로그인이 지원되지 않아요.`
            : "앱 내부 브라우저에서는 Google 로그인이 지원되지 않아요."}
        </p>
        <p
          className="text-center text-xs mb-5"
          style={{ color: "var(--text-muted)" }}
        >
          {result.platform === "android"
            ? "Chrome에서 열기를 눌러주세요."
            : result.platform === "ios"
            ? "Safari에서 열어주세요. 아래 URL을 복사하여 Safari에 붙여넣기 해주세요."
            : "기본 브라우저에서 열어주세요."}
        </p>

        {/* Actions */}
        <div className="space-y-2">
          {/* Open in browser button */}
          <button
            type="button"
            onClick={handleOpenBrowser}
            className="w-full flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition hover:opacity-90"
            style={{
              background: "var(--text-primary, #111)",
              color: "var(--surface-main, #fff)",
            }}
          >
            <ExternalLink size={16} />
            {result.platform === "android"
              ? "Chrome에서 열기"
              : result.platform === "ios"
              ? "Safari에서 열기"
              : "브라우저에서 열기"}
          </button>

          {/* Copy URL (especially useful on iOS where intent:// doesn't work) */}
          <button
            type="button"
            onClick={handleCopyUrl}
            className="w-full flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition hover:opacity-80"
            style={{
              background: "var(--wash)",
              color: "var(--text-secondary)",
              border: "1px solid var(--line)",
            }}
          >
            {copied ? (
              <>
                <Check size={14} className="text-green-500" />
                <span className="text-green-500">URL 복사됨</span>
              </>
            ) : (
              <>
                <Copy size={14} />
                URL 복사하기
              </>
            )}
          </button>

          {/* Cancel */}
          <button
            type="button"
            onClick={onClose}
            className="w-full text-center text-xs py-2 transition hover:opacity-70"
            style={{ color: "var(--text-muted)" }}
          >
            다른 방법으로 로그인
          </button>
        </div>
      </div>
    </div>
  );
}
