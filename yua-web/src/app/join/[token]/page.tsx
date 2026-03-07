"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

type JoinStatus = "idle" | "joining" | "joined" | "pending_approval" | "error";

export default function JoinPage({ params }: { params: { token: string } }) {
  const token = params?.token ?? "";
  const { status, authFetch } = useAuth();
  const router = useRouter();
  const [state, setState] = useState<JoinStatus>("idle");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (!token) return;
    if (status !== "authed") return;
    if (state !== "idle") return;
    setState("joining");
    authFetch("/api/workspace/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d?.ok) {
          if (d.status === "pending_approval") {
            setState("pending_approval");
          } else {
            setState("joined");
          }
        } else {
          setError(d?.error ?? "join_failed");
          setState("error");
        }
      })
      .catch(() => {
        setError("join_failed");
        setState("error");
      });
  }, [token, status, authFetch, state]);

  return (
    <div className="mx-auto max-w-xl px-4 sm:px-6 py-10 md:py-12">
      <div className="rounded-2xl border bg-white p-5 sm:p-6">
        <h1 className="text-[18px] font-semibold">워크스페이스 참여</h1>
        <div className="mt-2 text-[13px] text-gray-500">
          초대 링크를 통해 워크스페이스에 참여합니다.
        </div>

        {status !== "authed" && (
          <div className="mt-6 text-[14px]">
            로그인 후 다시 시도해주세요.
          </div>
        )}

        {status === "authed" && state === "joining" && (
          <div className="mt-6 text-[14px]">참여 중...</div>
        )}

        {status === "authed" && state === "joined" && (
          <div className="mt-6">
            <div className="text-[14px]">참여가 완료되었습니다.</div>
            <button
              onClick={() => router.replace("/workspace?tab=team")}
              className="mt-3 rounded-lg bg-black px-4 py-2 text-[14px] text-white"
            >
              워크스페이스로 이동
            </button>
          </div>
        )}

        {status === "authed" && state === "pending_approval" && (
          <div className="mt-6 text-[14px]">
            승인 대기 중입니다. 관리자의 승인을 기다려주세요.
          </div>
        )}

        {status === "authed" && state === "error" && (
          <div className="mt-6 text-[14px] text-red-600">
            참여 실패: {error}
          </div>
        )}
      </div>
    </div>
  );
}
