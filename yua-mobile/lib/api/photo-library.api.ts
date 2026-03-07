import { resolveApiUrl } from "@/adapters/stream/mobileStreamTransport";
import { mobileApiJson } from "@/lib/api/mobileApiClient";
import type { MobilePhotoAsset } from "@/types/assets";

type StudioImagesScope = "workspace" | "user" | "thread";

type StudioImageResponse = {
  ok?: boolean;
  assets?: {
    id?: number | string;
    sectionId?: number | string;
    section_id?: number | string;
    assetType?: string;
    asset_type?: string;
    uri?: string;
    createdAt?: number | string;
    created_at?: number | string;
    threadId?: number | string;
    thread_id?: number | string;
    documentId?: number | string;
    document_id?: number | string;
  }[];
};

type FetchPhotoLibraryAssetsArgs = {
  scope?: StudioImagesScope;
  threadId?: number | null;
};

function toNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toEpochMs(value: unknown): number | null {
  const n = toNumber(value);
  if (n != null) {
    if (n > 0 && n < 10_000_000_000) return n * 1000;
    return n;
  }
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function resolveAssetUri(uri: string | undefined, sectionId: number, assetId: number): string {
  const raw = (uri ?? "").trim();
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("/")) return resolveApiUrl(raw);
  const fallback = `/api/sections/${sectionId}/assets?assetId=${assetId}`;
  return resolveApiUrl(fallback);
}

export async function fetchPhotoLibraryAssets(
  args: FetchPhotoLibraryAssetsArgs = {}
): Promise<MobilePhotoAsset[]> {
  const scope = args.scope ?? "user";
  const query = new URLSearchParams();
  query.set("scope", scope);
  if (scope === "thread" && args.threadId != null) {
    query.set("threadId", String(args.threadId));
  }

  try {
    const res = await mobileApiJson<StudioImageResponse>(`/api/studio/images?${query.toString()}`);
    const rows = Array.isArray(res.assets) ? res.assets : [];
    return rows
      .map((row) => {
        const id = toNumber(row.id);
        const sectionId = toNumber(row.sectionId ?? row.section_id);
        if (id == null || sectionId == null || sectionId <= 0) return null;

        return {
          id,
          sectionId,
          assetType: String(row.assetType ?? row.asset_type ?? "UNKNOWN"),
          uri: resolveAssetUri(row.uri, sectionId, id),
          createdAt: toEpochMs(row.createdAt ?? row.created_at),
          threadId: toNumber(row.threadId ?? row.thread_id),
          documentId: toNumber(row.documentId ?? row.document_id),
        } satisfies MobilePhotoAsset;
      })
      .filter((asset): asset is MobilePhotoAsset => Boolean(asset))
      .sort((a, b) => {
        const aAt = a.createdAt ?? 0;
        const bAt = b.createdAt ?? 0;
        return bAt - aAt;
      });
  } catch {
    return [];
  }
}
