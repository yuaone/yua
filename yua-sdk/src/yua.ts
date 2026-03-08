import { APIClient } from "./core/api-client";
import { Chat } from "./resources/chat";
import { Embeddings } from "./resources/embeddings";
import { Admin } from "./resources/admin";
import { Billing } from "./resources/billing";

export interface YUAConfig {
  apiKey?: string;
  authProvider?: () => Promise<string>;
  baseURL?: string;
  workspace?: string;
  timeout?: number;
  maxRetries?: number;
}

export class YUA {
  readonly chat: Chat;
  readonly embeddings: Embeddings;
  readonly admin: Admin;
  readonly billing: Billing;

  private readonly _client: APIClient;

  constructor(config: YUAConfig = {}) {
    if (!config.apiKey && !config.authProvider) {
      throw new Error(
        "YUA SDK: either apiKey or authProvider must be provided",
      );
    }

    this._client = new APIClient({
      baseURL: config.baseURL ?? "https://api.yuaone.com",
      apiKey: config.apiKey,
      authProvider: config.authProvider,
      workspace: config.workspace,
      timeout: config.timeout ?? 30_000,
      maxRetries: config.maxRetries ?? 2,
    });

    this.chat = new Chat(this._client);
    this.embeddings = new Embeddings(this._client);
    this.admin = new Admin(this._client);
    this.billing = new Billing(this._client);
  }
}
