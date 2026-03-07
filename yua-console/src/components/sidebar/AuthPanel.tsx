"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

export default function AuthPanel() {
  const { loginWithEmail, signupWithEmail } = useAuth();

  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [register, setRegister] = useState(false);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    try {
      setLoading(true);
      setMsg("");

      if (register) {
        await signupWithEmail(email, pw);
        setMsg("✅ 회원가입 완료");
      } else {
        await loginWithEmail(email, pw);
        setMsg("✅ 로그인 성공");
      }
    } catch (err: any) {
      setMsg(err?.message ?? "❌ 인증 실패");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 text-sm text-slate-300">
      <h2 className="font-semibold text-slate-100">
        {register ? "회원가입" : "로그인"}
      </h2>

      <input
        className="rounded-lg bg-slate-800/70 px-3 py-2 outline-none border border-slate-700/70"
        placeholder="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        className="rounded-lg bg-slate-800/70 px-3 py-2 outline-none border border-slate-700/70"
        placeholder="password"
        type="password"
        value={pw}
        onChange={(e) => setPw(e.target.value)}
      />

      <button
        onClick={onSubmit}
        disabled={loading}
        className="
          rounded-lg bg-emerald-500 text-black py-2 font-semibold
          hover:bg-emerald-400 transition disabled:opacity-50
        "
      >
        {loading ? "처리 중..." : register ? "Register" : "Login"}
      </button>

      <button
        className="text-xs text-sky-300 hover:underline"
        onClick={() => setRegister(!register)}
      >
        {register ? "로그인으로 이동" : "회원가입으로 이동"}
      </button>

      {msg && <div className="text-xs mt-2 text-emerald-300">{msg}</div>}
    </div>
  );
}
