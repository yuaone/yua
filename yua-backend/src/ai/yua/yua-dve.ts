// src/ai/yua/yua-dve.ts

import { logger } from "../../utils/logger";

/**
 * DVE 입력 구조 (임시)
 */
export interface DveInput {
  text: string;
  metadata?: Record<string, unknown>;
}

/**
 * DVE 출력 구조 (임시)
 */
export interface DveOutput {
  isValid: boolean;
  sanitizedText: string;
  issues: string[];
  meta?: Record<string, unknown>;
}

/**
 * Data Validation Engine
 * - prompt hacking, injection, 악성 입력 필터링
 */
export class YuaDataValidationEngine {
  constructor() {}

  async run(input: DveInput): Promise<DveOutput> {
    logger.info("[YuaDVE] run called");

    const issues = this.detectIssues(input.text);
    const sanitized = this.sanitize(input.text);

    return {
      isValid: issues.length === 0,
      sanitizedText: sanitized,
      issues,
      meta: {
        ...input.metadata,
        dveTimestamp: Date.now()
      }
    };
  }

  private detectIssues(text: string): string[] {
    const issues: string[] = [];
    const lower = text.toLowerCase();

    // injection patterns
    const patterns = [
      "select * from",
      "drop table",
      "union select",
      "<script>",
      "rm -rf",
      "sudo ",
      "||",
      "&&",
      "\"\"\"",
      "--",
      "/*",
      "*/"
    ];

    patterns.forEach((p) => {
      if (lower.includes(p)) issues.push(`detected pattern: ${p}`);
    });

    // harmful intent check (light version)
    if (lower.includes("bypass") && lower.includes("policy")) {
      issues.push("potential policy bypass attempt");
    }

    return issues;
  }

  private sanitize(text: string): string {
    return text
      .replace(/<script>/gi, "")
      .replace(/<\/script>/gi, "")
      .replace(/--/g, "")
      .replace(/\/\*/g, "")
      .replace(/\*\//g, "");
  }
}

export const yuaDve = new YuaDataValidationEngine();
export default yuaDve;
