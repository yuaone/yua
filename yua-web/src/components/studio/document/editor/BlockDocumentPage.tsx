"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  FileText,
  Plus,
  Users,
  Eye,
  PencilLine,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Lock,
  Unlock,
  History,
  Globe,
  Home,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import * as Y from "yjs";
import BlockEditor from "./BlockEditor";
import DocChatPanel from "./DocChatPanel";
import { YjsProvider } from "./collaboration/YjsProvider";

type WorkspaceDoc = {
  id: string;
  title: string;
  content_type?: string;
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

type PresenceItem = {
  userId: number;
  clientId: string;
  displayName?: string | null;
  color?: string | null;
  cursor?: { anchor: number; head: number } | null;
  updatedAt: number;
};

function toWsAbsoluteUrl(path: string): string {
  const apiBase =
    process.env.NEXT_PUBLIC_API_BASE_URL || window.location.origin;
  const parsed = new URL(apiBase, window.location.origin);
  const origin = parsed.origin.replace(/^http/i, "ws");
  return `${origin}${path}`;
}

export default function BlockDocumentPage() {
  const { authFetch, profile } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const docIdFromUrl = searchParams.get("docId");

  const [docs, setDocs] = useState<WorkspaceDoc[]>([]);
  const [revisions, setRevisions] = useState<RevisionItem[]>([]);
  const [activeDocId, setActiveDocId] = useState<string | null>(docIdFromUrl);
  const [titleDraft, setTitleDraft] = useState("문서");
  const [presence, setPresence] = useState<PresenceItem[]>([]);
  const [canWrite, setCanWrite] = useState(true);
  const [role, setRole] = useState("member");
  const [connecting, setConnecting] = useState(false);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [locked, setLocked] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [toast, setToast] = useState<{
    message: string;
    kind: "ok" | "warn";
  } | null>(null);

  // Editor content state
  const [initialContent, setInitialContent] = useState<string>("");
  const [collabConfig, setCollabConfig] = useState<{
    ydoc: Y.Doc;
    field: string;
    user: { name: string; color: string };
  } | null>(null);
  const editorRef = useRef<import("@tiptap/react").Editor | null>(null);
  const latestJsonRef = useRef<Record<string, unknown> | null>(null);
  const latestHtmlRef = useRef<string>("");
  const saveTimerRef = useRef<number | null>(null);
  const titleSaveTimerRef = useRef<number | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const yjsProviderRef = useRef<YjsProvider | null>(null);
  const ydocRef = useRef<Y.Doc | null>(null);
  const clientIdRef = useRef(`web-${Math.random().toString(36).slice(2)}`);
  const heartbeatRef = useRef<number | null>(null);

  const selectedDoc = useMemo(
    () => docs.find((d) => d.id === activeDocId) ?? null,
    [docs, activeDocId]
  );

  const readonly = !canWrite || locked;

  const showToast = useCallback(
    (message: string, kind: "ok" | "warn" = "ok") => {
      setToast({ message, kind });
      window.setTimeout(() => setToast(null), 1200);
    },
    []
  );

  useEffect(() => {
    setTitleDraft(selectedDoc?.title ?? "문서");
  }, [selectedDoc?.id, selectedDoc?.title]);

  /* ── Doc list ── */
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
      const res = await authFetch(
        `/workspace/docs/${docId}/revisions?limit=60`
      );
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

  const loadDocContent = useCallback(
    async (docId: string) => {
      if (!authFetch) return;
      // First try loading from content_json (blocks mode)
      const docRes = await authFetch(`/workspace/docs/${docId}`);
      if (!docRes.ok) return;
      const docJson = await docRes.json();
      const doc = docJson?.doc;

      if (doc?.content_type === "blocks" && doc?.content_json) {
        setInitialContent(JSON.stringify(doc.content_json));
        return;
      }

      // Fallback: load from snapshot (markdown mode)
      const res = await authFetch(`/workspace/docs/${docId}/snapshot/latest`);
      if (!res.ok) return;
      const j = await res.json();
      const textUtf8 = String(j?.snapshot?.textUtf8 ?? "").trim();
      setInitialContent(
        textUtf8.length > 0
          ? `<p>${textUtf8.replace(/\n/g, "</p><p>")}</p>`
          : ""
      );
    },
    [authFetch]
  );

  const createDoc = useCallback(async () => {
    if (!authFetch) return;
    const res = await authFetch("/workspace/docs", {
      method: "POST",
      body: JSON.stringify({ title: "새 문서", content_type: "blocks" }),
    });
    if (!res.ok) return;
    const j = await res.json();
    const doc = j?.doc as WorkspaceDoc | undefined;
    if (!doc?.id) return;
    await loadDocs();
    setActiveDocId(doc.id);
    showToast("페이지 생성 완료", "ok");
  }, [authFetch, loadDocs, showToast]);

  /* ── WebSocket ── */
  const closeSocket = useCallback(() => {
    if (heartbeatRef.current) {
      window.clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
    yjsProviderRef.current?.destroy();
    yjsProviderRef.current = null;
    if (ydocRef.current) {
      ydocRef.current.destroy();
      ydocRef.current = null;
    }
    setCollabConfig(null);
    wsRef.current?.close();
    wsRef.current = null;
  }, []);

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
      const ws = new WebSocket(
        `${toWsAbsoluteUrl(wsUrlPath)}&clientId=${encodeURIComponent(clientIdRef.current)}`
      );
      wsRef.current = ws;

      ws.onopen = () => {
        setConnecting(false);
        ws.send(JSON.stringify({ type: "heartbeat" }));
        heartbeatRef.current = window.setInterval(() => {
          ws.send(JSON.stringify({ type: "heartbeat" }));
        }, 15000);

        // Set up Y.js collaboration
        const ydoc = new Y.Doc();
        ydocRef.current = ydoc;

        const fullWsUrl = `${toWsAbsoluteUrl(wsUrlPath)}&clientId=${encodeURIComponent(clientIdRef.current)}`;
        const provider = new YjsProvider(fullWsUrl, ydoc);
        yjsProviderRef.current = provider;

        const colors = ["#f87171", "#60a5fa", "#34d399", "#fbbf24", "#a78bfa", "#fb923c"];
        const userColor = colors[Math.floor(Math.random() * colors.length)];

        setCollabConfig({
          ydoc,
          field: "default",
          user: {
            name: profile?.user?.name || profile?.user?.email || "Anonymous",
            color: userColor,
          },
        });
      };

      ws.onmessage = (ev) => {
        let msg: any = null;
        try {
          msg = JSON.parse(ev.data as string);
        } catch {
          return;
        }
        if (!msg) return;

        if (msg.type === "hello") {
          setCanWrite(Boolean(msg.canWrite));
          setRole(msg.role);
        } else if (msg.type === "presence_snapshot") {
          setPresence(msg.presence ?? []);
        } else if (msg.type === "cursor") {
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
        } else if (msg.type === "doc_ack") {
          void loadRevisions(docId);
          showToast("저장 완료", "ok");
        } else if (msg.type === "error" && msg.code === "version_conflict") {
          void loadDocContent(docId);
          void loadRevisions(docId);
          showToast("충돌 감지: 최신 버전으로 동기화됨", "warn");
        }
      };

      ws.onclose = () => closeSocket();
      ws.onerror = () => closeSocket();
    },
    [authFetch, closeSocket, loadRevisions, showToast, loadDocContent]
  );

  /* ── Init ── */
  useEffect(() => {
    void loadDocs();
  }, [loadDocs]);

  useEffect(() => {
    if (!activeDocId) return;
    void loadDocContent(activeDocId);
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

  /* ── Auto-save (debounced) ── */
  const handleEditorUpdate = useCallback(
    (json: Record<string, unknown>, html: string) => {
      latestJsonRef.current = json;
      latestHtmlRef.current = html;

      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = window.setTimeout(async () => {
        if (!activeDocId || !authFetch) return;
        await authFetch(`/workspace/docs/${activeDocId}/content`, {
          method: "PUT",
          body: JSON.stringify({
            content_type: "blocks",
            content_json: json,
            content_html: html,
          }),
        });
      }, 1500);
    },
    [activeDocId, authFetch]
  );

  /* ── Title save ── */
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
      setDocs((prev) =>
        prev.map((d) =>
          d.id === activeDocId ? { ...d, title: nextTitle } : d
        )
      );
      if (titleSaveTimerRef.current)
        window.clearTimeout(titleSaveTimerRef.current);
      titleSaveTimerRef.current = window.setTimeout(() => {
        void saveTitle(activeDocId, nextTitle.trim() || "새 문서");
      }, 600);
    },
    [activeDocId, saveTitle]
  );

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

  return (
    <div className="h-full min-h-0 w-full bg-white dark:bg-[#1b1b1b] text-[#141414] dark:text-[var(--text-primary)]">
      {/* Toast */}
      {toast && (
        <div className="pointer-events-none fixed left-1/2 top-20 z-[200] -translate-x-1/2">
          <div
            className={`rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-xl ${
              toast.kind === "ok" ? "bg-[#111827]" : "bg-[#dc2626]"
            }`}
          >
            {toast.message}
          </div>
        </div>
      )}

      <div
        className={`grid h-full min-h-0 max-md:grid-cols-1 ${
          leftCollapsed
            ? "md:grid-cols-[64px_1fr]"
            : "md:grid-cols-[280px_1fr]"
        }`}
      >
        {/* ── Left: Document list ── */}
        <aside className="border-r border-[#e6e8eb] dark:border-[var(--line)] bg-white dark:bg-[#1b1b1b] flex flex-col max-md:hidden">
          {/* YUA Home */}
          <div className={`sticky top-0 z-20 border-b border-[#e6e8eb] dark:border-[var(--line)] ${leftCollapsed ? "px-2 py-3" : "px-4 py-3"}`}>
            <div className="flex items-center justify-between">
              {leftCollapsed ? (
                <Link
                  href="/chat"
                  className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg hover:bg-[#f3f4f6] dark:hover:bg-white/5 transition"
                  title="홈으로"
                >
                  <Home size={18} />
                </Link>
              ) : (
                <>
                  <Link
                    href="/chat"
                    className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-[#f3f4f6] dark:hover:bg-white/5 transition active:scale-[0.96]"
                  >
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#f9fafb] dark:bg-white/10 border border-[#e5e7eb] dark:border-[var(--line)]">
                      <Home size={16} />
                    </span>
                    <span className="font-semibold tracking-tight text-[15px]">
                      YUA
                    </span>
                  </Link>
                  <button
                    onClick={() => setLeftCollapsed((v) => !v)}
                    className="flex items-center justify-center h-8 w-8 rounded-md hover:bg-[#f3f4f6] dark:hover:bg-white/5 transition"
                  >
                    <PanelLeftClose size={16} />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Document list header */}
          <div className="p-3 flex-1 min-h-0 flex flex-col">
          <div className="mb-3 flex items-center justify-between gap-2">
            {leftCollapsed ? (
              <button
                onClick={() => setLeftCollapsed((v) => !v)}
                className="mx-auto inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#e5e7eb] dark:border-[var(--line)] hover:bg-[#f3f4f6] dark:hover:bg-white/5"
              >
                <PanelLeftOpen size={14} />
              </button>
            ) : (
              <>
                <div className="text-xs font-semibold tracking-[0.16em] text-[#6b7280]">
                  DOCUMENTS
                </div>
                <button
                  onClick={createDoc}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#e5e7eb] dark:border-[var(--line)] hover:bg-[#f3f4f6] dark:hover:bg-white/5"
                  title="새 문서"
                >
                  <Plus size={14} />
                </button>
              </>
            )}
          </div>

          {!leftCollapsed && (
            <div className="mb-3 flex items-center gap-2 rounded-lg border border-[#e5e7eb] dark:border-[var(--line)] px-2">
              <Search size={14} className="text-[#6b7280]" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="문서 검색"
                className="h-8 w-full border-0 bg-transparent text-sm outline-none"
              />
            </div>
          )}

          <div className="space-y-1 flex-1 min-h-0 overflow-y-auto">
            {docs
              .filter(
                (d) =>
                  !searchQuery ||
                  d.title
                    .toLowerCase()
                    .includes(searchQuery.toLowerCase())
              )
              .map((d) => {
                const active = d.id === activeDocId;
                return (
                  <button
                    key={d.id}
                    onClick={() => setActiveDocId(d.id)}
                    className={[
                      "w-full rounded-lg border text-left transition",
                      active
                        ? "border-[#111827] dark:border-[var(--line)] bg-[#f9fafb] dark:bg-white/5"
                        : "border-transparent hover:border-[#e5e7eb] dark:hover:border-[var(--line)] hover:bg-[#f9fafb] dark:hover:bg-white/5",
                      leftCollapsed
                        ? "px-2 py-2 text-center"
                        : "px-3 py-2",
                    ].join(" ")}
                  >
                    {leftCollapsed ? (
                      <div className="mx-auto inline-flex h-7 w-7 items-center justify-center rounded-md bg-[#eef2f7] dark:bg-white/10 text-xs font-semibold">
                        {d.title.slice(0, 1)}
                      </div>
                    ) : (
                      <>
                        <div className="truncate text-sm font-semibold">
                          {d.title}
                        </div>
                        <div className="mt-1 text-xs text-[#6b7280]">
                          {new Date(d.updated_at).toLocaleString("ko-KR")}
                        </div>
                      </>
                    )}
                  </button>
                );
              })}
          </div>
          </div>
        </aside>

        {/* ── Center: Editor ── */}
        <section className="flex min-h-0 flex-col">
          {/* Header bar */}
          <div className="flex items-center justify-between border-b border-[#e6e8eb] dark:border-[var(--line)] px-4 py-3 max-md:px-3">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <FileText size={16} className="flex-shrink-0" />
              <input
                value={titleDraft}
                onChange={(e) => onTitleChange(e.target.value)}
                readOnly={readonly}
                className="min-w-0 flex-1 rounded border border-transparent bg-transparent px-2 py-1 text-base font-semibold outline-none focus:border-[#d1d5db] dark:focus:border-[var(--line)]"
                placeholder="제목 없음"
              />
            </div>

            <div className="flex items-center gap-3">
              {/* Presence dots */}
              <div className="flex -space-x-1.5">
                {presence.slice(0, 5).map((p) => (
                  <div
                    key={p.clientId}
                    className="h-6 w-6 rounded-full bg-blue-500 border-2 border-white dark:border-[#1b1b1b] text-[10px] text-white flex items-center justify-center"
                    title={p.displayName || `user:${p.userId}`}
                  >
                    {(p.displayName || String(p.userId)).slice(0, 1)}
                  </div>
                ))}
                {presence.length > 5 && (
                  <div className="h-6 w-6 rounded-full bg-gray-300 border-2 border-white dark:border-[#1b1b1b] text-[10px] flex items-center justify-center">
                    +{presence.length - 5}
                  </div>
                )}
              </div>

              {/* Lock toggle */}
              <button
                onClick={toggleLock}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-[#f3f4f6] dark:hover:bg-white/5"
                title={locked ? "잠금 해제" : "잠금"}
              >
                {locked ? <Lock size={14} /> : <Unlock size={14} />}
              </button>

              {/* Status */}
              <div className="text-xs text-[#6b7280]">
                {connecting ? "연결 중..." : readonly ? "읽기 전용" : "편집 중"}
              </div>
            </div>
          </div>

          {/* Block editor area */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="mx-auto max-w-[800px] px-6 py-8 max-md:px-4 max-md:py-4">
              <BlockEditor
                content={initialContent}
                editable={!readonly}
                onUpdate={handleEditorUpdate}
                collaboration={collabConfig ?? undefined}
                authFetch={authFetch}
                docId={activeDocId}
                onEditorReady={(e) => { editorRef.current = e; }}
              />
            </div>
          </div>
        </section>
      </div>

      {/* DocChat AI Panel */}
      {activeDocId && authFetch && (
        <DocChatPanel
          docId={activeDocId}
          authFetch={authFetch}
          onCitationClick={(citation) => {
            const ed = editorRef.current;
            if (!ed) return;
            // Find block by order — scan top-level nodes
            const doc = ed.state.doc;
            let pos = 0;
            let targetPos = -1;
            doc.forEach((node, offset, idx) => {
              if (idx === citation.block_order && targetPos === -1) {
                targetPos = offset + 1;
              }
            });
            if (targetPos >= 0) {
              ed.commands.setTextSelection(targetPos);
              ed.commands.scrollIntoView();
            }
          }}
          onInsertBelow={(content) => {
            const ed = editorRef.current;
            if (!ed) return;
            // Insert at end of document
            const endPos = ed.state.doc.content.size;
            ed.chain()
              .insertContentAt(endPos, [
                { type: "paragraph" },
                { type: "paragraph", content: [{ type: "text", text: content }] },
              ])
              .focus()
              .scrollIntoView()
              .run();
          }}
        />
      )}
    </div>
  );
}
