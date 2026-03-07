import { YuaClient, createChatAPI } from "yua-one";
import config from "../../yua.config";

const client = new YuaClient({
  baseURL: config.baseURL,
  apiKey: config.apiKey!,
});

export const yua = createChatAPI(client);
