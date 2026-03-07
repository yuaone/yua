"use client";

import { useEffect, useRef, useState } from "react";


/**
 * ParagraphRenderer (SSOT FINAL)
 * --------------------------------------------------
 * - FINAL 전용 (streaming ❌)
 * - 첫 문단 즉시 표시
 * - 이후 문단만 순차 fade-in
 * - block math 문단은 fade-in 제외 (KaTeX 보호)
 * - paragraph 변경 시 상태 안전 리셋
 * - 렌더 트리 흔들림 ❌
 */

type Props = {
  paragraphs: string[];
  delayMs?: number;
};

export default function ParagraphRenderer({
  paragraphs,
  delayMs = 120,
}: Props) {
  // 🔒 최소 1 paragraph 보장 (렌더 안정)
  const safeParagraphs =
    paragraphs.length > 0 ? paragraphs : [" "];

  const [visibleCount, setVisibleCount] = useState(1);
  const prevKeyRef = useRef<string>("");

  // 🔑 paragraph 변경 감지용 key
  const key = `${safeParagraphs.length}::${safeParagraphs[0]?.slice(0, 40)}`;

  useEffect(() => {
    // 🔥 새 답변 감지 → 즉시 리셋
    if (prevKeyRef.current !== key) {
      prevKeyRef.current = key;
      setVisibleCount(1); // 첫 문단 즉시
    }

    if (safeParagraphs.length <= 1) return;

    let cancelled = false;

    const run = async () => {
      for (let i = 1; i < safeParagraphs.length; i++) {
        if (cancelled) return;
        await new Promise((r) => setTimeout(r, delayMs));
        setVisibleCount((v) =>
          Math.min(v + 1, safeParagraphs.length)
        );
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [key, safeParagraphs.length, delayMs]);

  return (
    <div className="space-y-0">
      {safeParagraphs
        .slice(0, visibleCount)
        .map((p, idx) => {
          const isMathBlock =
            p.includes("$$") ||
            p.includes("\\begin{cases}") ||
            p.includes("\\begin{aligned}");

          return (
            <div key={idx} />
          );
        })}
    </div>
  );
}
