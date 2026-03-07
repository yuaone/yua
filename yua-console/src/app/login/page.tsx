"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { loginWithEmail, status } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function onLogin() {
    setError(null);
    try {
      await loginWithEmail(email.trim(), password);
      router.replace("/overview");
    } catch {
      setError("로그인에 실패했습니다.");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-full max-w-sm p-8 rounded-2xl bg-white shadow-xl border border-black/10">
        <h1 className="text-2xl font-bold mb-2">로그인</h1>
        <p className="text-sm text-black/50 mb-6">
          YUA ONE Developer Platform
        </p>

        <input
          type="email"
          className="w-full p-3 rounded-lg border border-black/20 mb-3"
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          className="w-full p-3 rounded-lg border border-black/20 mb-4"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && (
          <p className="text-sm text-red-500 mb-3">{error}</p>
        )}

        <button
          onClick={onLogin}
          disabled={status === "loading"}
          className="w-full py-3 rounded-lg bg-black text-white font-semibold hover:bg-black/90 transition disabled:opacity-50"
        >
          로그인
        </button>

        <p className="text-sm text-black/60 mt-4 text-center">
          계정이 없나요?{" "}
          <a href="/signup" className="underline font-medium">
            회원가입
          </a>
        </p>
      </div>
    </div>
  );
}
