// 📂 src/ai/engines/match-engine.ts
// 🔥 YUA-AI MatchEngine — FINAL STRICT VERSION

import { MatchRepo } from "../../db/repo/match.repo";
import { ValidationEngine } from "./validation-engine";
import { SafetyEngine } from "./safety-engine";
import { query } from "../../db/db-wrapper";

import { openai } from "../utils/openai-client";
import { pickModel } from "../utils/pick-model";
import { VectorEngine } from "../vector/vector-engine";

// clean 함수
function clean(txt: string) {
  if (!txt) return "";
  return txt.replace(/undefined|null/gi, "").trim();
}

export interface MatchCreatePayload {
  userId: string;
  apiKey?: string;
  ip?: string;
}

export interface MatchUsePayload {
  codeId: string;
  apiKey?: string;
  ip?: string;
}

export interface ErrorPayload {
  userId?: string;
  codeId?: string;
  code?: string;
  [key: string]: any;
}

export const MatchEngine = {
  // -------------------------------------------------------------
  // 1) 코드 생성
  // -------------------------------------------------------------
  async create(payload: MatchCreatePayload) {
    const startedAt = Date.now();
    const route = "match.create";

    try {
      if (!ValidationEngine.isString(payload.userId)) {
        return this._error("userId 오류", payload, startedAt, route);
      }

      const unsafe = SafetyEngine.analyzeUnsafe(payload.userId);
      if (unsafe.blocked) {
        return this._error(unsafe.reason ?? "위험 요청", payload, startedAt, route);
      }

      const recent = await MatchRepo.getRecentCode(payload.userId);
      if (recent.found && Date.now() - recent.data.created_at < 60_000) {
        return {
          ok: false,
          throttle: true,
          existingCode: recent.data.code,
        };
      }

      const code = Math.random().toString().slice(2, 8);

      const created = await MatchRepo.createCode({
        code,
        userId: payload.userId,
        createdAt: Date.now(),
        used: false,
        usedAt: null,
      });

      await query(
        "INSERT INTO match_code_logs (event, code, user_id, created_at) VALUES (?, ?, ?, ?)",
        ["create", code, payload.userId, Date.now()]
      );

      const meta = {
        userId: payload.userId,
        createdAt: Date.now(),
        type: "create",
        tags: this._autoTags(payload.userId),
      };

      await new VectorEngine().store(`match:${created.id}`, code, meta);

      const ai = await this._aiExplain("create", code, meta);

      return { ok: true, code, id: created.id, ai, meta };
    } catch (e: any) {
      return this._error(String(e), payload, startedAt, route);
    }
  },

  // -------------------------------------------------------------
  // 2) find
  // -------------------------------------------------------------
  async find(code: string) {
    const startedAt = Date.now();
    const route = "match.find";

    try {
      const found = await MatchRepo.findCode(code);

      if (!found.found) {
        return this._error("코드를 찾을 수 없음", { code }, startedAt, route);
      }

      await query(
        "INSERT INTO match_code_logs (event, code, user_id, created_at) VALUES (?, ?, ?, ?)",
        ["find", code, found.data.user_id, Date.now()]
      );

      const vectorResult = await this._vectorPatternSearch(code);
      const ai = await this._aiExplain("find", code, vectorResult.meta);

      return { ok: true, match: found.data, ai, vector: vectorResult };
    } catch (e: any) {
      return this._error(String(e), { code }, startedAt, route);
    }
  },

  // -------------------------------------------------------------
  // 3) use
  // -------------------------------------------------------------
  async use(payload: MatchUsePayload) {
    const startedAt = Date.now();
    const route = "match.use";

    try {
      const used = await MatchRepo.useCode(Number(payload.codeId));

      if (!used.ok) {
        return this._error("코드 사용 불가 또는 이미 사용됨", payload, startedAt, route);
      }

      await query(
        "INSERT INTO match_code_logs (event, code, user_id, created_at) VALUES (?, ?, ?, ?)",
        ["use", payload.codeId, "-", Date.now()]
      );

      const suspicious = this._fraudDetect(payload.codeId);

      const ai = await this._aiExplain("use", String(payload.codeId), {
        suspicious,
      });

      return { ok: true, used: true, ai, suspicious };
    } catch (e: any) {
      return this._error(String(e), payload, startedAt, route);
    }
  },

  // -------------------------------------------------------------
  // AI 설명
  // -------------------------------------------------------------
  async _aiExplain(type: string, code: string, meta: any = {}) {
    const client = openai();
    if (!client) return "AI 설명 비활성화됨(Mock)";

    const model = pickModel("match");

    const completion = await client.responses.create({
      model,
      input: `
매칭 코드 이벤트를 기술적으로 요약해줘.
event: ${type}
code: ${code}
meta: ${JSON.stringify(meta)}
    `.trim(),
      max_output_tokens: 150,
    });

    return clean(completion.output_text?.trim() ?? "");
  },

  async _vectorPatternSearch(code: string) {
    const VE = new VectorEngine();
    const results = await VE.search(code, 3);

    const normalized = results.map((v: any) => ({
      id: v.id,
      score: v.score,
      meta: v.meta,
    }));

    const sorted = normalized.sort(
  (a: { score: number }, b: { score: number }) => a.score - b.score
);

    return { ok: true, result: sorted, meta: sorted[0]?.meta ?? {} };
  },

  _fraudDetect(codeId: string) {
    if (String(codeId).startsWith("000"))
      return "⚠️ 의심스러운 패턴(000 시작)";
    return null;
  },

  _autoTags(userId: string) {
    const tags: string[] = [];
    if (userId.startsWith("biz_")) tags.push("기업계정");
    if (userId.startsWith("dev_")) tags.push("개발자");
    if (userId.length >= 12) tags.push("보안강화");
    return tags;
  },

  async _error(message: string, request: ErrorPayload, start: number, route: string) {
    await query(
      "INSERT INTO match_code_logs (event, code, user_id, created_at, info) VALUES (?, ?, ?, ?, ?)",
      ["error", "-", request?.userId ?? "-", Date.now(), message]
    );

    return { ok: false, error: clean(message) };
  },
};
