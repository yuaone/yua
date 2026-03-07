// src/lib/api/document.ts
export async function runDocumentRewrite(
  authFetch: any,
  payload: {
    documentId: number;
    previousVersion: number;
    sectionId: string;
    instruction: string;
  }
) {
  const res = await authFetch("/api/document/rewrite", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error("DOCUMENT_REWRITE_FAILED");
  }

  return res.json();
}
