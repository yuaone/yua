// 📂 src/ai/search/url-fetcher.ts
// 🔒 READ-ONLY URL FETCHER — SSOT FINAL (2025.12)

import axios, { AxiosRequestConfig } from "axios";
import { URL } from "url";
import * as pdfParse from "pdf-parse";
/* --------------------------------------------------
 * Types
 * -------------------------------------------------- */


export type FetchedDocument = {
  url: string;
  finalUrl: string;
  status: number;
  contentType: string;
  text: string;
  length: number;
};

export type FetchError =
  | "INVALID_URL"
  | "DISALLOWED_PROTOCOL"
  | "LOGIN_REQUIRED"
  | "UNSUPPORTED_CONTENT_TYPE"
  | "FETCH_FAILED";

/* --------------------------------------------------
 * Config (SSOT)
 * -------------------------------------------------- */

const MAX_BYTES = 1_000_000;
const TIMEOUT_MS = 8000;

const ALLOWED_PROTOCOLS = ["http:", "https:"];

const BLOCKED_PATTERNS = [
  /login/i,
  /signin/i,
  /auth/i,
  /session/i,
];

const ALLOWED_CONTENT_TYPES = [
  "text/plain",
  "text/html",
  "application/json",
  "application/pdf",
];

/* --------------------------------------------------
 * Utils
 * -------------------------------------------------- */

function normalizeUrl(input: string): URL | null {
  try {
    return new URL(input);
  } catch {
    return null;
  }
}

function isBlockedPath(url: URL): boolean {
  return BLOCKED_PATTERNS.some((p) => p.test(url.pathname));
}

function isAllowedContentType(ct: string): boolean {
  return ALLOWED_CONTENT_TYPES.some((t) => ct.startsWith(t));
}

function trimText(input: string): string {
  return input.replace(/\s+/g, " ").replace(/\0/g, "").trim();
}

/* --------------------------------------------------
 * Core Fetcher (READ-ONLY)
 * -------------------------------------------------- */

export async function fetchUrlDocument(
  inputUrl: string
): Promise<FetchedDocument | { error: FetchError }> {

  const url = normalizeUrl(inputUrl);
  if (!url) return { error: "INVALID_URL" };

  if (!ALLOWED_PROTOCOLS.includes(url.protocol)) {
    return { error: "DISALLOWED_PROTOCOL" };
  }

  if (isBlockedPath(url)) {
    return { error: "LOGIN_REQUIRED" };
  }

  const config: AxiosRequestConfig = {
    method: "GET",
    url: url.toString(),
    timeout: TIMEOUT_MS,
    maxContentLength: MAX_BYTES,
    maxBodyLength: MAX_BYTES,
    responseType: "arraybuffer",
    validateStatus: (status) => status >= 200 && status < 400,
    headers: {
      "User-Agent": "YUA-AI-ReadOnlyBot/1.0",
      Accept:
        "text/plain,text/html,application/json,application/pdf;q=0.9,*/*;q=0.1",
    },
  };

  try {
    const res = await axios(config);

    const contentType =
      String(res.headers["content-type"] ?? "").split(";")[0];

    if (!isAllowedContentType(contentType)) {
      return { error: "UNSUPPORTED_CONTENT_TYPE" };
    }

    const buffer: Buffer = Buffer.from(res.data);
    let text = "";

    // 🔥 PDF 파싱
    if (contentType === "application/pdf") {
      try {
        const parsed = await (pdfParse as any)(buffer);
        text = trimText(parsed.text ?? "");
      } catch {
        return { error: "FETCH_FAILED" };
      }
    } else {
      text = trimText(buffer.toString("utf-8"));
    }

    return {
      url: inputUrl,
      finalUrl: res.request?.res?.responseUrl ?? inputUrl,
      status: res.status,
      contentType,
      text,
      length: text.length,
    };
  } catch {
    return { error: "FETCH_FAILED" };
  }
}
