"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useLoginModal } from "@/store/store/useLoginModal";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function Hero() {
  const { status } = useAuth();
  const { openModal } = useLoginModal();
  const router = useRouter();

  const isAuthed = status === "authed";
  const isGuest = status === "guest";

    const fullText = "오늘은 무슨 이야기를 할까요?";
  const [displayText, setDisplayText] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayText(fullText.slice(0, i));
      if (i >= fullText.length) {
        clearInterval(interval);
        setDone(true);
      }
    }, 60);

    return () => clearInterval(interval);
  }, []);


 const openLogin = () => {
   openModal({ title: "로그인하고 계속하세요" });
 };

  const handleStart = () => {
    if (status === "loading") return;

    if (status === "authed") {
      router.push("/chat");
    } else {
      openLogin();
    }
  };

  const handleLogin = () => {
    openLogin();
  };

  useEffect(() => {
    if (status === "authed") {
      router.push("/chat");
    }
  }, [status, router]);

  return (
    <section className="pt-20 pb-16 md:pt-32 md:pb-24 text-center px-4 sm:px-6">
 <h1 className="text-3xl md:text-5xl font-semibold tracking-tight text-gray-900 dark:text-white">
   {displayText}
   {!done && (
     <span className="inline-block w-[1ch] animate-pulse">
       |
     </span>
   )}
 </h1>

      <p className="mt-4 text-gray-500 dark:text-gray-400">
        YUA는 대화·설계·사고를 위한 AI 입니다.
      </p>

      <div className="mt-8 md:mt-10 flex flex-col sm:flex-row justify-center gap-3">
        {/* 메인 CTA */}
        <button
          type="button"
          onClick={handleStart}
          className="
            rounded-xl bg-black px-6 py-3
            text-white text-sm font-medium
            hover:opacity-90 transition
          "
        >
          바로 시작하기
        </button>

            {/* ✅ guest일 때만 렌더 (loading ❌) */}
        {isGuest && (
          <button
            type="button"
            onClick={() =>
              openModal({ title: "로그인하고 계속하세요" })
            }
            className="rounded-xl border dark:border-gray-700 px-6 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition"
          >
            로그인
          </button>
        )}
      </div>
    </section>
  );
}
