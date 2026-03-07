// 📂 src/controllers/workflow-controller.ts
// 🔥 YUA-AI WorkflowController — FINAL ENTERPRISE + MySQL EDITION (2025.11.22)
// ---------------------------------------------------------------------------
// ✔ router 기능 그대로 유지 (save / list / get / run / delete)
// ✔ Firebase + MySQL 혼합 사용
// ✔ Unified Workflow Engine 연동
// ✔ LoggingEngine + workflow_logs 연동
// ---------------------------------------------------------------------------

import { Request, Response } from "express";
import { saveWorkflow, listWorkflows, getWorkflow } from "../service/workflow-db";
import { runFlowUnifiedEngine } from "../workflow/flow-unified-engine";
import { log, logError } from "../utils/logger";
import { db } from "../db/firebase";
import { query } from "../db/db-wrapper";      // ⭐ MySQL 연동
import { LoggingEngine } from "../ai/engines/logging-engine";

export const workflowController = {

  /* -------------------------------------------------------
   * 🟣 1) Workflow 저장
   * ----------------------------------------------------- */
  save: async (req: Request, res: Response): Promise<Response> => {
    const startedAt = Date.now();
    try {
      const { title, flow } = req.body ?? {};
      if (!title || !flow) {
        return res.status(400).json({
          ok: false,
          error: "title or flow missing",
        });
      }

      const saved = await saveWorkflow(title, flow);

      // ⭐ MySQL 저장 로그
      await query(
        `INSERT INTO workflow_logs (action, title, request_json, response_json, created_at)
         VALUES (?, ?, ?, ?, ?)`,
        [
          "save",
          title,
          JSON.stringify(req.body),
          JSON.stringify(saved),
          Date.now(),
        ]
      );

      await LoggingEngine.record({
        route: "workflow/save",
        method: "POST",
        request: req.body,
        response: saved,
        latency: Date.now() - startedAt,
        status: "success",
      });

      return res.json({ ok: true, workflow: saved });
    } catch (e: any) {
      logError("❌ Workflow Save Error: " + e.message);

      await query(
        `INSERT INTO workflow_logs (action, error, request_json, created_at)
         VALUES (?, ?, ?, ?)`,
        ["save_error", String(e), JSON.stringify(req.body), Date.now()]
      );

      return res.status(500).json({ ok: false, error: e.message });
    }
  },

  /* -------------------------------------------------------
   * 🟣 2) Workflow 리스트
   * ----------------------------------------------------- */
  list: async (_req: Request, res: Response): Promise<Response> => {
    try {
      const list = await listWorkflows();

      await query(
        "INSERT INTO workflow_logs (action, response_json, created_at) VALUES (?, ?, ?)",
        ["list", JSON.stringify(list), Date.now()]
      );

      return res.json({ ok: true, list });
    } catch (e: any) {
      return res.status(500).json({ ok: false, error: e.message });
    }
  },

  /* -------------------------------------------------------
   * 🟣 3) Workflow 단일 조회
   * ----------------------------------------------------- */
  get: async (req: Request, res: Response): Promise<Response> => {
    try {
      const workflow = await getWorkflow(req.params.id);

      if (!workflow) {
        await query(
          "INSERT INTO workflow_logs (action, error, created_at) VALUES (?, ?, ?)",
          ["get_not_found", "not found", Date.now()]
        );
        return res.status(404).json({ ok: false, error: "not found" });
      }

      await query(
        "INSERT INTO workflow_logs (action, response_json, created_at) VALUES (?, ?, ?)",
        ["get", JSON.stringify(workflow), Date.now()]
      );

      return res.json({ ok: true, workflow });
    } catch (e: any) {
      return res.status(500).json({ ok: false, error: e.message });
    }
  },

  /* -------------------------------------------------------
   * 🟦 4) Flow 실행 (Unified Engine)
   * ----------------------------------------------------- */
  runFlow: async (req: Request, res: Response): Promise<Response> => {
    const startedAt = Date.now();
    try {
      const flow = req.body;

      const result = await runFlowUnifiedEngine(flow);

      await query(
        "INSERT INTO workflow_logs (action, request_json, response_json, created_at) VALUES (?, ?, ?, ?)",
        ["runFlow", JSON.stringify(req.body), JSON.stringify(result), Date.now()]
      );

      await LoggingEngine.record({
        route: "workflow/run-flow",
        method: "POST",
        request: req.body,
        response: result,
        latency: Date.now() - startedAt,
        status: "success",
      });

      return res.json(result);
    } catch (e: any) {
      logError("❌ FlowRun Error: " + e.message);

      await query(
        "INSERT INTO workflow_logs (action, error, request_json, created_at) VALUES (?, ?, ?, ?)",
        ["runFlow_error", String(e), JSON.stringify(req.body), Date.now()]
      );

      return res.status(500).json({ ok: false, error: e.message });
    }
  },

  /* -------------------------------------------------------
   * 🗑 5) 삭제
   * ----------------------------------------------------- */
  delete: async (req: Request, res: Response): Promise<Response> => {
    try {
      await db.collection("workflows").doc(req.params.id).delete();

      await query(
        "INSERT INTO workflow_logs (action, request_json, created_at) VALUES (?, ?, ?)",
        ["delete", JSON.stringify(req.params), Date.now()]
      );

      return res.json({ ok: true });
    } catch (e: any) {
      return res.status(500).json({ ok: false, error: e.message });
    }
  },
};
