// 🔒 CODE CONTEXT BUILDER — SSOT FINAL (PHASE 7 STABLE)
// --------------------------------------------------
// ✔ VerifierEngine 타입 정합
// ✔ throw ❌ / side-effect ❌
// ✔ Dart / C++ / Swift / Kotlin 확장 안정화
// ✔ Regex 안전화

export type SupportedLanguage =
  | "typescript"
  | "javascript"
  | "python"
  | "java"
  | "go"
  | "rust"
  | "dart"
  | "c"
  | "cpp"
  | "csharp"
  | "kotlin"
  | "swift"
  | "php"
  | "ruby"
  | "shell"
  | "sql"
  | "json"
  | "yaml"
  | "unknown";

export interface CodeContext {
  hasCode: boolean;
  hasErrorLog: boolean;

  language: SupportedLanguage;
  code?: string;
  errorLog?: string;

  hasTypes: boolean;
  hasStackTrace: boolean;
  hasRuntimeError: boolean;
}

export type CodeContextResult =
  | { ok: true; context: CodeContext }
  | {
      ok: false;
      error: {
        code: "NO_CODE_PROVIDED" | "INVALID_CODE_TYPE";
        message: string;
      };
    };

export function buildCodeContext(input: {
  code?: string;
  errorLog?: string;
  languageHint?: "auto" | SupportedLanguage;
}): CodeContextResult {
  const { code, errorLog, languageHint = "auto" } = input;

  if (!code && !errorLog) {
    return {
      ok: false,
      error: {
        code: "NO_CODE_PROVIDED",
        message: "Neither code nor errorLog was provided",
      },
    };
  }

  if (code && typeof code !== "string") {
    return {
      ok: false,
      error: {
        code: "INVALID_CODE_TYPE",
        message: "code must be string",
      },
    };
  }

  const language =
    languageHint === "auto"
      ? inferLanguage(code, errorLog)
      : languageHint;

  const hasTypes =
    language === "typescript" ||
    language === "csharp" ||
    language === "kotlin" ||
    /\binterface\b|\btype\b|:\s*[A-Za-z0-9_<>\[\]]+/i.test(code ?? "");

  const hasStackTrace =
    /(at\s.+\(.+:\d+:\d+\))|(Traceback \(most recent call last\))|(Unhandled exception:)|(Exception:)|(Caused by:)/i.test(
      errorLog ?? ""
    );

  const hasRuntimeError =
    /(TypeError|ReferenceError|panic|Exception|Unhandled exception|NullPointerException|Segmentation fault|Fatal error)/i.test(
      errorLog ?? ""
    );

  return {
    ok: true,
    context: {
      hasCode: !!code,
      hasErrorLog: !!errorLog,
      language,
      code,
      errorLog,
      hasTypes,
      hasStackTrace,
      hasRuntimeError,
    },
  };
}

function inferLanguage(
  code?: string,
  errorLog?: string
): SupportedLanguage {
  const text = `${code ?? ""}\n${errorLog ?? ""}`;

  // ---------- TypeScript ----------
  if (
    /\.ts\b/i.test(text) ||
    /\binterface\s+\w+/i.test(text) ||
    /:\s*[A-Za-z0-9_<>\[\]]+/i.test(text)
  ) {
    return "typescript";
  }

  // ---------- JavaScript ----------
  if (
    /\.js\b/i.test(text) ||
    /\bconsole\.log\b/i.test(text) ||
    /\brequire\s*\(/i.test(text)
  ) {
    return "javascript";
  }

  // ---------- Python ----------
  if (
    /\.py\b/i.test(text) ||
    /\bdef\s+\w+\s*\(/i.test(text) ||
    /\bTraceback\b/i.test(text)
  ) {
    return "python";
  }

  // ---------- Dart / Flutter ----------
  if (
    /\.dart\b/i.test(text) ||
    /\bimport\s+["']package:flutter\//i.test(text) ||
    /\bWidget\b/i.test(text) ||
    /\bBuildContext\b/i.test(text) ||
    /\bsetState\s*\(/i.test(text)
  ) {
    return "dart";
  }

  // ---------- Java ----------
  if (
    /\.java\b/i.test(text) ||
    /\bpublic\s+class\b/i.test(text)
  ) {
    return "java";
  }

  // ---------- Kotlin ----------
  if (
    /\.kt\b/i.test(text) ||
    /\bfun\s+\w+\s*\(/i.test(text)
  ) {
    return "kotlin";
  }

  // ---------- Go ----------
  if (
    /\.go\b/i.test(text) ||
    /\bfunc\s+\w+\s*\(/i.test(text)
  ) {
    return "go";
  }

  // ---------- Rust ----------
  if (
    /\.rs\b/i.test(text) ||
    /\bfn\s+\w+\s*\(/i.test(text)
  ) {
    return "rust";
  }

  // ---------- C ----------
  if (
    /\.c\b/i.test(text) ||
    /#include\s+<.*>/i.test(text)
  ) {
    return "c";
  }

  // ---------- C++ ----------
  if (
    /\.cpp\b/i.test(text) ||
    /\bstd::/i.test(text)
  ) {
    return "cpp";
  }

  // ---------- C# ----------
  if (
    /\.cs\b/i.test(text) ||
    /\busing\s+System\b/i.test(text)
  ) {
    return "csharp";
  }

  // ---------- Swift ----------
  if (
    /\.swift\b/i.test(text) ||
    /\bimport\s+Foundation\b/i.test(text)
  ) {
    return "swift";
  }

  // ---------- PHP ----------
  if (
    /\.php\b/i.test(text) ||
    /<\?php/i.test(text)
  ) {
    return "php";
  }

  // ---------- Ruby ----------
  if (
    /\.rb\b/i.test(text) ||
    /\bdef\s+\w+/i.test(text)
  ) {
    return "ruby";
  }

  // ---------- Shell ----------
  if (
    /\.sh\b/i.test(text) ||
    /#!/.test(text)
  ) {
    return "shell";
  }

  // ---------- SQL ----------
  if (
    /\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bFROM\b/i.test(text)
  ) {
    return "sql";
  }

  // ---------- JSON ----------
  if (
    typeof code === "string" &&
    code.trim().startsWith("{") &&
    code.trim().endsWith("}")
  ) {
    return "json";
  }

  // ---------- YAML ----------
  if (
    typeof code === "string" &&
    /^[\w\-"]+\s*:\s*/m.test(code) &&
    !/[;{}()]/.test(code)
  ) {
    return "yaml";
  }

  return "unknown";
}
