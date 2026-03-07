// src/ai/yua/yua-security.ts

import { logger } from "../../utils/logger";

export interface SecurityInput {
  userId?: string;
  apiKey?: string;
  requestCount?: number;
  metadata?: Record<string, unknown>;
}

export interface SecurityOutput {
  allowed: boolean;
  reasons: string[];
  meta?: Record<string, unknown>;
}

export class YuaSecurityLayer {
  private MAX_REQUESTS = 50;       // 단일 세션 기준
  private bannedKeys = new Set<string>();

  constructor() {}

  async run(input: SecurityInput): Promise<SecurityOutput> {
    logger.info("[YuaSecurityLayer] run called");

    const reasons: string[] = [];

    if (input.apiKey && this.bannedKeys.has(input.apiKey)) {
      reasons.push("API key banned");
    }

    if ((input.requestCount ?? 0) > this.MAX_REQUESTS) {
      reasons.push("rate limit exceeded");
    }

    if (!input.apiKey) {
      reasons.push("missing api key");
    }

    return {
      allowed: reasons.length === 0,
      reasons,
      meta: {
        ...input.metadata,
        securityTimestamp: Date.now()
      }
    };
  }

  // 내부적으로 Key 차단 가능 (YUA 내부 관리자 전용)
  banKey(key: string) {
    this.bannedKeys.add(key);
  }
}

export const yuaSecurity = new YuaSecurityLayer();
export default yuaSecurity;
