import { APIError } from "./error";

export interface APIClientConfig {
  baseURL: string;
  apiKey?: string;
  authProvider?: () => Promise<string>;
  workspace?: string;
  timeout: number;
  maxRetries: number;
}

export class APIClient {
  private readonly config: APIClientConfig;

  constructor(config: APIClientConfig) {
    this.config = {
      ...config,
      baseURL: config.baseURL.replace(/\/+$/, ""),
    };
  }

  private async buildHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    if (this.config.apiKey) {
      // Backend checks x-api-key header, hashes with SHA256, looks up api_keys_v2
      headers["x-api-key"] = this.config.apiKey;
    } else if (this.config.authProvider) {
      // Firebase token → Authorization: Bearer
      const token = await this.config.authProvider();
      headers["Authorization"] = `Bearer ${token}`;
    }

    if (this.config.workspace) {
      headers["x-workspace-id"] = this.config.workspace;
    }

    return headers;
  }

  private resolveURL(path: string): string {
    const normalized = path.startsWith("/") ? path : `/${path}`;
    return `${this.config.baseURL}${normalized}`;
  }

  async get<T = unknown>(path: string): Promise<T> {
    return this.request("GET", path);
  }

  async post<T = unknown>(path: string, body?: unknown): Promise<T> {
    return this.request("POST", path, body);
  }

  async put<T = unknown>(path: string, body?: unknown): Promise<T> {
    return this.request("PUT", path, body);
  }

  async patch<T = unknown>(path: string, body?: unknown): Promise<T> {
    return this.request("PATCH", path, body);
  }

  async delete<T = unknown>(path: string): Promise<T> {
    return this.request("DELETE", path);
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    attempt = 0,
  ): Promise<T> {
    const headers = await this.buildHeaders();
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      this.config.timeout,
    );

    try {
      const res = await fetch(this.resolveURL(path), {
        method,
        headers,
        body: body != null ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      if (!res.ok) {
        const error = await APIError.fromResponse(res);

        if (error.isRetryable && attempt < this.config.maxRetries) {
          const delay = Math.min(1000 * 2 ** attempt, 8000);
          await new Promise((r) => setTimeout(r, delay));
          return this.request(method, path, body, attempt + 1);
        }

        throw error;
      }

      return (await res.json()) as T;
    } finally {
      clearTimeout(timer);
    }
  }

  async fetchSSE(
    path: string,
    signal?: AbortSignal,
  ): Promise<ReadableStream<Uint8Array>> {
    const headers = await this.buildHeaders();
    headers["Accept"] = "text/event-stream";
    delete headers["Content-Type"];

    const res = await fetch(this.resolveURL(path), {
      method: "GET",
      headers,
      signal,
    });

    if (!res.ok) {
      throw await APIError.fromResponse(res);
    }

    if (!res.body) {
      throw new APIError(500, "no_body", "SSE response has no body");
    }

    return res.body;
  }
}
