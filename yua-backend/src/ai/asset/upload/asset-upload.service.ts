import fs from "fs";
import path from "path";
import crypto from "crypto";
import { pgPool } from "../../../db/postgres";

export interface AssetUploadResult {
  uploadId: string;
  uri: string;
  mimeType?: string;
  sizeBytes: number;
}

/**
 * 🔒 AssetUploadService
 * - 사용자 이미지 업로드 전용
 * - asset_uploads 테이블과 1:1 매핑
 */
export class AssetUploadService {
  static async uploadImage(params: {
    assetId: string;
    userId: number;
    fileBuffer: Buffer;
    originalName: string;
    mimeType: string;
  }): Promise<AssetUploadResult> {
    const { assetId, userId, fileBuffer, originalName, mimeType } = params;

    const uploadId = crypto.randomUUID();
    const ext = path.extname(originalName) || ".png";

    const dir = path.resolve(
      "storage",
      "uploads",
      assetId
    );

    const filePath = path.join(dir, `${uploadId}${ext}`);

    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, fileBuffer);

    const sizeBytes = fileBuffer.length;

    await pgPool.query(
      `
      INSERT INTO asset_uploads
        (upload_id, asset_id, user_id, uri, mime_type, size_bytes)
      VALUES
        ($1, $2, $3, $4, $5, $6)
      `,
      [
        uploadId,
        assetId,
        userId,
        filePath,
        mimeType,
        sizeBytes,
      ]
    );

    return {
      uploadId,
      uri: filePath,
      mimeType,
      sizeBytes,
    };
  }
}
