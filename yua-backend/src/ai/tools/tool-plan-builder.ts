import type { ToolGateDecision } from "./tool-types";
import type { PathType } from "../../routes/path-router";
import type { ToolType } from "./tool-types";
import { extractMarketInput } from "./input-extractor";
import { formatDate } from "../../utils/date-utils";
export interface ToolPlanItem {
  tool: ToolType;
  payload: {
    query: string;
    domain?:
      | "MARKET"
      | "MATH"
      | "STATISTICS"
      | "PHYSICS"
      | "CHEMISTRY"
      | "DOCUMENT"
      | "IMAGE";
    options?: Record<string, unknown>;
  };
}

export interface ToolExecutionPlan {
  items: ToolPlanItem[];
  reason: string;
}

export function buildToolExecutionPlan(
  args: {
    message: string;
    path: PathType;
    toolGate: ToolGateDecision;
    executionTask?: string;
  }
): ToolExecutionPlan {
  const { message, toolGate, path, executionTask } = args;

  if (!toolGate || toolGate.toolLevel === "NONE") {
    return { items: [], reason: "tool_level_none" };
  }

  /* ----------------------------- */
  /* 🧩 EXECUTION TASK              */
  /* ----------------------------- */
  if (executionTask) {
    switch (executionTask) {
      case "FILE_ANALYSIS":
      case "TABLE_EXTRACTION":
      case "DATA_TRANSFORM":
        return {
          items: [
            {
              tool: "DOCUMENT_BUILDER" as const,
              payload: {
                query: message,
                domain: "DOCUMENT",
                options: {},
              },
            },
          ],
          reason: "document_builder",
        };

      case "IMAGE_ANALYSIS":
        return {
          items: [
            {
              tool: "PY_SOLVER" as const,
              payload: {
                query: message,
                domain: "IMAGE",
                options: {},
              },
            },
          ],
          reason: "py_solver_image",
        };

      case "SEARCH_VERIFY":
      case "SEARCH":
        return {
          items: [
            {
              tool: "OPENAI_WEB_SEARCH" as const,
              payload: {
                query: message.slice(0, 300),
                options: {},
              },
            },
          ],
          reason: "openai_web_search",
        };

      case "MARKET_DATA": {
        const marketInput = extractMarketInput(message);

 // 🔒 SSOT: NORMAL / DESIGN 질문에서 MARKET_DATA 금지
 // 🔒 SSOT: DESIGN 질문은 MARKET_DATA 강한 비추천 (힌트)
 const designLike =
   path === "NORMAL" && toolGate.reason?.includes("design");

 if (!marketInput?.symbolHints?.length || designLike) {
   return {
     items: [],
     reason: designLike
       ? "market_skipped_design_question"
       : "market_input_insufficient",
   };
 }

        let start: string;
        let end: string;

        // 🔒 SSOT: exact = 단일 일자 조회
        if (marketInput.dateHint?.kind === "exact") {
          start = marketInput.dateHint.raw;
          end = marketInput.dateHint.raw;
        }

         // 🔒 year = 연 단위
        else if (marketInput.dateHint?.kind === "year") {
          const y = Number(marketInput.dateHint.raw);
          start = formatDate(new Date(y, 0, 1));
          end = formatDate(new Date(y, 11, 31));
        }
        // 🔒 range = 월 단위
        else if (marketInput.dateHint?.kind === "range") {
          const [y, m] = marketInput.dateHint.raw.split("-");
          const monthStart = new Date(Number(y), Number(m) - 1, 1);
          const monthEnd = new Date(Number(y), Number(m), 0);

          start = formatDate(monthStart);
          end = formatDate(monthEnd);
        }
        // 🔒 default = 최근 1년
        else {
          end = formatDate(new Date());
          start = formatDate(
            new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
          );
        }

        return {
          items: [
            {
              tool: "MARKET_DATA" as const,
              payload: {
                query: message,
                domain: "MARKET",
                options: {
                  symbols: marketInput.symbolHints,
                  start,
                  end,
                  dateKind: marketInput.dateHint?.kind,
                  range:
                    marketInput.dateHint?.kind === "range"
                      ? { start, end }
                      : undefined,
                },
              },
            },
          ],
          reason: marketInput.dateHint
            ? `market_data_${marketInput.dateHint.kind}_date_hint`
            : "market_data_range_default",
        };
      }

      case "DIRECT_CHAT":
        return {
          items: [],
          reason: "direct_chat",
        };
    }
  }

  /* ----------------------------- */
  /* 🧮 FALLBACK                   */
  /* ----------------------------- */
  if (toolGate.allowedTools.includes("PY_SOLVER")) {
    const pyDomain = detectPySolverDomain(message);
    if (pyDomain) {
      return {
        items: [
          {
            tool: "PY_SOLVER" as const,
            payload: {
              query: message,
              domain: pyDomain,
              options: {},
            },
          },
        ],
        reason: "py_solver",
      };
    }
  }

  /* 🔒 SSOT: NO FALLBACK TOOL */
  return {
    items: [],
    reason: "no_applicable_tool",
  };
}

function detectPySolverDomain(
  message: string
): "MATH" | "STATISTICS" | "PHYSICS" | "CHEMISTRY" | null {
  const q = message ?? "";

  if (/(variance|mean|probability|statistics|통계|분산|평균)/i.test(q)) {
    return "STATISTICS";
  }
  if (/(force|energy|velocity|physics|물리|가속도|질량)/i.test(q)) {
    return "PHYSICS";
  }
  if (/(reaction|mole|chemistry|화학|반응|몰|->)/i.test(q)) {
    return "CHEMISTRY";
  }
  if (/[0-9]+\s*[\+\-\*\/\^]\s*[0-9]+/.test(q) || /=/.test(q)) {
    return "MATH";
  }

  return null;
}
