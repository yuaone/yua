"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function SignupPage() {
  const router = useRouter();
  const { signupWithEmail, status } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // 🔥 추가 정보
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);

  const [error, setError] = useState<string | null>(null);

  async function onSignup() {
    setError(null);

    // ---- 기본 검증 ----
    if (!email || !password || !name || !phone) {
      setError("모든 항목을 입력해주세요.");
      return;
    }

    if (!agreeTerms || !agreePrivacy) {
      setError("약관 및 개인정보 처리방침에 동의해주세요.");
      return;
    }

    try {
      // 1️⃣ Firebase 계정 생성
      await signupWithEmail(email.trim(), password);

      // 2️⃣ 다음 단계에서 여기서 서버로 profile 전송 예정
      // await fetch("/api/auth/register-profile", { ... })

      router.replace("/overview");
    } catch {
      setError("회원가입에 실패했습니다.");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-full max-w-sm p-8 rounded-2xl bg-white shadow-xl border border-black/10">
        <h1 className="text-2xl font-bold mb-2">회원가입</h1>
        <p className="text-sm text-black/50 mb-6">
          YUA ONE Developer Platform
        </p>

        {/* 이름 */}
        <input
          type="text"
          className="w-full p-3 rounded-lg border border-black/20 mb-3"
          placeholder="이름"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        {/* 이메일 */}
        <input
          type="email"
          className="w-full p-3 rounded-lg border border-black/20 mb-3"
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        {/* 비밀번호 */}
        <input
          type="password"
          className="w-full p-3 rounded-lg border border-black/20 mb-3"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {/* 전화번호 */}
        <input
          type="tel"
          className="w-full p-3 rounded-lg border border-black/20 mb-4"
          placeholder="전화번호 (예: 010-1234-5678)"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />

        {/* 약관 */}
        <div className="space-y-2 mb-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
            />
            <span>이용약관 동의 (필수)</span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={agreePrivacy}
              onChange={(e) => setAgreePrivacy(e.target.checked)}
            />
            <span>개인정보 처리방침 동의 (필수)</span>
          </label>
        </div>

        {error && (
          <p className="text-sm text-red-500 mb-3">{error}</p>
        )}

        <button
          onClick={onSignup}
          disabled={status === "loading"}
          className="w-full py-3 rounded-lg bg-black text-white font-semibold hover:bg-black/90 transition disabled:opacity-50"
        >
          회원가입
        </button>

        <p className="text-sm text-black/60 mt-4 text-center">
          이미 계정이 있나요?{" "}
          <a href="/login" className="underline font-medium">
            로그인
          </a>
        </p>
      </div>
    </div>
  );
}
