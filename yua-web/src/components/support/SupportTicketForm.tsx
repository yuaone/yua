"use client";

import { useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";

type Category = "bug" | "billing" | "account" | "feature" | "general";

const CATEGORY_OPTIONS: { value: Category; label: string }[] = [
  { value: "general", label: "일반 문의" },
  { value: "bug", label: "버그 신고" },
  { value: "billing", label: "결제 / 요금" },
  { value: "account", label: "계정 문제" },
  { value: "feature", label: "기능 제안" },
];

const MAX_SUBJECT = 500;
const MAX_CONTENT = 10000;

export default function SupportTicketForm() {
  const { authFetch } = useAuth();

  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<Category>("general");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdTicketId, setCreatedTicketId] = useState<number | null>(null);

  const canSubmit =
    subject.trim().length > 0 &&
    content.trim().length > 0 &&
    subject.length <= MAX_SUBJECT &&
    content.length <= MAX_CONTENT &&
    !submitting;

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!canSubmit) return;

      setSubmitting(true);
      setError(null);

      try {
        const res = await authFetch("/api/support/tickets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subject: subject.trim(),
            category,
            content: content.trim(),
          }),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok || !data?.ok) {
          throw new Error(data?.error || "티켓 생성에 실패했습니다.");
        }

        setCreatedTicketId(data.data?.ticket?.id ?? null);
      } catch (err: any) {
        setError(err.message || "알 수 없는 오류가 발생했습니다.");
      } finally {
        setSubmitting(false);
      }
    },
    [authFetch, subject, category, content, canSubmit]
  );

  const handleReset = useCallback(() => {
    setSubject("");
    setCategory("general");
    setContent("");
    setError(null);
    setCreatedTicketId(null);
  }, []);

  // Success state
  if (createdTicketId !== null) {
    return (
      <div
        style={{
          maxWidth: 600,
          margin: "0 auto",
          padding: 32,
          borderRadius: 16,
          border: "1px solid var(--line)",
          backgroundColor: "var(--surface-panel)",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              backgroundColor: "#10b981",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M5 13l4 4L19 7"
                stroke="#fff"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h2
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: "var(--text-primary)",
              marginBottom: 8,
            }}
          >
            티켓이 접수되었습니다
          </h2>
          <p
            style={{
              fontSize: 14,
              color: "var(--text-secondary)",
              marginBottom: 4,
            }}
          >
            티켓 번호: <strong>#{createdTicketId}</strong>
          </p>
          <p
            style={{
              fontSize: 13,
              color: "var(--text-muted)",
              marginBottom: 24,
            }}
          >
            빠른 시일 내에 답변 드리겠습니다.
          </p>
          <button
            onClick={handleReset}
            style={{
              padding: "10px 24px",
              borderRadius: 8,
              border: "1px solid var(--line)",
              backgroundColor: "transparent",
              color: "var(--text-primary)",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            새 문의 작성
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        maxWidth: 600,
        margin: "0 auto",
        padding: 32,
        borderRadius: 16,
        border: "1px solid var(--line)",
        backgroundColor: "var(--surface-panel)",
      }}
    >
      <h2
        style={{
          fontSize: 18,
          fontWeight: 600,
          color: "var(--text-primary)",
          marginBottom: 24,
        }}
      >
        문의하기
      </h2>

      {/* Subject */}
      <div style={{ marginBottom: 20 }}>
        <label
          htmlFor="support-subject"
          style={{
            display: "block",
            fontSize: 13,
            fontWeight: 500,
            color: "var(--text-secondary)",
            marginBottom: 6,
          }}
        >
          제목
        </label>
        <input
          id="support-subject"
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          maxLength={MAX_SUBJECT}
          placeholder="문의 제목을 입력해 주세요"
          style={{
            width: "100%",
            padding: "10px 14px",
            borderRadius: 8,
            border: "1px solid var(--line)",
            backgroundColor: "var(--wash)",
            color: "var(--text-primary)",
            fontSize: 14,
            outline: "none",
            boxSizing: "border-box",
          }}
        />
        <div
          style={{
            fontSize: 11,
            color: "var(--text-muted)",
            textAlign: "right",
            marginTop: 4,
          }}
        >
          {subject.length}/{MAX_SUBJECT}
        </div>
      </div>

      {/* Category */}
      <div style={{ marginBottom: 20 }}>
        <label
          htmlFor="support-category"
          style={{
            display: "block",
            fontSize: 13,
            fontWeight: 500,
            color: "var(--text-secondary)",
            marginBottom: 6,
          }}
        >
          카테고리
        </label>
        <select
          id="support-category"
          value={category}
          onChange={(e) => setCategory(e.target.value as Category)}
          style={{
            width: "100%",
            padding: "10px 14px",
            borderRadius: 8,
            border: "1px solid var(--line)",
            backgroundColor: "var(--wash)",
            color: "var(--text-primary)",
            fontSize: 14,
            outline: "none",
            boxSizing: "border-box",
            appearance: "none",
          }}
        >
          {CATEGORY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Content */}
      <div style={{ marginBottom: 24 }}>
        <label
          htmlFor="support-content"
          style={{
            display: "block",
            fontSize: 13,
            fontWeight: 500,
            color: "var(--text-secondary)",
            marginBottom: 6,
          }}
        >
          내용
        </label>
        <textarea
          id="support-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={MAX_CONTENT}
          rows={8}
          placeholder="문의 내용을 상세히 적어 주세요"
          style={{
            width: "100%",
            padding: "10px 14px",
            borderRadius: 8,
            border: "1px solid var(--line)",
            backgroundColor: "var(--wash)",
            color: "var(--text-primary)",
            fontSize: 14,
            outline: "none",
            resize: "vertical",
            boxSizing: "border-box",
            lineHeight: 1.6,
          }}
        />
        <div
          style={{
            fontSize: 11,
            color: "var(--text-muted)",
            textAlign: "right",
            marginTop: 4,
          }}
        >
          {content.length}/{MAX_CONTENT}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            backgroundColor: "rgba(239,68,68,0.1)",
            color: "#ef4444",
            fontSize: 13,
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={!canSubmit}
        style={{
          width: "100%",
          padding: "12px 0",
          borderRadius: 8,
          border: "none",
          backgroundColor: canSubmit ? "#7c3aed" : "var(--line)",
          color: canSubmit ? "#fff" : "var(--text-muted)",
          fontSize: 15,
          fontWeight: 600,
          cursor: canSubmit ? "pointer" : "not-allowed",
          transition: "background-color 0.15s, color 0.15s",
        }}
      >
        {submitting ? "접수 중..." : "문의 접수"}
      </button>
    </form>
  );
}
