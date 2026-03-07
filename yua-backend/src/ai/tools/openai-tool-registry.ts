import type { ToolType } from "./tool-types";

/* ===========================================================
   Types
=========================================================== */

export type OpenAIToolName =
  | "web_search"
  | "web_fetch"
  | "extract_numbers"
  | "python_visualize"
  | "analyze_image"
  | "analyze_csv";

export type OpenAIToolExecutionResult = {
  ok: boolean;
  output?: unknown;
  error?: string;
  size?: number;
};

export type OpenAIToolHandlerContext = {
  traceId?: string;
  allowSearch: boolean;
};

export type OpenAIToolDefinition = {
  name: OpenAIToolName;
  description: string;
  parameters: Record<string, unknown>;
  executionHandler: (
    args: Record<string, unknown>,
    ctx: OpenAIToolHandlerContext
  ) => Promise<OpenAIToolExecutionResult>;
};

/* ===========================================================
   Registry
=========================================================== */

const registry: Record<OpenAIToolName, OpenAIToolDefinition> = {
  /* ---------------- web_search ---------------- */

  web_search: {
    name: "web_search",
    description:
      "Search the web for up-to-date information and return ranked results with evidence.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string" },
        max_results: { type: "integer", minimum: 1, maximum: 8 },
      },
      required: ["query"],
      additionalProperties: false,
    },
    executionHandler: async (args, ctx) => {
      if (!ctx.allowSearch) {
        return { ok: false, error: "ALLOW_SEARCH_FALSE" };
      }

      const query = String(args.query ?? "").trim();
      if (!query) return { ok: false, error: "EMPTY_QUERY" };

      return {
        ok: false,
        error: "OPENAI_NATIVE_WEB_SEARCH_UNSUPPORTED",
      };
    },
  },

  /* ---------------- web_fetch ---------------- */

  web_fetch: {
    name: "web_fetch",
    description:
      "Fetch a single URL (read-only) and return extracted text content.",
    parameters: {
      type: "object",
      properties: {
        url: { type: "string" },
      },
      required: ["url"],
      additionalProperties: false,
    },
    executionHandler: async (args, ctx) => {
      if (!ctx.allowSearch) {
        return { ok: false, error: "ALLOW_SEARCH_FALSE" };
      }

      const url = String(args.url ?? "").trim();
      if (!url) return { ok: false, error: "EMPTY_URL" };

      return {
        ok: false,
        error: "OPENAI_NATIVE_WEB_FETCH_UNSUPPORTED",
      };
    },
  },

  /* ---------------- extract_numbers ---------------- */

  extract_numbers: {
    name: "extract_numbers",
    description:
      "Extract numeric values from text and label them if possible.",
    parameters: {
      type: "object",
      properties: {
        text: { type: "string" },
        label: { type: "string" },
      },
      required: ["text"],
      additionalProperties: false,
    },
    executionHandler: async (args) => {
      const text = String(args.text ?? "");
      const matches = text.match(/-?\d+(\.\d+)?/g) ?? [];
      const numbers = matches
        .map((m) => Number(m))
        .filter((n) => Number.isFinite(n));

      return {
        ok: true,
        output: {
          label: typeof args.label === "string" ? args.label : undefined,
          numbers,
        },
        size: numbers.length,
      };
    },
  },

  /* ---------------- python_visualize (stub) ---------------- */

  python_visualize: {
    name: "python_visualize",
    description:
      "Optional future: generate a visualization spec from numeric data.",
    parameters: {
      type: "object",
      properties: {
        spec: { type: "string" },
        data: { type: "string" },
      },
      required: ["spec", "data"],
      additionalProperties: false,
    },
    executionHandler: async () => {
      return { ok: false, error: "NOT_IMPLEMENTED" };
    },
  },

  /* ---------------- analyze_image ---------------- */

  analyze_image: {
    name: "analyze_image",
    description:
      "Analyze an uploaded image in detail. Describe contents, extract text (OCR), identify objects, read charts/graphs, and provide structured observations.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "What to focus on when analyzing the image",
        },
        detail: {
          type: "string",
          enum: ["auto", "low", "high"],
          description: "Image analysis detail level",
        },
      },
      required: ["query"],
      additionalProperties: false,
    },
    executionHandler: async (args) => {
      // Executed via VisionEngine in ExecutionEngine, not here
      return {
        ok: true,
        output: {
          query: String(args.query ?? ""),
          detail: String(args.detail ?? "auto"),
          status: "DELEGATED_TO_VISION_ENGINE",
        },
      };
    },
  },

  /* ---------------- analyze_csv ---------------- */

  analyze_csv: {
    name: "analyze_csv",
    description:
      "Analyze uploaded CSV or tabular data. Parse structure, compute statistics, identify patterns, and return a preview with summary.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "What to analyze in the data",
        },
        format: {
          type: "string",
          enum: ["csv", "tsv", "json"],
          description: "Data format hint",
        },
      },
      required: ["query"],
      additionalProperties: false,
    },
    executionHandler: async (args) => {
      // Executed via FileAnalyzerEngine in ExecutionEngine
      return {
        ok: true,
        output: {
          query: String(args.query ?? ""),
          format: String(args.format ?? "csv"),
          status: "DELEGATED_TO_FILE_ANALYZER",
        },
      };
    },
  },
};

/* ===========================================================
   Responses API Tool Schema Builder (CORRECT FORMAT)
=========================================================== */

export function buildOpenAIToolSchemas(names: OpenAIToolName[]) {
  // ✅ Responses API(내부 태깅): { type:"function", name, description, parameters }
  // (Chat Completions는 { type:"function", function:{...} } 형태)
  return names.map((n) => ({
    type: "function",
    name: registry[n].name,
    description: registry[n].description,
    parameters: registry[n].parameters,
  }));
}

/* ===========================================================
   Execution
=========================================================== */

export function executeOpenAITool(
  name: OpenAIToolName,
  args: Record<string, unknown>,
  ctx: OpenAIToolHandlerContext
): Promise<OpenAIToolExecutionResult> {
  return registry[name].executionHandler(args, ctx);
}

/* ===========================================================
   ToolGate Mapping
=========================================================== */

export function mapAllowedToolTypesToOpenAITools(
  allowed: ToolType[],
  allowSearch: boolean
): OpenAIToolName[] {
  const names: OpenAIToolName[] = [];

  if (allowed.includes("OPENAI_WEB_SEARCH") && allowSearch) {
    names.push("web_search");
  }

  if (allowed.includes("OPENAI_WEB_FETCH") && allowSearch) {
    names.push("web_fetch");
  }

  if (allowed.includes("OPENAI_CODE_INTERPRETER")) {
    names.push("code_interpreter" as any);
  }

  if (allowed.includes("PY_SOLVER")) {
    names.push("extract_numbers");
  }

  // analyze_image / analyze_csv are auto-allowed via ToolGate signals,
  // not via allowedTools list. They are registered separately in ExecutionEngine.

  return Array.from(new Set(names));
}
