"use client";

import { useEffect, useMemo, useState } from "react";
import { useChatStore } from "@/store/useChatStore";
import { useAuth } from "@/contexts/AuthContext";
import {
  Plus,
  MessageSquare,
  Trash2,
  Pencil,
  Pin,
  Search,
} from "lucide-react";
import clsx from "clsx";

export default function ChatSidebar() {
  const { status } = useAuth();

  const {
    threads,
    currentThreadId,
    newThread,
    switchThread,
    deleteThread,
    renameThread,
    loadThreads,
    threadsLoaded,
  } = useChatStore((s) => ({
    threads: s.threads,
    currentThreadId: s.currentThreadId,
    newThread: s.newThread,
    switchThread: s.switchThread,
    deleteThread: s.deleteThread,
    renameThread: s.renameThread,
    loadThreads: s.loadThreads,
    threadsLoaded: s.threadsLoaded,
  }));

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [query, setQuery] = useState("");

  /* --------------------------------------------------
   * 최초 1회 thread 목록 로드
   * -------------------------------------------------- */
  useEffect(() => {
    if (status === "authed" && !threadsLoaded) {
      loadThreads();
    }
  }, [status, threadsLoaded, loadThreads]);

  /* --------------------------------------------------
   * 새 채팅 생성
   * -------------------------------------------------- */
  const createChat = async () => {
    if (status !== "authed") return;

    const id = await newThread("New Chat");
    if (!id) return;

    // newThread 내부에서 currentThreadId 세팅됨
  };

  /* --------------------------------------------------
   * 검색 + pinned 정렬
   * -------------------------------------------------- */
  const filteredThreads = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? threads.filter((t) => t.title.toLowerCase().includes(q))
      : threads;

    const pinned = list.filter((t) => t.pinned);
    const normal = list.filter((t) => !t.pinned);

    return [...pinned, ...normal];
  }, [threads, query]);

  /* --------------------------------------------------
   * Render
   * -------------------------------------------------- */
  return (
    <aside className="w-[260px] h-full bg-[rgba(255,255,255,0.55)] backdrop-blur-2xl border-r border-black/10 p-4 flex flex-col gap-4">
      {/* New Chat */}
      <button
        onClick={createChat}
        disabled={status !== "authed"}
        className="flex items-center gap-2 px-3 py-2 bg-black text-white text-sm shadow hover:bg-black/80 disabled:opacity-40"
      >
        <Plus size={16} /> New Chat
      </button>

      {/* Search */}
      <div className="flex items-center gap-2 px-3 py-2 border border-black/10 bg-white/70">
        <Search size={14} className="opacity-60" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search"
          className="flex-1 bg-transparent outline-none text-sm"
        />
      </div>

      {/* Thread List */}
      <div className="flex flex-col gap-2 overflow-y-auto flex-1">
        {filteredThreads.length === 0 && (
          <div className="text-xs text-black/40">대화가 없습니다.</div>
        )}

        {filteredThreads.map((t) => {
          const active = t.id === currentThreadId;

          return (
            <div
              key={t.id}
              className={clsx(
                "group flex items-center p-3 border text-sm font-semibold",
                active
                  ? "bg-black text-white border-black"
                  : "bg-white border-black/20 hover:bg-gray-50"
              )}
            >
              {editingId === t.id ? (
                <input
                  autoFocus
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={() => {
                    renameThread(t.id, editValue || "Untitled");
                    setEditingId(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      renameThread(t.id, editValue || "Untitled");
                      setEditingId(null);
                    }
                  }}
                  className="flex-1 bg-transparent outline-none"
                />
              ) : (
                <button
                  onClick={() => switchThread(t.id)}
                  className="flex items-center gap-2 flex-1 text-left truncate"
                >
                  <MessageSquare size={14} />
                  <span className="truncate font-semibold tracking-tight">
                    {t.title}
                  </span>
                </button>
              )}

              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="p-1">
                  <Pin size={14} />
                </button>
                <button
                  onClick={() => {
                    setEditingId(t.id);
                    setEditValue(t.title);
                  }}
                  className="p-1"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => deleteThread(t.id)}
                  className="p-1 text-red-500"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
