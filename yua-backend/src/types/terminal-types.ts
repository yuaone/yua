// src/types/terminal-types.ts

export type TerminalScope = "ssh";

export interface TerminalSessionToken {
  token: string;
  instanceId: string;
  userId: string;
  scope: TerminalScope;
  issuedAt: number;
  expiresAt: number;
  revoked?: boolean;
}

export interface TerminalTokenRequest {
  instanceId: string;
}

export interface TerminalTokenResponse {
  ok: true;
  token: string;
  expiresAt: number;
}

export interface TerminalVerifyRequest {
  token: string;
}

export interface TerminalVerifyResponse {
  ok: true;
  session: TerminalSessionToken;
}

export interface TerminalRevokeRequest {
  token: string;
}
