// 📂 src/ai/assets/audio-asset-service.ts

import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

const BASE_DIR = "/mnt/yua/assets/uploads";

export class AudioAssetService {
  async saveAudio(args: {
    workspaceId: string;
    userId: number;
    buffer: Buffer;
    extension: "mp3" | "wav";
  }): Promise<{ url: string }> {
    const { workspaceId, userId, buffer, extension } = args;

    const dir = path.join(
      BASE_DIR,
      workspaceId,
      String(userId),
      "audio"
    );

    await fs.promises.mkdir(dir, { recursive: true });

    const fileName = `${randomUUID()}.${extension}`;
    const localPath = path.join(dir, fileName);

    await fs.promises.writeFile(localPath, buffer);

    const url = `/api/assets/uploads/${workspaceId}/${userId}/audio/${fileName}`;

    return { url };
  }
}