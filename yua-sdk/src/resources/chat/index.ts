import type { APIClient } from "../../core/api-client";
import { Completions } from "./completions";
import { Threads } from "./threads";
import { Messages } from "./messages";

export class Chat {
  readonly completions: Completions;
  readonly threads: Threads;
  readonly messages: Messages;

  constructor(client: APIClient) {
    this.completions = new Completions(client);
    this.threads = new Threads(client);
    this.messages = new Messages(client);
  }
}
