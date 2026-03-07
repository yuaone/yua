// src/lib/router/safePush.ts
"use client";

import { useRouter } from "next/navigation";

/**
 * ✅ Next.js App Router 안전 push (TS 우회 최종판)
 *
 * - App Router의 과도한 RouteImpl 타입 우회
 * - string 기반 동적 라우팅 허용
 * - 런타임 동작은 router.push 그대로
 * - Sidebar / ContextMenu / Overview 전부 안정
 */
export function useSafePush() {
  const router = useRouter();

  return (href: string) => {
    // 🔥 Next.js App Router 타입 우회 (의도적)
    (router.push as (url: string) => void)(href);
  };
}
