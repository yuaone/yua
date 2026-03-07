import crypto from "crypto";
import { writeDocument } from "../../db/document-writer";
import { runLLMRewrite } from "../llm/llm-rewrite";
import type { DecisionDomain } from "../decision-assistant/decision-domain";
import { MessageEngine } from "../../ai/engines/message-engine";

export interface DocumentRewritePayload {
  traceId: string;

  workspaceId: string;
  threadId: number;

  documentId: number;
  previousVersion: number;

  domain: DecisionDomain;
  documentType: string;
  language?: string;

  sections: {
    order: number;
    type: string;
    title?: string;
    content: string;
    hash: string;
  }[];
}

export async function runDocumentRewrite(
  input: DocumentRewritePayload
) {
  const {
    traceId,
    workspaceId,
    threadId,
    documentId,
    previousVersion,
    domain,
    documentType,
    language = "ko",
    sections,
  } = input;

  const rewrittenSections = [];

  for (const s of sections) {
    // 🔒 수식/계산은 절대 수정 금지
    if (s.type === "FORMULA" || s.type === "CALCULATION") {
      rewrittenSections.push(s);
      continue;
    }

    const rewritten = await runLLMRewrite({
      traceId,
      text: s.content,
      domain,
      language,
    });

    rewrittenSections.push({
      ...s,
      content: rewritten.text,
      hash: crypto
        .createHash("sha256")
        .update(rewritten.text, "utf8")
        .digest("hex"),
    });
  }

  const newVersion = previousVersion + 1;

  const written = await writeDocument({
    workspaceId,
    threadId,
    documentType,
    domain,
    language,

    generator: "LLM_REWRITE",
    confidence: 0.85,

    sections: rewrittenSections,
    file: {
      uri: "PENDING", // PDF/MD 파이프라인에서 채움
      hash: "PENDING",
    },

    lineage: {
      solverName: "LLM_REWRITE",
      ruleSet: ["NO_FORMULA_MUTATION"],
      failedRules: [],
    },
  });

    await MessageEngine.addMessage({
    threadId,
    userId: 0,
    role: "system",
    content: "",
    meta: {
      studio: {
        sectionId: rewrittenSections[0]?.order ?? 0,
        assetType: "DOCUMENT",
      },
    },
  });

  return {
    ok: true,
    documentId: written.documentId,
    version: newVersion,
  };
}
