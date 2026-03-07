// 📂 src/control/suggestion-feedback.controller.ts
// 🔥 YUA Suggestion Feedback Controller — SSOT FINAL
// --------------------------------------------------
// ✔ UI → Server telemetry only
// ✔ Judgment / Rule / Memory ❌
// ✔ UI 표현(UP/DOWN)을 FOLLOW/DISMISS로 정규화
// ✔ deterministic / safe guards
// --------------------------------------------------

import { Request, Response } from "express";
import {
  FlowLogRepo,
  type FlowSuggestionFeedbackAction,
} from "../ai/suggestion/flow-log.repo";

/**
 * UI-level action (확장 가능)
 */
type SuggestionFeedbackAction =
  | "FOLLOW"
  | "DISMISS"
  | "UP"
  | "DOWN";

/* --------------------------------------------------
 * Helpers
 * -------------------------------------------------- */

function asTrimmedString(v: unknown): string {
  if (typeof v !== "string") return "";
  return v.trim();
}

function toSafeThreadId(v: unknown): number {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.floor(n);
}

/**
 * 🔒 UI Action → Repo Action 정규화 (SSOT)
 */
function normalizeAction(
  action: SuggestionFeedbackAction
): FlowSuggestionFeedbackAction | null {
  switch (action) {
    case "FOLLOW":
    case "UP":
      return "FOLLOW";

    case "DISMISS":
    case "DOWN":
      return "DISMISS";

    default:
      return null;
  }
}

/* --------------------------------------------------
 * Controller
 * -------------------------------------------------- */

export const suggestionFeedbackController = {
  async submit(req: Request, res: Response) {
    const threadId = toSafeThreadId(req.body?.threadId);
    const traceId = asTrimmedString(req.body?.traceId);
    const suggestionId = asTrimmedString(req.body?.suggestionId);
    const rawAction =
      asTrimmedString(req.body?.action) as SuggestionFeedbackAction;

    /* -----------------------------
     * Guard (SSOT-safe)
     * ----------------------------- */
    if (!threadId || !traceId || !suggestionId || !rawAction) {
      return res.status(400).json({
        ok: false,
        error: "missing_required_fields",
      });
    }

    // 최소 길이 가드 (노이즈 / 공격 완화)
    if (traceId.length < 8 || suggestionId.length < 2) {
      return res.status(400).json({
        ok: false,
        error: "invalid_id_format",
      });
    }

    const normalizedAction = normalizeAction(rawAction);

    if (!normalizedAction) {
      return res.status(400).json({
        ok: false,
        error: "invalid_action",
      });
    }

    try {
      // 🔒 Telemetry append only (NO decision impact)
      await FlowLogRepo.appendFeedback({
        threadId,
        traceId,
        suggestionId,
        action: normalizedAction,
      });

      return res.status(200).json({ ok: true });
    } catch (e) {
      console.error("[SUGGESTION_FEEDBACK_ERROR]", e);
      return res.status(500).json({
        ok: false,
        error: "feedback_commit_failed",
      });
    }
  },
  async list(req: Request, res: Response) {
    const threadId = Number(req.query.threadId);

    if (!Number.isFinite(threadId) || threadId <= 0) {
      return res.status(400).json({
        ok: false,
        error: "invalid_thread_id",
      });
    }

    try {
      const rows = await FlowLogRepo.findRecentByThread(threadId, 50);

      const items = rows.flatMap((row) => {
        const suggestions = row.suggestions as any;
        const feedback = suggestions?.feedback;
        if (!Array.isArray(feedback)) return [];
        return feedback;
      });

      return res.json({
        ok: true,
        items,
      });
    } catch (e) {
      console.error("[SUGGESTION_FEEDBACK_LIST_ERROR]", e);
      return res.status(500).json({
        ok: false,
        error: "feedback_list_failed",
      });
    }
  },
};
