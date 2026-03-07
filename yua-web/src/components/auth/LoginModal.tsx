"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLoginModal } from "@/store/store/useLoginModal";
import { useRouter, useSearchParams } from "next/navigation";
import { InAppBrowserModal } from "./InAppBrowserModal";

type Mode = "login" | "signup";

export default function LoginModal() {
  const {
    signInWithGoogle,
    loginWithEmail,
    signupWithEmail,
    status,
  } = useAuth();

  const { open, title, closeModal, afterLogin } = useLoginModal();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [mode, setMode] = useState<Mode>("login");
  const [submitting, setSubmitting] = useState(false);
  const [inAppModalOpen, setInAppModalOpen] = useState(false);
  const autoOpenHandledRef = useRef(false);

  // 모달이 열린 상태에서 인증 완료된 경우에만 리다이렉트
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (open) wasOpenRef.current = true;
  }, [open]);

  useEffect(() => {
    if (status !== "authed") return;
    if (!wasOpenRef.current) return;

    wasOpenRef.current = false;
    closeModal();

    if (afterLogin) {
      afterLogin();
    } else {
      router.replace("/chat");
    }

    setSubmitting(false);
  }, [status, closeModal, afterLogin, router]);

  useEffect(() => {
    if (status !== "authed") {
      autoOpenHandledRef.current = false;
    }
  }, [status]);

  useEffect(() => {
    if (autoOpenHandledRef.current) return;
    if (searchParams.get("login") !== "1") return;
    if (open) return;
    autoOpenHandledRef.current = true;
    useLoginModal.getState().openModal({
      title: "로그인하고 계속하세요",
    });
  }, [searchParams, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
       <div className="relative w-full max-w-[480px] max-md:max-w-[95vw] bg-white dark:bg-[#1b1b1b] rounded-2xl shadow-2xl mx-4">
        {/* Close */}
        <button
          onClick={closeModal}
          className="absolute right-5 top-5 text-gray-400 hover:text-black"
        >
          ✕
        </button>

        {/* Title */}
        <div className="px-8 pt-12 pb-8">
          <h2 className="text-[22px] font-semibold tracking-tight text-center">
          {title ??
            (mode === "login"
              ? "로그인하고 계속하세요"
              : "YUA 계정 만들기")}
        </h2>

        <p className="mt-2 text-sm text-gray-500 text-center">
          {mode === "login"
            ? "로그인하면 대화 기록과 워크스페이스가 저장됩니다."
            : "기본 정보는 지원 및 보안을 위해 필요합니다."}
        </p>

        {/* Google (Login only) */}
        {mode === "login" && (
          <button
            onClick={async () => {
              if (submitting || status === "loading") return;
              try {
                setSubmitting(true);
                await signInWithGoogle();
              } catch (err: any) {
                setSubmitting(false);
                if (err?.code === "IN_APP_BROWSER") {
                  setInAppModalOpen(true);
                  return;
                }
              }
            }}
            disabled={status === "loading"}
            className="mt-7 w-full rounded-xl bg-black py-3 text-white disabled:opacity-50"
          >
            Google로 계속하기
          </button>
        )}

        {/* Divider */}
        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-gray-200" />
          <span className="text-xs text-gray-400">또는</span>
          <div className="h-px flex-1 bg-gray-200" />
        </div>

        {/* Form */}
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (submitting) return;

            const form = e.currentTarget;

            const email = (form.elements.namedItem("email") as HTMLInputElement).value;
            const password = (form.elements.namedItem("password") as HTMLInputElement).value;

            setSubmitting(true);

            if (mode === "login") {
              loginWithEmail(email, password).catch(() =>
                setSubmitting(false)
              );
            } else {
              const name = (form.elements.namedItem("name") as HTMLInputElement).value;
              const phone = (form.elements.namedItem("phone") as HTMLInputElement).value;
              const birthY = (form.elements.namedItem("birthY") as HTMLInputElement).value;
              const birthM = (form.elements.namedItem("birthM") as HTMLInputElement).value;
              const birthD = (form.elements.namedItem("birthD") as HTMLInputElement).value;

              const pad2 = (v: string) => v.padStart(2, "0");

              signupWithEmail({
                email,
                password,
                name,
                phone,
                birth: `${birthY}-${pad2(birthM)}-${pad2(birthD)}`,
              }).catch(() => setSubmitting(false));
            }
          }}
        >
          {mode === "signup" && (
            <>
              <input name="name" placeholder="이름" required className="input" />
              <input name="phone" placeholder="전화번호" required className="input" />
              <div className="flex gap-2">
                <input name="birthY" placeholder="YYYY" required inputMode="numeric" maxLength={4} className="input" />
                <input name="birthM" placeholder="MM" required inputMode="numeric" maxLength={2} className="input" />
                <input name="birthD" placeholder="DD" required inputMode="numeric" maxLength={2} className="input" />
              </div>
            </>
          )}

          <input name="email" type="email" placeholder="이메일" required className="input" />
          <input name="password" type="password" placeholder="비밀번호" required className="input" />

          <button
            type="submit"
            className="w-full rounded-xl bg-black py-3.5 text-sm text-white"
          >
            {mode === "login" ? "로그인" : "회원가입"}
          </button>
        </form>

        {/* Switch */}
        <div className="mt-4 text-center text-sm text-gray-500">
          {mode === "login" ? (
            <>
              계정이 없으신가요?{" "}
              <button
                onClick={() => setMode("signup")}
                className="font-medium text-black"
              >
                회원가입
              </button>
            </>
          ) : (
            <>
              이미 계정이 있나요?{" "}
              <button
                onClick={() => setMode("login")}
                className="font-medium text-black"
              >
                로그인
              </button>
            </>
          )}
        </div>
        </div>
      </div>

      <InAppBrowserModal
        open={inAppModalOpen}
        onClose={() => setInAppModalOpen(false)}
      />
    </div>
  );
}
