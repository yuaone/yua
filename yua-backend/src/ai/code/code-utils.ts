// 📂 src/ai/code/code-utils.ts
// 🔧 CodeEngine Utility (2025.11)

export const CodeUtils = {
  detectLanguage(code: string): string {
    if (code.includes("import React")) return "tsx";
    if (code.includes("function") || code.includes("const")) return "javascript";
    if (code.includes("class") && code.includes("public static void main"))
      return "java";
    if (code.includes("def ") || code.includes("import")) return "python";
    return "plaintext";
  },

  sanitize(code: string): string {
    return code.replace(/undefined|null/gi, "").trim();
  },
};
