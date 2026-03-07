"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Markdown from "@/components/common/Markdown";
import { useLoginModal } from "@/store/store/useLoginModal";
import { useAuth } from "@/contexts/AuthContext";

type SharedMessage = {
  content: string;
  role: string;
  model: string | null;
  meta: any;
  thinkingProfile: string | null;
  createdAt: string;
  viewCount: number;
  threadId: number | null;
  messageId: number | null;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

function apiUrl(path: string) {
  const base = String(API_BASE).replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  const baseHasApi = /\/api$/.test(base);
  const pathHasApi = /^\/api(\/|$)/.test(p);
  if (baseHasApi && pathHasApi) return `${base}${p.replace(/^\/api/, "")}`;
  if (!baseHasApi && !pathHasApi) return `${base}/api${p}`;
  return `${base}${p}`;
}

export default function SharedMessagePage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const { status } = useAuth();
  const { openModal } = useLoginModal();
  const [message, setMessage] = useState<SharedMessage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [forking, setForking] = useState(false);
  const { authFetch } = useAuth();

  useEffect(() => {
    if (!params?.token) return;

    (async () => {
      try {
        const res = await fetch(apiUrl(`/share/${params.token}`));
        if (!res.ok) {
          setError(res.status === 404 ? "존재하지 않거나 만료된 링크입니다." : "오류가 발생했습니다.");
          return;
        }
        const data = await res.json();
        if (data.ok && data.message) {
          setMessage(data.message);
        } else {
          setError("메시지를 불러올 수 없습니다.");
        }
      } catch {
        setError("네트워크 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    })();
  }, [params?.token]);

  const doFork = async () => {
    if (!message?.messageId || forking) return;
    setForking(true);
    try {
      const res = await authFetch("/api/chat/fork", {
        method: "POST",
        body: JSON.stringify({ messageId: message.messageId }),
      });
      if (!res.ok) throw new Error("fork failed");
      const data = await res.json();
      if (data.ok && data.threadId) {
        router.push(`/chat/${data.threadId}`);
      }
    } catch {
      setForking(false);
    }
  };

  const handleContinue = () => {
    if (status === "authed") {
      doFork();
    } else {
      openModal({
        title: "로그인하고 이어보기",
        afterLogin: () => doFork(),
      });
    }
  };

  const handleLogin = () => {
    openModal({ title: "로그인 / 회원가입" });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#faf9f7] dark:bg-[#111]">
        <div className="animate-pulse text-gray-400 text-lg">불러오는 중...</div>
      </div>
    );
  }

  if (error || !message) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#faf9f7] dark:bg-[#111] px-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-3">
            {error ?? "메시지를 찾을 수 없습니다."}
          </h1>
          <button
            onClick={() => router.push("/")}
            className="mt-6 px-6 py-3 rounded-xl bg-black text-white text-sm hover:bg-gray-800 transition"
          >
            YUA 홈으로
          </button>
        </div>
      </div>
    );
  }

  const formattedDate = new Date(message.createdAt).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="min-h-screen bg-[#faf9f7] dark:bg-[#111]">
      {/* Header */}
      <header className="sticky top-0 z-10 backdrop-blur bg-white/80 dark:bg-[#111]/80 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-[800px] mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => router.push("/")}
            className="text-xl font-bold tracking-tight text-gray-900 dark:text-white"
          >
            YUA
          </button>

          {status === "authed" ? (
            <button
              onClick={handleContinue}
              className="px-4 py-2 rounded-lg bg-black text-white text-sm hover:bg-gray-800 transition"
            >
              이어보기
            </button>
          ) : (
            <button
              onClick={handleLogin}
              className="px-4 py-2 rounded-lg bg-black text-white text-sm hover:bg-gray-800 transition"
            >
              로그인
            </button>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="max-w-[800px] mx-auto px-6 py-10">
        {/* Meta */}
        <div className="mb-8 flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 dark:bg-white/10 text-xs font-medium">
            YUA 응답
          </span>
          {message.model && (
            <span className="text-xs text-gray-400">{message.model}</span>
          )}
          <span className="text-xs">{formattedDate}</span>
        </div>

        {/* Message Body */}
        <article className="prose prose-gray dark:prose-invert max-w-none text-[16px] leading-[1.85]">
          <Markdown content={message.content} streaming={false} />
        </article>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-gray-200 dark:border-gray-800">
          <div className="flex flex-col items-center gap-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              이 응답은 YUA가 생성했습니다.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleContinue}
                className="px-6 py-3 rounded-xl bg-black text-white text-sm hover:bg-gray-800 transition"
              >
                이어보기
              </button>
              <button
                onClick={() => router.push("/chat")}
                className="px-6 py-3 rounded-xl border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition"
              >
                새 대화 시작
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
