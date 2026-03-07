import { Storage } from "@google-cloud/storage";

const storage = new Storage();

export async function resolveAssetHttpUrl(uri: string): Promise<string> {
  if (!uri.startsWith("gs://")) return uri;

  const [, bucket, ...path] = uri.split("/");
  const file = storage.bucket(bucket).file(path.join("/"));

  const [url] = await file.getSignedUrl({
    action: "read",
    expires: Date.now() + 5 * 60 * 1000, // 5분
  });

  return url;
}
