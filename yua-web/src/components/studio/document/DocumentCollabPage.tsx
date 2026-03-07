"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  FileText,
  Plus,
  Globe,
  Users,
  Eye,
  PencilLine,
  PanelRightClose,
  PanelRightOpen,
  PanelLeftClose,
  PanelLeftOpen,
  History,
  Calendar,
  Search,
  Lock,
  Unlock,
  Copy,
  Languages,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

type WorkspaceDoc = {
  id: string;
  title: string;
  updated_at: string;
};

type RevisionItem = {
  id: number;
  version: number;
  editor_user_id: number;
  summary: string;
  created_at: string;
  has_snapshot: boolean;
};

type CalendarNote = {
  id: number;
  note_date: string;
  memo: string;
  updated_by: number;
  updated_at: string;
};

type PresenceItem = {
  userId: number;
  clientId: string;
  displayName?: string | null;
  color?: string | null;
  cursor?: { anchor: number; head: number } | null;
  updatedAt: number;
};

type WsServerMessage =
  | {
      type: "hello";
      docId: string;
      role: "owner" | "admin" | "member" | "viewer";
      canWrite: boolean;
    }
  | { type: "presence_snapshot"; docId: string; presence: PresenceItem[] }
  | {
      type: "cursor";
      docId: string;
      userId: number;
      clientId: string;
      cursor: { anchor: number; head: number } | null;
      updatedAt: number;
    }
  | { type: "doc_ack"; version: number }
  | { type: "error"; code: string; message: string; currentVersion?: number };

type TextPatch = {
  from: number;
  to: number;
  text: string;
};

const INITIAL_TEMPLATE = `# 새 문서

## 개요
- 목적:
- 범위:
- 담당자:

## 작업 메모
- `;

function utf8ToBase64(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i] ?? 0);
  return btoa(binary);
}

function toWsAbsoluteUrl(path: string): string {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || window.location.origin;
  const parsed = new URL(apiBase, window.location.origin);
  const origin = parsed.origin.replace(/^http/i, "ws");
  return `${origin}${path}`;
}

function getCursorFromTextArea(el: HTMLTextAreaElement | null) {
  if (!el) return { anchor: 0, head: 0 };
  return {
    anchor: Number(el.selectionStart ?? 0),
    head: Number(el.selectionEnd ?? 0),
  };
}

function buildSingleReplacePatch(prev: string, next: string): TextPatch | null {
  if (prev === next) return null;
  let start = 0;
  const minLen = Math.min(prev.length, next.length);
  while (start < minLen && prev[start] === next[start]) start += 1;
  let prevEnd = prev.length;
  let nextEnd = next.length;
  while (prevEnd > start && nextEnd > start && prev[prevEnd - 1] === next[nextEnd - 1]) {
    prevEnd -= 1;
    nextEnd -= 1;
  }
  return { from: start, to: prevEnd, text: next.slice(start, nextEnd) };
}

function toMonthString(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function toDateString(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function monthGrid(viewDate: Date) {
  const y = viewDate.getFullYear();
  const m = viewDate.getMonth();
  const first = new Date(y, m, 1);
  const last = new Date(y, m + 1, 0);
  const firstWeekday = first.getDay();
  const daysInMonth = last.getDate();

  const cells: Array<Date | null> = [];
  for (let i = 0; i < firstWeekday; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(new Date(y, m, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export default function DocumentCollabPage() {
  const { authFetch, profile } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const docIdFromUrl = searchParams.get("docId");

  const [docs, setDocs] = useState<WorkspaceDoc[]>([]);
  const [revisions, setRevisions] = useState<RevisionItem[]>([]);
  const [calendarNotes, setCalendarNotes] = useState<CalendarNote[]>([]);
  const [activeDocId, setActiveDocId] = useState<string | null>(docIdFromUrl);
  const [markdown, setMarkdown] = useState<string>(INITIAL_TEMPLATE);
  const [titleDraft, setTitleDraft] = useState<string>("문서");
  const [presence, setPresence] = useState<PresenceItem[]>([]);
  const [canWrite, setCanWrite] = useState<boolean>(true);
  const [role, setRole] = useState<string>("member");
  const [connecting, setConnecting] = useState(false);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarMode, setCalendarMode] = useState<"month" | "year">("month");
  const [viewDate, setViewDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(toDateString(new Date()));
  const [noteDraft, setNoteDraft] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [translateOpen, setTranslateOpen] = useState(false);
  const [translatedText, setTranslatedText] = useState<string>("");
  const [toast, setToast] = useState<{ message: string; kind: "ok" | "warn" } | null>(null);
  const [locked, setLocked] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const clientIdRef = useRef<string>(`web-${Math.random().toString(36).slice(2)}`);
  const saveTimerRef = useRef<number | null>(null);
  const heartbeatRef = useRef<number | null>(null);
  const titleSaveTimerRef = useRef<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const lastTextRef = useRef<string>(INITIAL_TEMPLATE);
  const versionRef = useRef<number>(0);
  const patchQueueRef = useRef<TextPatch[]>([]);
  const opCountRef = useRef<number>(0);

  const selectedDoc = useMemo(
    () => docs.find((d) => d.id === activeDocId) ?? null,
    [docs, activeDocId]
  );

  const showToast = useCallback((message: string, kind: "ok" | "warn" = "ok") => {
    setToast({ message, kind });
    window.setTimeout(() => setToast(null), 1200);
  }, []);

  useEffect(() => {
    setTitleDraft(selectedDoc?.title ?? "문서");
  }, [selectedDoc?.id, selectedDoc?.title]);

  const loadDocs = useCallback(async () => {
    if (!authFetch) return;
    const res = await authFetch("/workspace/docs");
    if (!res.ok) return;
    const j = await res.json();
    const next = (j?.docs ?? []) as WorkspaceDoc[];
    setDocs(next);
    setActiveDocId((prev) => prev ?? next[0]?.id ?? null);
  }, [authFetch]);

  const loadRevisions = useCallback(
    async (docId: string) => {
      if (!authFetch) return;
      const res = await authFetch(`/workspace/docs/${docId}/revisions?limit=60`);
      if (!res.ok) return;
      const j = await res.json();
      setRevisions((j?.revisions ?? []) as RevisionItem[]);
    },
    [authFetch]
  );

  const loadLockState = useCallback(
    async (docId: string) => {
      if (!authFetch) return;
      const res = await authFetch(`/workspace/docs/${docId}/lock`);
      if (!res.ok) return;
      const j = await res.json();
      setLocked(Boolean(j?.lock?.is_locked));
    },
    [authFetch]
  );

  const loadCalendarNotes = useCallback(
    async (docId: string, month: string) => {
      if (!authFetch) return;
      const res = await authFetch(`/workspace/docs/${docId}/calendar-notes?month=${encodeURIComponent(month)}`);
      if (!res.ok) return;
      const j = await res.json();
      setCalendarNotes((j?.notes ?? []) as CalendarNote[]);
    },
    [authFetch]
  );

  const loadLatestSnapshot = useCallback(
    async (docId: string) => {
      if (!authFetch) return;
      const res = await authFetch(`/workspace/docs/${docId}/snapshot/latest`);
      if (!res.ok) return;
      const j = await res.json();
      const textUtf8 = String(j?.snapshot?.textUtf8 ?? "").trim();
      const version = Number(j?.snapshot?.version ?? 0);
      const content = textUtf8.length > 0 ? textUtf8 : INITIAL_TEMPLATE;
      versionRef.current = Number.isFinite(version) ? version : 0;
      setMarkdown(content);
      lastTextRef.current = content;
      patchQueueRef.current = [];
      opCountRef.current = 0;
    },
    [authFetch]
  );

  const createDoc = useCallback(async () => {
    if (!authFetch) return;
    const res = await authFetch("/workspace/docs", {
      method: "POST",
      body: JSON.stringify({ title: "새 문서" }),
    });
    if (!res.ok) return;
    const j = await res.json();
    const doc = j?.doc as WorkspaceDoc | undefined;
    if (!doc?.id) return;
    await loadDocs();
    setActiveDocId(doc.id);
    showToast("페이지 생성 완료", "ok");
  }, [authFetch, loadDocs, showToast]);

  const closeSocket = useCallback(() => {
    if (heartbeatRef.current) {
      window.clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
    wsRef.current?.close();
    wsRef.current = null;
  }, []);

  const flushPatchQueue = useCallback(
    (opts?: { forceSnapshot?: boolean }) => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) return;
      if (patchQueueRef.current.length === 0) return;
      const forceSnapshot = Boolean(opts?.forceSnapshot);
      const shouldAttachSnapshot = forceSnapshot || opCountRef.current % 12 === 0;
      const op: Record<string, unknown> = {
        kind: "text_patch",
        baseVersion: versionRef.current,
        patches: patchQueueRef.current.splice(0),
        stateHash: `len:${markdown.length}`,
      };
      if (shouldAttachSnapshot) op.ydocStateBase64 = utf8ToBase64(markdown);
      ws.send(JSON.stringify({ type: "doc_op", op }));
      opCountRef.current += 1;
    },
    [markdown]
  );

  const connectDocSocket = useCallback(
    async (docId: string) => {
      if (!authFetch) return;
      closeSocket();
      setConnecting(true);
      setPresence([]);
      const tokenRes = await authFetch(`/workspace/docs/${docId}/ws-token`, {
        method: "POST",
        body: JSON.stringify({ ttlMs: 180000 }),
      });
      if (!tokenRes.ok) {
        setConnecting(false);
        return;
      }
      const tokenJson = await tokenRes.json();
      const wsUrlPath = String(tokenJson?.wsUrl ?? "");
      if (!wsUrlPath) {
        setConnecting(false);
        return;
      }
      const ws = new WebSocket(`${toWsAbsoluteUrl(wsUrlPath)}&clientId=${encodeURIComponent(clientIdRef.current)}`);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnecting(false);
        ws.send(JSON.stringify({ type: "heartbeat" }));
        heartbeatRef.current = window.setInterval(() => {
          ws.send(JSON.stringify({ type: "heartbeat" }));
        }, 15000);
      };

      ws.onmessage = (ev) => {
        let msg: WsServerMessage | null = null;
        try {
          msg = JSON.parse(ev.data as string) as WsServerMessage;
        } catch {
          msg = null;
        }
        if (!msg) return;
        if (msg.type === "hello") {
          setCanWrite(Boolean(msg.canWrite));
          setRole(msg.role);
          return;
        }
        if (msg.type === "doc_ack") {
          if (Number.isFinite(msg.version)) versionRef.current = Math.max(versionRef.current, Math.floor(msg.version));
          void loadRevisions(docId);
          showToast("저장 완료", "ok");
          return;
        }
        if (msg.type === "error" && msg.code === "version_conflict") {
          if (activeDocId) {
            void loadLatestSnapshot(activeDocId);
            void loadRevisions(activeDocId);
          }
          showToast("충돌 감지: 최신 버전으로 동기화됨", "warn");
          return;
        }
        if (msg.type === "presence_snapshot") {
          setPresence(msg.presence ?? []);
          return;
        }
        if (msg.type === "cursor") {
          setPresence((prev) => {
            const next = prev.slice();
            const idx = next.findIndex((p) => p.clientId === msg.clientId);
            const patch: PresenceItem = {
              userId: msg.userId,
              clientId: msg.clientId,
              cursor: msg.cursor ?? null,
              updatedAt: msg.updatedAt,
            };
            if (idx >= 0) next[idx] = { ...next[idx], ...patch };
            else next.push(patch);
            return next;
          });
        }
      };

      ws.onclose = () => closeSocket();
      ws.onerror = () => closeSocket();
    },
    [authFetch, closeSocket, loadRevisions, showToast, activeDocId, loadLatestSnapshot]
  );

  useEffect(() => {
    void loadDocs();
  }, [loadDocs]);

  useEffect(() => {
    if (!activeDocId) return;
    void loadLatestSnapshot(activeDocId);
    void loadRevisions(activeDocId);
    void loadLockState(activeDocId);
    void connectDocSocket(activeDocId);

    // Update URL without triggering re-render loop
    const next = new URLSearchParams(window.location.search);
    next.set("docId", activeDocId);
    window.history.replaceState(null, "", `${pathname}?${next.toString()}`);
    return () => closeSocket();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDocId]);

  useEffect(() => {
    if (!activeDocId) return;
    void loadCalendarNotes(activeDocId, toMonthString(viewDate));
  }, [activeDocId, viewDate, loadCalendarNotes]);

  const sendCursor = useCallback(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: "cursor", cursor: getCursorFromTextArea(textareaRef.current) }));
  }, []);

  const onMarkdownChange = useCallback(
    (value: string) => {
      const prev = lastTextRef.current;
      setMarkdown(value);
      const patch = buildSingleReplacePatch(prev, value);
      lastTextRef.current = value;
      if (!patch) return;
      patchQueueRef.current.push(patch);
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = window.setTimeout(() => flushPatchQueue(), 450);
    },
    [flushPatchQueue]
  );

  const saveTitle = useCallback(
    async (docId: string, title: string) => {
      if (!authFetch) return;
      await authFetch(`/workspace/docs/${docId}`, {
        method: "PATCH",
        body: JSON.stringify({ title }),
      });
      showToast("제목 저장 완료", "ok");
    },
    [authFetch, showToast]
  );

  const onTitleChange = useCallback(
    (nextTitle: string) => {
      setTitleDraft(nextTitle);
      if (!activeDocId) return;
      setDocs((prev) => prev.map((d) => (d.id === activeDocId ? { ...d, title: nextTitle } : d)));
      if (titleSaveTimerRef.current) window.clearTimeout(titleSaveTimerRef.current);
      titleSaveTimerRef.current = window.setTimeout(() => {
        void saveTitle(activeDocId, nextTitle.trim() || "새 문서");
      }, 600);
    },
    [activeDocId, saveTitle]
  );

  const restoreRevision = useCallback(
    async (version: number) => {
      if (!activeDocId || !authFetch) return;
      const res = await authFetch(`/workspace/docs/${activeDocId}/snapshot/by-version/${Math.floor(version)}`);
      if (!res.ok) return;
      const j = await res.json();
      const content = String(j?.snapshot?.textUtf8 ?? "").trim() || INITIAL_TEMPLATE;
      setMarkdown(content);
      lastTextRef.current = content;
      patchQueueRef.current = [];
      opCountRef.current = 0;
      versionRef.current = Number(j?.snapshot?.version ?? versionRef.current);
      flushPatchQueue({ forceSnapshot: true });
      showToast(`v${version} 복원 완료`, "ok");
    },
    [activeDocId, authFetch, flushPatchQueue, showToast]
  );

  const saveCalendarNote = useCallback(async () => {
    if (!activeDocId || !authFetch) return;
    const res = await authFetch(`/workspace/docs/${activeDocId}/calendar-notes`, {
      method: "POST",
      body: JSON.stringify({ noteDate: selectedDate, memo: noteDraft }),
    });
    if (!res.ok) return;
    await loadCalendarNotes(activeDocId, toMonthString(viewDate));
    showToast("메모 저장 완료", "ok");
  }, [activeDocId, authFetch, selectedDate, noteDraft, loadCalendarNotes, viewDate, showToast]);

  const toggleLock = useCallback(async () => {
    if (!activeDocId || !authFetch) return;
    const res = await authFetch(`/workspace/docs/${activeDocId}/lock`, {
      method: "PATCH",
      body: JSON.stringify({ locked: !locked }),
    });
    if (!res.ok) return;
    const j = await res.json();
    setLocked(Boolean(j?.lock?.is_locked));
    showToast(locked ? "잠금 해제" : "페이지 잠금", "ok");
  }, [activeDocId, authFetch, locked, showToast]);

  const copyPage = useCallback(async () => {
    await navigator.clipboard.writeText(markdown);
    showToast("페이지 내용 복사 완료", "ok");
  }, [markdown, showToast]);

  const translatePage = useCallback(async () => {
    if (!authFetch) return;
    const res = await authFetch("/chat/translate", {
      method: "POST",
      body: JSON.stringify({ text: markdown, target: "ko" }),
    });
    if (!res.ok) return;
    const j = await res.json();
    setTranslatedText(String(j?.text ?? ""));
    setTranslateOpen(true);
  }, [authFetch, markdown]);

  const suggestions = useMemo(() => {
    return [
      "문단을 목적/근거/결론 구조로 정리해보세요.",
      "체크리스트 항목에 담당자/기한을 추가하면 추적이 쉬워집니다.",
      "회의 메모라면 결론 섹션을 맨 위로 올리는 게 좋습니다.",
    ];
  }, []);

  const searchInDocument = useCallback(() => {
    const q = searchQuery.trim();
    if (!q) return;
    const idx = markdown.toLowerCase().indexOf(q.toLowerCase());
    if (idx < 0) {
      showToast("검색 결과 없음", "warn");
      return;
    }
    const el = textareaRef.current;
    if (el) {
      el.focus();
      el.setSelectionRange(idx, idx + q.length);
      const line = markdown.slice(0, idx).split("\n").length;
      showToast(`${line}행으로 이동`, "ok");
    }
  }, [searchQuery, markdown, showToast]);

  const monthCells = useMemo(() => monthGrid(viewDate), [viewDate]);

  const readonly = !canWrite || locked;

  return (
    <div className="h-full min-h-0 w-full bg-[#f7f7f8] text-[#141414]">
      {toast && (
        <div className="pointer-events-none fixed left-1/2 top-20 z-[200] -translate-x-1/2">
          <div
            className={`rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-xl animate-[pop_0.24s_ease-out] ${
              toast.kind === "ok" ? "bg-[#111827]" : "bg-[#dc2626]"
            }`}
          >
            {toast.message}
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes pop {
          0% { transform: scale(0.92); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>

      <div
        className="grid h-full min-h-0"
        style={{
          gridTemplateColumns: `${leftCollapsed ? "64px" : "280px"} 1fr ${rightCollapsed ? "64px" : "360px"}`,
        }}
      >
        <aside className="border-r border-[#e6e8eb] bg-white p-3">
          <div className="mb-3 flex items-center justify-between gap-2">
            <button
              onClick={() => setLeftCollapsed((v) => !v)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#e5e7eb] hover:bg-[#f3f4f6]"
              title={leftCollapsed ? "문서목록 펼치기" : "문서목록 접기"}
            >
              {leftCollapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
            </button>
            {!leftCollapsed && (
              <>
                <div className="text-xs font-semibold tracking-[0.16em] text-[#6b7280]">DOCUMENTS</div>
                <button
                  onClick={createDoc}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#e5e7eb] hover:bg-[#f3f4f6]"
                  title="새 문서"
                >
                  <Plus size={14} />
                </button>
              </>
            )}
          </div>

          {!leftCollapsed && (
            <div className="mb-3 flex items-center gap-2 rounded-lg border border-[#e5e7eb] px-2">
              <Search size={14} className="text-[#6b7280]" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") searchInDocument();
                }}
                placeholder="키워드 검색"
                className="h-8 w-full border-0 text-sm outline-none"
              />
            </div>
          )}

          <div className="space-y-1 overflow-y-auto">
            {docs.map((d) => {
              const active = d.id === activeDocId;
              return (
                <button
                  key={d.id}
                  onClick={() => setActiveDocId(d.id)}
                  className={[
                    "w-full rounded-lg border text-left transition",
                    active
                      ? "border-[#111827] bg-[#f9fafb]"
                      : "border-transparent hover:border-[#e5e7eb] hover:bg-[#f9fafb]",
                    leftCollapsed ? "px-2 py-2 text-center" : "px-3 py-2",
                  ].join(" ")}
                >
                  {leftCollapsed ? (
                    <div className="mx-auto inline-flex h-7 w-7 items-center justify-center rounded-md bg-[#eef2f7] text-xs font-semibold">
                      {d.title.slice(0, 1)}
                    </div>
                  ) : (
                    <>
                      <div className="truncate text-sm font-semibold">{d.title}</div>
                      <div className="mt-1 text-xs text-[#6b7280]">{new Date(d.updated_at).toLocaleString("ko-KR")}</div>
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </aside>

        <section className="flex min-h-0 flex-col border-r border-[#e6e8eb] bg-white">
          <div className="flex items-center justify-between border-b border-[#e6e8eb] px-4 py-3">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <FileText size={16} />
              <input
                value={titleDraft}
                onChange={(e) => onTitleChange(e.target.value)}
                readOnly={readonly}
                className="min-w-0 flex-1 rounded border border-transparent px-2 py-1 text-sm font-semibold outline-none focus:border-[#d1d5db]"
              />
            </div>
            <div className="text-xs text-[#6b7280]">{connecting ? "연결 중..." : "실시간 연결됨"}</div>
          </div>

          <div className="flex items-center gap-2 border-b border-[#e6e8eb] px-4 py-2 text-xs text-[#4b5563]">
            <span className="rounded bg-[#f3f4f6] px-2 py-1"># 제목</span>
            <span className="rounded bg-[#f3f4f6] px-2 py-1">## 소제목</span>
            <span className="rounded bg-[#f3f4f6] px-2 py-1">- 리스트</span>
            <span className="rounded bg-[#f3f4f6] px-2 py-1">`코드`</span>
            <span className="rounded bg-[#f3f4f6] px-2 py-1">```코드블록```</span>
            <button
              onClick={() => setShowCalendar((v) => !v)}
              className="ml-auto inline-flex items-center gap-1 rounded bg-[#eef2ff] px-2 py-1 text-[#4338ca]"
            >
              <Calendar size={12} />
              {showCalendar ? "달력 닫기" : "달력 만들기"}
            </button>
          </div>

          {showCalendar && (
            <div className="border-b border-[#e6e8eb] p-3">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
                    className="rounded border border-[#e5e7eb] px-2 py-1 text-xs"
                  >
                    이전
                  </button>
                  <div className="text-sm font-semibold">{viewDate.getFullYear()}년 {viewDate.getMonth() + 1}월</div>
                  <button
                    onClick={() => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
                    className="rounded border border-[#e5e7eb] px-2 py-1 text-xs"
                  >
                    다음
                  </button>
                </div>
                <select
                  value={calendarMode}
                  onChange={(e) => setCalendarMode(e.target.value as "month" | "year")}
                  className="rounded border border-[#e5e7eb] px-2 py-1 text-xs"
                >
                  <option value="month">월별</option>
                  <option value="year">년별</option>
                </select>
              </div>

              {calendarMode === "month" ? (
                <div className="grid grid-cols-7 gap-1 text-xs">
                  {monthCells.map((cell, idx) => {
                    if (!cell) return <div key={`empty-${idx}`} className="h-14 rounded bg-[#f8fafc]" />;
                    const dStr = toDateString(cell);
                    const hasNote = calendarNotes.some((n) => n.note_date === dStr);
                    return (
                      <button
                        key={dStr}
                        onClick={() => {
                          setSelectedDate(dStr);
                          const hit = calendarNotes.find((n) => n.note_date === dStr);
                          setNoteDraft(hit?.memo ?? "");
                        }}
                        className={`h-14 rounded border p-1 text-left ${dStr === selectedDate ? "border-[#111827]" : "border-[#e5e7eb]"}`}
                      >
                        <div className="flex items-center justify-between">
                          <span>{cell.getDate()}</span>
                          <span className="text-[10px]">+</span>
                        </div>
                        {hasNote && <div className="mt-1 truncate text-[10px] text-[#4b5563]">메모 있음</div>}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2 text-xs">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setViewDate(new Date(viewDate.getFullYear(), i, 1))}
                      className="rounded border border-[#e5e7eb] p-2 text-left"
                    >
                      {i + 1}월
                    </button>
                  ))}
                </div>
              )}

              <div className="mt-2 rounded border border-[#e5e7eb] p-2">
                <div className="mb-1 text-xs font-semibold">{selectedDate} 메모</div>
                <textarea
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  className="h-20 w-full resize-none rounded border border-[#e5e7eb] p-2 text-xs outline-none"
                />
                <div className="mt-2 flex justify-end">
                  <button
                    onClick={saveCalendarNote}
                    className="rounded bg-[#111827] px-3 py-1 text-xs font-semibold text-white"
                  >
                    저장
                  </button>
                </div>
              </div>
            </div>
          )}

          <textarea
            ref={textareaRef}
            value={markdown}
            onChange={(e) => onMarkdownChange(e.target.value)}
            onKeyUp={sendCursor}
            onClick={sendCursor}
            readOnly={readonly}
            className="h-full min-h-0 w-full resize-none p-4 text-[14px] leading-6 outline-none"
            placeholder="팀 문서를 작성하세요..."
          />

          {translateOpen && (
            <div className="border-t border-[#e6e8eb] bg-[#fafafa] p-3">
              <div className="mb-1 text-xs font-semibold text-[#6b7280]">번역 결과</div>
              <div className="max-h-40 overflow-y-auto whitespace-pre-wrap rounded border border-[#e5e7eb] bg-white p-2 text-xs">
                {translatedText || "(번역 결과 없음)"}
              </div>
            </div>
          )}
        </section>

        <aside className="flex min-h-0 flex-col border-l border-[#e6e8eb] bg-white">
          <div className="flex items-center justify-end border-b border-[#e6e8eb] px-3 py-2">
            <button
              onClick={() => setRightCollapsed((v) => !v)}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[#e5e7eb] hover:bg-[#f3f4f6]"
              title={rightCollapsed ? "패널 펼치기" : "패널 접기"}
            >
              {rightCollapsed ? <PanelRightOpen size={14} /> : <PanelRightClose size={14} />}
            </button>
          </div>

          {!rightCollapsed && (
            <>
              <div className="border-b border-[#e6e8eb] p-3">
                <div className="mb-2 grid grid-cols-2 gap-2">
                  <button onClick={createDoc} className="rounded-lg border border-[#e5e7eb] p-2 text-xs text-left hover:bg-[#f9fafb]">새로 만들기</button>
                  <button onClick={() => setShowCalendar(true)} className="rounded-lg border border-[#e5e7eb] p-2 text-xs text-left hover:bg-[#f9fafb]">달력 만들기</button>
                  <button onClick={copyPage} className="inline-flex items-center gap-1 rounded-lg border border-[#e5e7eb] p-2 text-xs hover:bg-[#f9fafb]"><Copy size={12} />내용 복사</button>
                  <button onClick={toggleLock} className="inline-flex items-center gap-1 rounded-lg border border-[#e5e7eb] p-2 text-xs hover:bg-[#f9fafb]">{locked ? <Unlock size={12} /> : <Lock size={12} />}{locked ? "잠금해제" : "잠금"}</button>
                  <button onClick={translatePage} className="inline-flex items-center gap-1 rounded-lg border border-[#e5e7eb] p-2 text-xs hover:bg-[#f9fafb]"><Languages size={12} />번역</button>
                  <button onClick={() => showToast("편집 제안 생성", "ok")} className="inline-flex items-center gap-1 rounded-lg border border-[#e5e7eb] p-2 text-xs hover:bg-[#f9fafb]"><Sparkles size={12} />편집 제안</button>
                </div>
              </div>

              <div className="border-b border-[#e6e8eb] px-4 py-3">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold"><Users size={14} />참여자</div>
                <div className="space-y-1 text-xs">
                  <div className="inline-flex items-center gap-1 rounded-full bg-[#f3f4f6] px-2 py-1"><Globe size={12} />role: {role}</div>
                  <div className="inline-flex items-center gap-1 rounded-full bg-[#f3f4f6] px-2 py-1">{readonly ? <Eye size={12} /> : <PencilLine size={12} />}{readonly ? "읽기 전용" : "편집 가능"}</div>
                </div>
                <div className="mt-2 max-h-[130px] space-y-1 overflow-y-auto text-xs">
                  {presence.map((p) => (
                    <div key={p.clientId} className="rounded-md border border-[#e5e7eb] px-2 py-1">
                      <div className="font-medium">{p.displayName || `user:${p.userId}`}</div>
                      <div className="text-[#6b7280]">cursor: {p.cursor ? `${p.cursor.anchor}-${p.cursor.head}` : "idle"}</div>
                    </div>
                  ))}
                  {presence.length === 0 && <div className="text-[#9ca3af]">참여자 없음</div>}
                </div>
              </div>

              <div className="border-b border-[#e6e8eb] px-4 py-3">
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-[#6b7280]"><History size={12} />REVISION HISTORY</div>
                <div className="max-h-[170px] space-y-1 overflow-y-auto text-xs">
                  {revisions.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => {
                        if (r.has_snapshot) void restoreRevision(r.version);
                      }}
                      className={`w-full rounded-md border border-[#e5e7eb] px-2 py-1 text-left ${r.has_snapshot ? "hover:bg-[#f9fafb]" : "opacity-70"}`}
                    >
                      <div className="font-medium">v{r.version} · user:{r.editor_user_id}</div>
                      <div className="truncate text-[#6b7280]">{r.summary}</div>
                      <div className="text-[#9ca3af]">{new Date(r.created_at).toLocaleString("ko-KR")}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
                <div className="mb-2 text-xs font-semibold text-[#6b7280]">MARKDOWN PREVIEW</div>
                <article className="prose prose-sm max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
                </article>
              </div>

              <div className="border-t border-[#e6e8eb] p-3">
                <div className="mb-1 text-xs font-semibold text-[#6b7280]">편집 제안</div>
                <ul className="space-y-1 text-xs text-[#4b5563]">
                  <li>• 목적/근거/결론 구조로 정리</li>
                  <li>• 담당자/기한 메타 추가</li>
                  <li>• 결론 섹션 상단 배치</li>
                </ul>
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
