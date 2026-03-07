// src/core/terminal-token-store.ts

import crypto from "crypto";
import { TerminalSessionToken } from "../types/terminal-types";

const TTL_SECONDS = Number(process.env.TERMINAL_TOKEN_TTL || 300);

type StoredToken = {
  session: TerminalSessionToken;
  timeout: NodeJS.Timeout;
};

class TerminalTokenStore {
  private store = new Map<string, StoredToken>();

  issue(params: Omit<TerminalSessionToken, "token" | "issuedAt" | "expiresAt">) {
    const now = Date.now();
    const token = `term_${crypto.randomBytes(24).toString("hex")}`;

    const session: TerminalSessionToken = {
      ...params,
      token,
      issuedAt: now,
      expiresAt: now + TTL_SECONDS * 1000,
    };

    const timeout = setTimeout(() => {
      this.store.delete(token);
    }, TTL_SECONDS * 1000);

    this.store.set(token, { session, timeout });
    return session;
  }

  verify(token: string): TerminalSessionToken | null {
    const entry = this.store.get(token);
    if (!entry) return null;

    const { session } = entry;

    if (session.revoked) return null;
    if (Date.now() > session.expiresAt) {
      this.revoke(token);
      return null;
    }

    return session;
  }

  revoke(token: string) {
    const entry = this.store.get(token);
    if (!entry) return;

    clearTimeout(entry.timeout);
    entry.session.revoked = true;
    this.store.delete(token);
  }
}

export const terminalTokenStore = new TerminalTokenStore();
