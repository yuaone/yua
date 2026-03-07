"use client";

import { useSearchParams } from "next/navigation";
import DocumentCollabPage from "@/components/studio/document/DocumentCollabPage";
import BlockDocumentPage from "@/components/studio/document/editor/BlockDocumentPage";

export default function DocumentStudioPage() {
  const searchParams = useSearchParams();
  const editorMode = searchParams.get("editor");

  // legacy editor only when explicitly requested
  if (editorMode === "legacy") {
    return <DocumentCollabPage />;
  }

  return <BlockDocumentPage />;
}
