export class APIError extends Error {
  readonly status: number;
  readonly code: string;
  readonly requestId?: string;

  constructor(
    status: number,
    code: string,
    message: string,
    requestId?: string,
  ) {
    super(message);
    this.name = "APIError";
    this.status = status;
    this.code = code;
    this.requestId = requestId;
  }

  get isRetryable(): boolean {
    return [429, 502, 503, 504].includes(this.status);
  }

  get isAuthError(): boolean {
    return [401, 403].includes(this.status);
  }

  static async fromResponse(res: Response): Promise<APIError> {
    let code = "unknown_error";
    let message = `Request failed: ${res.status} ${res.statusText}`;
    let requestId: string | undefined;

    try {
      const body = await res.json();
      // Backend returns { ok: false, error: "string_code" } or { code, message }
      if (typeof body.error === "string") {
        code = body.error;
        message = body.message ?? body.error;
      } else {
        code = body.code ?? body.error?.code ?? code;
        message = body.message ?? body.error?.message ?? message;
      }
      requestId = body.requestId ?? body.traceId;
    } catch {
      // body not JSON
    }

    if (res.status === 401 || res.status === 403) {
      return new AuthenticationError(res.status, code, message, requestId);
    }
    if (res.status === 429) {
      const retryAfter = parseInt(res.headers.get("retry-after") ?? "", 10);
      return new RateLimitError(
        code,
        message,
        Number.isFinite(retryAfter) ? retryAfter : undefined,
        requestId,
      );
    }
    if (res.status === 400) {
      return new BadRequestError(code, message, requestId);
    }
    return new APIError(res.status, code, message, requestId);
  }
}

export class AuthenticationError extends APIError {
  constructor(
    status: number,
    code: string,
    message: string,
    requestId?: string,
  ) {
    super(status, code, message, requestId);
    this.name = "AuthenticationError";
  }
}

export class RateLimitError extends APIError {
  readonly retryAfter?: number;

  constructor(
    code: string,
    message: string,
    retryAfter?: number,
    requestId?: string,
  ) {
    super(429, code, message, requestId);
    this.name = "RateLimitError";
    this.retryAfter = retryAfter;
  }
}

export class BadRequestError extends APIError {
  constructor(code: string, message: string, requestId?: string) {
    super(400, code, message, requestId);
    this.name = "BadRequestError";
  }
}
