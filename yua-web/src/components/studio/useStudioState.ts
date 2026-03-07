"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  planAsset,
  judgeAsset,
  executeAsset,
} from "@/lib/api/studio";
import { useStudioEntry } from "@/store/useStudioContext";
import { useChatStore } from "@/store/useChatStore";
import { runDocumentRewrite } from "@/lib/api/document";

export type StudioMode = "image" | "document" | "video";

export type StudioStatus =
  | "idle"
  | "planning"
  | "judging"
  | "executing"
  | "preview"
  | "done"
  | "blocked";

export function useStudioState(mode: StudioMode) {
  const { authFetch, profile } = useAuth();
  const entry = useStudioEntry();
  const { addSystemMessage } = useChatStore();

  const [status, setStatus] =
    useState<StudioStatus>("idle");
  const [options, setOptions] = useState<any>({});
  const [result, setResult] = useState<any>(null);
   const rewriteSection = async (
   sectionId: string,
   instruction: string
 ) => {
   if (!entry || !result?.sections) return;

   setStatus("executing");

   const rewritten = await runDocumentRewrite(authFetch, {
     documentId: result.documentId,
     previousVersion: result.version,
     sectionId,
     instruction,
   });

   setResult(rewritten.result);
   setStatus("preview");
 };

  /* --------------------------------------------------
     Generate (SSOT)
  -------------------------------------------------- */
  const generate = async (input: string) => {
    try {
          // 🔥 input/attachments 둘 다 없으면 실행 금지
    if (!input?.trim() && (!entry?.attachments || entry.attachments.length === 0)) {
      setStatus("blocked");
      return;
    }
      if (!entry) {
        setStatus("blocked");
        return;
      }

      if (
        !profile?.workspace?.id ||
        !profile?.user?.id
      ) {
        setStatus("blocked");
        return;
      }

      const userId = Number(profile.user.id);
      if (!Number.isFinite(userId) || userId <= 0) {
        setStatus("blocked");
        return;
      }

      setStatus("planning");

      // 1️⃣ PLAN
      const planRes = await planAsset(authFetch, input);
      const plan = planRes.plan;

      setStatus("judging");

      // 2️⃣ JUDGE
      const judgeRes = await judgeAsset(authFetch, plan);
      if (judgeRes.verdict !== "APPROVE") {
        setStatus("blocked");
        return;
      }

      setStatus("executing");

      // 3️⃣ EXECUTE
      const execRes = await executeAsset(authFetch, {
        mode,
        plan,
        workspaceId: profile.workspace.id,
        userId,
        traceId: `studio-${Date.now()}`,
        // 🔥 attachments는 plan/canonical에 이미 반영됨
      });

 setResult({
   ...execRes.result,
   content: execRes.result.markdown, // 🔥 핵심
 });
      setStatus("preview");
    } catch (e) {
      console.error("[STUDIO_ERROR]", e);
      setStatus("blocked");
    }
  };

  /* --------------------------------------------------
     Regenerate
  -------------------------------------------------- */
  const regenerate = () => {
    setResult(null);
    setStatus("idle");
  };

  /* --------------------------------------------------
     Confirm → Chat으로 복귀 메시지
  -------------------------------------------------- */
  const confirm = () => {
    if (!entry || !result || entry.threadId == null) {
      setStatus("done");
      return;
    }

    // 🔒 SSOT: Chat은 sectionId만 신뢰
    if (!result.sectionId) {
      console.warn("[STUDIO] missing sectionId in result");
      setStatus("done");
      return;
    }

    // ✅ Studio 결과를 System Message로 Chat에 삽입
    addSystemMessage({
      threadId: entry.threadId,
      content: "",
      ref: {
        assetType:
          mode === "image"
            ? "IMAGE"
            : mode === "video"
            ? "VIDEO"
            : "DOCUMENT",
            sectionId: result.sectionId,
      },
    });

    setStatus("done");
  };

  return {
    mode,
    status,
    options,
    setOptions,
    result,
    generate,
    regenerate,
    confirm,
    rewriteSection,
  };
}
