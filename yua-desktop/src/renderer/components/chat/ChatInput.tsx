import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { flushSync } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Square, Send, X } from "lucide-react";
import { useThinkingProfile } from "@/hooks/useThinkingProfile";
import { useChatStore } from "@/stores/useChatStore";
import { useChatStream } from "@/hooks/useChatStream";
import { useChatSender } from "@/hooks/useChatSender";
import { useAuth } from "@/contexts/DesktopAuthContext";
import { useChatDraft } from "@/stores/useChatDraft";
import { useSidebarData } from "@/hooks/useSidebarData";
import ChatPlusButton from "@/components/chat/input/ChatPlusButton";
import ChatPlusMenu from "@/components/chat/input/ChatPlusMenu";
import { useChatPlusMenu } from "@/components/chat/input/useChatPlusMenu";
import type { AttachmentMeta } from "yua-shared/chat/attachment-types";
import type { ID } from "yua-shared/types/common";
import AttachmentPreview from "@/components/chat/AttachmentPreview";
import VoiceButton from "@/components/chat/voice/VoiceButton";
import VoiceRecordingBar from "@/components/chat/voice/VoiceRecordingBar";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { useUsageGuard } from "@/hooks/useUsageGuard";

/* =========================
   Types
========================= */
type ChatInputProps = {
  threadId: ID | number | null;
  disabled?: boolean;
  onSubmit?: (args: {
    content: string;
    attachments: AttachmentMeta[];
  }) => Promise<void>;
};

type Attachment = {
  id: string;
  file: File;
  kind: "image" | "file";
  previewUrl?: string;
  status: "idle" | "uploading" | "done" | "error";
};

type InputMode = "ask" | "analyze" | "write" | "idea";

const MODE_META: Record<InputMode, { hint: string }> = {
  ask: { hint: "궁금한 걸 바로 물어보세요" },
  analyze: { hint: "내용을 붙여넣고 분석 요청" },
  write: { hint: "문서를 작성해보세요" },
  idea: { hint: "아이디어를 빠르게 정리" },
};

/* =========================
   Component
========================= */
export default function ChatInput({
  threadId,
  disabled = false,
  onSubmit,
}: ChatInputProps) {
  const { authFetch } = useAuth();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const navigate = useNavigate();

  // Voice input
  const voiceUsedRef = useRef(false);
  const voice = useVoiceInput({
    authFetch,
    onTranscribed: (text) => {
      voiceUsedRef.current = true;
      setValue((prev) => (prev ? prev + " " + text : text));
      contentRef.current = contentRef.current
        ? contentRef.current + " " + text
        : text;
      setTimeout(() => textareaRef.current?.focus(), 50);
    },
    onError: (err) => {
      console.warn("[VOICE]", err);
    },
  });

  const resizeRaf = useRef<number | null>(null);

  // === 4000-line limit (performance-optimized) ===
  const LINE_LIMIT = 4000;
  const lineCountRef = useRef(0);
  const [lineExceeded, setLineExceeded] = useState(false);

  // === Large-input performance: track content in ref, debounce state sync ===
  const contentRef = useRef("");
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const composingRef = useRef(false); // IME composition tracking

  const { status } = useAuth();
  const { draft, setDraft, clearDraft } = useChatDraft();
  const { createNewThread, autoTitleThread } = useSidebarData();

  const [value, setValue] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>(
    {}
  );
  const [isTall, setIsTall] = useState(false);
  const { profile, enabled, enable, disable } = useThinkingProfile();
  const sendLockRef = useRef(false);
  const mountedRef = useRef(false);
  const [mode] = useState<InputMode>("ask");
  const [focused, setFocused] = useState(false);
  const [deepVariant, setDeepVariant] = useState<"STANDARD" | "EXPANDED">(
    "STANDARD"
  );

  const { open, toggle, close } = useChatPlusMenu();
  const { isLocked, cooldownRemaining, tier } = useUsageGuard();
  const addUserMessage = useChatStore((s) => s.addUserMessage);
  const streamState = useChatStore((s) => s.streamState);
  const isStreaming = streamState === "streaming";

  const chatStream = useChatStream();
  const { send } = useChatSender(chatStream.sendPrompt);
  const { stop } = chatStream;

  /* =========================
     threadId normalize
  ========================= */
  const threadIdNum = useMemo<number | null>(() => {
    if (!threadId) return null;
    const n = Number(threadId);
    return Number.isFinite(n) ? n : null;
  }, [threadId]);

  /* =========================
     Line count checker (perf-optimized)
  ========================= */
  const checkLineCount = useCallback((text: string) => {
    let count = 1;
    for (let i = 0; i < text.length; i++) {
      if (text.charCodeAt(i) === 10) count++;
    }
    lineCountRef.current = count;

    const exceeded = count > LINE_LIMIT;
    setLineExceeded((prev) => {
      if (prev !== exceeded) return exceeded;
      return prev;
    });
  }, []);

  /* =========================
     Draft restore
  ========================= */
  useEffect(() => {
    if (!draft) return;
    if (draft === value) return;
    setValue(draft);
    contentRef.current = draft;
    checkLineCount(draft);
    clearDraft();
    requestAnimationFrame(() => textareaRef.current?.focus());
  }, [draft, clearDraft, checkLineCount]);

  useEffect(() => {
    const handler = () => {
      const current = contentRef.current || value;
      if (current.trim()) {
        setDraft(current);
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [value, setDraft]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  /* =========================
     Optimized onChange (debounced state sync for large inputs)
  ========================= */
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const text = e.target.value;
      contentRef.current = text;

      // Always check line count immediately (cheap operation)
      checkLineCount(text);

      // Debounce state sync for large inputs to avoid re-render storms
      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current);
      }

      // Always sync immediately during IME composition (Korean/Japanese/Chinese)
      // to prevent React from getting out of sync with DOM
      if (composingRef.current || text.length < 5000) {
        setValue(text);
      } else {
        // For large inputs (not composing), debounce the state update
        syncTimerRef.current = setTimeout(() => {
          setValue(text);
        }, 150);
      }
    },
    [checkLineCount]
  );

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current);
      }
    };
  }, []);

  /* =========================
     Auto resize (GPT style)
  ========================= */
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;

    const MAX_HEIGHT = 280;

    if (resizeRaf.current) {
      cancelAnimationFrame(resizeRaf.current);
    }

    resizeRaf.current = requestAnimationFrame(() => {
      el.style.height = "auto";
      const next = Math.max(el.scrollHeight, 56);
      setIsTall(next > 72);

      if (next > MAX_HEIGHT) {
        el.style.height = MAX_HEIGHT + "px";
        el.style.overflowY = "auto";
      } else {
        el.style.height = next + "px";
        el.style.overflowY = "hidden";
      }
    });
  }, [value]);

  /* =========================
     Clipboard paste (image)
  ========================= */
  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const items = Array.from(e.clipboardData.items);
      const files: File[] = [];

      items.forEach((item) => {
        if (item.kind === "file") {
          const file = item.getAsFile();
          if (file) files.push(file);
        }
      });

      if (files.length > 0) {
        e.preventDefault();
        handleFiles(files as any);
      }
    },
    []
  );

  /* =========================
     Attachments
  ========================= */
  const handleFiles = useCallback((files: FileList | File[] | null) => {
    if (!files) return;
    const now = Date.now();

    const next: Attachment[] = Array.from(files).map((file, idx) => ({
      id: `${now}-${idx}-${Math.random().toString(16).slice(2)}`,
      file,
      kind:
        file.type.startsWith("image/") ||
        /\.(png|jpe?g|gif|webp|svg|bmp|ico)$/i.test(file.name)
          ? "image"
          : "file",
      previewUrl:
        file.type.startsWith("image/") ||
        /\.(png|jpe?g|gif|webp|svg|bmp|ico)$/i.test(file.name)
          ? URL.createObjectURL(file)
          : undefined,
      status: "idle",
    }));

    setAttachments((prev) => [...prev, ...next]);
  }, []);

  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => {
      const target = prev.find((a) => a.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((a) => a.id !== id);
    });
  }, []);

  const replaceAttachment = useCallback(
    (id: string, newFile: File, newPreviewUrl: string) => {
      setAttachments((prev) =>
        prev.map((a) => {
          if (a.id !== id) return a;
          if (a.previewUrl) URL.revokeObjectURL(a.previewUrl);
          return {
            ...a,
            file: newFile,
            previewUrl: newPreviewUrl,
            status: "idle" as const,
          };
        })
      );
    },
    []
  );

  /* =========================
     Desktop file dialog via IPC (enhancement)
  ========================= */
  const openDesktopFileDialog = useCallback(async () => {
    // Try desktop IPC first, fallback to standard file input
    if (
      typeof window !== "undefined" &&
      (window as any).yuaDesktop?.openFile
    ) {
      try {
        const result = await (window as any).yuaDesktop.openFile();
        if (result && result.files && result.files.length > 0) {
          handleFiles(result.files);
          return;
        }
      } catch {
        // fallback to standard input
      }
    }
    fileInputRef.current?.click();
  }, [handleFiles]);

  /* =========================
     Upload helper
  ========================= */
  async function uploadAttachment(file: File): Promise<AttachmentMeta> {
    const form = new FormData();
    form.append("file", file);

    const res = await authFetch("/api/chat/upload", {
      method: "POST",
      body: form,
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("[UPLOAD_FAILED]", text);
      throw new Error("UPLOAD_FAILED");
    }

    const data = await res.json();
    if (!data?.ok || !data.attachment) {
      throw new Error(data?.error ?? "UPLOAD_FAILED");
    }

    return data.attachment as AttachmentMeta;
  }

  /* =========================
     Upload (authFetch)
  ========================= */
  async function uploadAttachmentWithProgress(
    att: Attachment
  ): Promise<AttachmentMeta> {
    const form = new FormData();
    form.append("file", att.file);

    const res = await authFetch("/api/chat/upload", {
      method: "POST",
      body: form,
    });

    if (!res.ok) {
      throw new Error("UPLOAD_FAILED");
    }

    const json = await res.json();

    if (!json || json.ok !== true || !json.attachment) {
      console.error("[UPLOAD_INVALID_RESPONSE]", json);
      throw new Error("UPLOAD_INVALID_RESPONSE");
    }

    return json.attachment;
  }

  /* =========================
     Execute
  ========================= */
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);

  const execute = useCallback(async () => {
    console.log("[SEND_EXECUTE]", {
      sending,
      uploading,
      attachments: attachments.length,
    });

    // Block send if not mounted
    if (!mountedRef.current) {
      console.log("[BLOCK_SEND_NOT_MOUNTED]");
      return;
    }

    // Visibility guard
    if (
      typeof document !== "undefined" &&
      document.visibilityState !== "visible"
    ) {
      console.log("[BLOCK_SEND_NOT_VISIBLE]");
      return;
    }

    if (sendLockRef.current) {
      console.log("[SEND_EXECUTE_EARLY_RETURN] sendLockRef");
      return;
    }
    sendLockRef.current = true;

    if (isLocked) {
      console.log("[SEND_EXECUTE_EARLY_RETURN] usageLocked");
      sendLockRef.current = false;
      return;
    }

    if (status !== "authed" && threadIdNum != null) {
      console.log("[SEND_EXECUTE_EARLY_RETURN] status_not_authed", {
        status,
        threadIdNum,
      });
      sendLockRef.current = false;
      return;
    }

    if (streamState !== "idle") {
      console.log("[SEND_EXECUTE_EARLY_RETURN] stream_not_idle", {
        streamState,
      });
      sendLockRef.current = false;
      return;
    }

    // Flush any pending debounced content before checking
    const currentContent = contentRef.current || value;
    const trimmed = currentContent.trim();
    if (!trimmed && attachments.length === 0) {
      console.log("[SEND_EXECUTE_EARLY_RETURN] empty_input");
      sendLockRef.current = false;
      return;
    }

    // 4000-line limit guard
    if (lineCountRef.current > LINE_LIMIT) {
      console.log("[SEND_EXECUTE_EARLY_RETURN] line_limit_exceeded", {
        lines: lineCountRef.current,
      });
      sendLockRef.current = false;
      return;
    }

    try {
      if (disabled || uploading) {
        console.log("[SEND_EXECUTE_EARLY_RETURN] disabled_or_uploading", {
          disabled,
          uploading,
        });
        sendLockRef.current = false;
        return;
      }
      setSending(true);
      setUploading(true);

      // Mark attachments as uploading
      setAttachments((prev) =>
        prev.map((a) => ({ ...a, status: "uploading" }))
      );

      const metas: AttachmentMeta[] = await Promise.all(
        attachments.map((a) => uploadAttachmentWithProgress(a))
      );

      setUploading(false);

      setAttachments((prev) =>
        prev.map((a) => ({ ...a, status: "done" }))
      );

      if (metas.length !== attachments.length) return;
      if (metas.length === 0 && attachments.length > 0) {
        return;
      }

      if (threadIdNum == null && onSubmit) {
        await onSubmit({
          content: trimmed,
          attachments: metas,
        });
        return;
      }

      let activeThreadId: number | null = threadIdNum;

      // Home screen or /chat (no thread) -> create thread first
      if (!activeThreadId) {
        const id = await createNewThread();
        if (!id) {
          return;
        }
        activeThreadId = Number(id);
        // Navigate and save draft for next screen
        navigate(`/chat/${id}`);
        setDraft(trimmed);
        setAttachments([]);
        return;
      }

      // Type guard (useChatSender accepts number only)
      if (!Number.isFinite(activeThreadId)) {
        return;
      }

      // Dispatch submit event
      window.dispatchEvent(new Event("chat:user:submit"));

      const effectiveProfile =
        enabled && profile === "DEEP" ? "DEEP" : "NORMAL";

      send({
        threadId: activeThreadId,
        content: trimmed,
        attachments: metas,
        thinkingProfile: effectiveProfile,
        deepVariant:
          effectiveProfile === "DEEP" ? deepVariant : undefined,
        inputMethod: voiceUsedRef.current ? "voice" : "keyboard",
      });
      voiceUsedRef.current = false;
      console.log("[SEND_DISPATCHED]", {
        threadId: activeThreadId,
        attachments: metas.length,
      });
      clearDraft();

      // SSOT: DEEP is "this input only" -- revert after send
      if (effectiveProfile === "DEEP") {
        disable();
      }
      setDeepVariant("STANDARD");

      close();
      setValue("");
      contentRef.current = "";
      lineCountRef.current = 1;
      setLineExceeded(false);
      setAttachments([]);
    } finally {
      setSending(false);
      setUploading(false);
      sendLockRef.current = false;
    }
  }, [
    disabled,
    status,
    threadIdNum,
    streamState,
    value,
    attachments,
    addUserMessage,
    send,
    close,
    createNewThread,
    enabled,
    profile,
    deepVariant,
    disable,
    navigate,
    onSubmit,
    isLocked,
    sending,
    uploading,
    clearDraft,
    setDraft,
  ]);

  /* =========================
     Key repeat (Electron frameless window fix)
     Mimics OS key repeat: initial delay → fast repeat
  ========================= */
  const repeatTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const repeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const heldKeyRef = useRef<string | null>(null);

  const doDelete = useCallback((key: "Backspace" | "Delete" = "Backspace") => {
    const el = textareaRef.current;
    if (!el || document.activeElement !== el) return;
    if (composingRef.current) return;

    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const val = el.value;

    let next: string;
    let cursor: number;

    if (start !== end) {
      next = val.slice(0, start) + val.slice(end);
      cursor = start;
    } else if (key === "Backspace" && start > 0) {
      // Unicode-safe: walk back over full grapheme (surrogate pairs, ZWJ sequences)
      let deleteStart = start - 1;
      // If we're at the low surrogate of a surrogate pair, step back one more
      if (
        deleteStart > 0 &&
        val.charCodeAt(deleteStart) >= 0xdc00 &&
        val.charCodeAt(deleteStart) <= 0xdfff &&
        val.charCodeAt(deleteStart - 1) >= 0xd800 &&
        val.charCodeAt(deleteStart - 1) <= 0xdbff
      ) {
        deleteStart--;
      }
      next = val.slice(0, deleteStart) + val.slice(start);
      cursor = deleteStart;
    } else if (key === "Delete" && end < val.length) {
      // Unicode-safe: walk forward over full grapheme (surrogate pairs)
      let deleteEnd = start + 1;
      // If we're at the high surrogate, step forward one more to include the low surrogate
      if (
        deleteEnd < val.length &&
        val.charCodeAt(start) >= 0xd800 &&
        val.charCodeAt(start) <= 0xdbff &&
        val.charCodeAt(deleteEnd) >= 0xdc00 &&
        val.charCodeAt(deleteEnd) <= 0xdfff
      ) {
        deleteEnd++;
      }
      next = val.slice(0, start) + val.slice(deleteEnd);
      cursor = start;
    } else {
      return;
    }

    // flushSync: React renders synchronously so cursor is set AFTER DOM update
    contentRef.current = next;
    flushSync(() => {
      setValue(next);
    });
    el.selectionStart = cursor;
    el.selectionEnd = cursor;
  }, [setValue]);

  const clearKeyRepeat = useCallback(() => {
    if (repeatTimerRef.current) { clearTimeout(repeatTimerRef.current); repeatTimerRef.current = null; }
    if (repeatIntervalRef.current) { clearInterval(repeatIntervalRef.current); repeatIntervalRef.current = null; }
    heldKeyRef.current = null;
  }, []);

  useEffect(() => clearKeyRepeat, [clearKeyRepeat]);

  /* =========================
     Enter handling + key repeat
  ========================= */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
        e.preventDefault();
        if (lineCountRef.current > LINE_LIMIT) return;
        execute();
        return;
      }

      // Backspace / Delete key repeat for Electron frameless windows
      if ((e.key === "Backspace" || e.key === "Delete") && !composingRef.current) {
        // If native repeat fires, handle it directly
        if (e.repeat) {
          e.preventDefault();
          doDelete(e.key as "Backspace" | "Delete");
          return;
        }

        // First press: let native handle it, then arm repeat timer
        if (heldKeyRef.current === e.key) return;
        clearKeyRepeat();
        heldKeyRef.current = e.key;
        const k = e.key as "Backspace" | "Delete";

        repeatTimerRef.current = setTimeout(() => {
          repeatIntervalRef.current = setInterval(() => doDelete(k), 33);
        }, 400);
      }
    },
    [execute, clearKeyRepeat, doDelete]
  );

  /* =========================
     Drag & Drop (standard browser APIs -- works in Electron)
  ========================= */
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.types.includes("Files")) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current = 0;
      setIsDragging(false);

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles]
  );

  /* =========================
     Render
  ========================= */
  return (
    <div
      className="
        w-full pt-3 pb-3
        max-lg:pt-2 max-lg:pb-2
      "
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Input shell */}
      <div
        className={`
          relative w-full
          lg:mx-auto lg:max-w-[51rem]
          flex flex-col
          justify-center
          rounded-2xl bg-white dark:bg-[#1e1e1e]
          shadow-[0_0_0_1px_rgba(0,0,0,0.04),0_2px_8px_rgba(0,0,0,0.06),0_12px_40px_rgba(0,0,0,0.06)]
          dark:shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_2px_8px_rgba(0,0,0,0.3),0_12px_40px_rgba(0,0,0,0.4)]
          border border-black/[0.04] dark:border-white/[0.06]
          transition-shadow duration-200
          max-lg:shadow-lg
          max-lg:border-black/[0.06] dark:max-lg:border-white/[0.08]
          ${focused ? "shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_0_0_4px_rgba(59,130,246,0.1),0_4px_16px_rgba(0,0,0,0.08)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_0_0_4px_rgba(59,130,246,0.15),0_4px_16px_rgba(0,0,0,0.4)]" : ""}
          ${enabled && profile === "DEEP" ? "mb-2" : ""}
          ${isDragging ? "ring-2 ring-blue-400 dark:ring-blue-500 bg-blue-50/50 dark:bg-blue-900/10" : ""}
        `}
      >
        {/* Drag overlay */}
        {isDragging && (
          <div className="absolute inset-0 z-30 rounded-2xl flex items-center justify-center bg-blue-50/80 dark:bg-blue-900/30 pointer-events-none">
            <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
              파일을 여기에 놓으세요
            </span>
          </div>
        )}

        {/* Voice Recording/Transcribing -- replaces entire input area */}
        {voice.isRecording || voice.isTranscribing ? (
          <VoiceRecordingBar
            isRecording={voice.isRecording}
            isTranscribing={voice.isTranscribing}
            recordingDuration={voice.recordingDuration}
            audioLevel={voice.audioLevel}
            onStopRecording={voice.stopRecording}
            onCancelRecording={voice.cancelRecording}
          />
        ) : (
          <>
            {/* Attachment preview */}
            {attachments.length > 0 && (
              <div
     className="
       flex flex-wrap
       gap-2
       px-3 pt-3 pb-1
       max-w-full
       overflow-x-hidden
     "
   >
                <AttachmentPreview
                  attachments={attachments}
                  uploadProgress={uploadProgress}
                  onRemove={removeAttachment}
                  onReplace={replaceAttachment}
                />
              </div>
            )}

            {/* Plus */}
            <div className="absolute left-3 bottom-3 z-40">
              <div className="relative">
                <ChatPlusButton onClick={toggle} />
                <ChatPlusMenu
                  open={open}
                  onClose={close}
                  onSelect={async (type) => {
                    if (type === "image" || type === "file") {
                      openDesktopFileDialog();
                    }
                    if (type === "search") {
                      window.dispatchEvent(
                        new Event("chat:search:open")
                      );
                    }
                    if (type === "fork" && threadIdNum) {
                      const messages =
                        useChatStore.getState().messagesByThread[
                          threadIdNum
                        ] ?? [];
                      const lastAssistant = [...messages]
                        .reverse()
                        .find((m) => m.role === "assistant");
                      if (!lastAssistant) return;
                      try {
                        const res = await authFetch(
                          "/api/chat/fork",
                          {
                            method: "POST",
                            body: JSON.stringify({
                              messageId: lastAssistant.id,
                            }),
                          }
                        );
                        if (!res.ok) return;
                        const data = await res.json();
                        if (data.ok && data.threadId) {
                          navigate(`/chat/${data.threadId}`);
                        }
                      } catch {}
                    }
                  }}
                />
              </div>
            </div>

            {/* Thinking mode chip (DEEP / DEEP+) */}
            {enabled && profile === "DEEP" && (
              <div className="px-12 pt-2 pb-1 flex items-center">
                <button
                  type="button"
                  onClick={() => {
                    disable();
                    setDeepVariant("STANDARD");
                  }}
                  className="
                    inline-flex items-center gap-1.5
                    rounded-full
                    bg-gray-900 text-white
                    dark:bg-white dark:text-black
                    px-3 py-1
                    text-[12px]
                  "
                  data-ssot="input-thinking-chip"
                >
                  DEEP{deepVariant === "EXPANDED" ? "+" : ""}
                  <X size={12} />
                </button>
              </div>
            )}

            {/* Textarea Wrapper */}
            <div className="relative w-full">
              <textarea
                ref={textareaRef}
                value={value}
                disabled={
                  isLocked ||
                  status !== "authed" ||
                  disabled ||
                  sending ||
                  uploading ||
                  sendLockRef.current
                }
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                onKeyUp={(e) => {
                  if (e.key === "Backspace" || e.key === "Delete") clearKeyRepeat();
                }}
                onPaste={handlePaste}
                onCompositionStart={() => {
                  composingRef.current = true;
                }}
                onCompositionEnd={(e) => {
                  composingRef.current = false;
                  const text = (e.target as HTMLTextAreaElement).value;
                  contentRef.current = text;
                  setValue(text);
                }}
                onFocus={() => setFocused(true)}
                onBlur={() => { setFocused(false); clearKeyRepeat(); }}
                rows={1}
                placeholder={
                  isLocked
                    ? `일일 메시지 한도 초과 • ${Math.max(
                        1,
                        Math.ceil((cooldownRemaining ?? 0) / 3600)
                      )}시간 후 재사용 가능`
                    : MODE_META[mode].hint
                }
                className="
                  w-full resize-none bg-transparent
                  pl-12 pr-12
                  pt-[14px]
                  pb-[12px]
                  min-h-[52px]
                  max-lg:pt-[12px]
                  max-lg:pb-[10px]
                  max-lg:min-h-[46px]
                  text-[16px]
                  md:text-[15px]
                  lg:text-[15px]
                  leading-[1.5]
                  outline-none
                  text-gray-900 dark:text-[var(--text-primary)]
                  placeholder:text-gray-400 dark:placeholder:text-[var(--text-muted)]
                  chat-input-caret
                "
              />

              {/* Voice + Send / Stop */}
              <div
                className={`absolute right-3 flex items-center gap-1.5 ${
                  (attachments.length > 0 && !value.trim()) || isTall
                    ? "bottom-3"
                    : "top-1/2 -translate-y-1/2"
                }`}
              >
                {isStreaming ? (
                  <button
                    onClick={stop}
                    className="h-8 w-8 rounded-full bg-gray-900 text-white dark:bg-white dark:text-black flex items-center justify-center transition-all duration-150 hover:scale-105 active:scale-95"
                  >
                    <Square size={14} />
                  </button>
                ) : (
                  <>
                    {!value.trim() && attachments.length === 0 && (
                      <VoiceButton
                        permissionState={voice.permissionState}
                        onStartRecording={voice.startRecording}
                        disabled={disabled || isLocked}
                      />
                    )}
                    <button
                      onClick={execute}
                      disabled={
                        isLocked ||
                        sending ||
                        uploading ||
                        sendLockRef.current ||
                        lineExceeded ||
                        (!value.trim() && attachments.length === 0)
                      }
                      className="
                        relative
                        h-8 w-8
                        rounded-full
                        bg-gray-900 text-white
                        dark:bg-white dark:text-black
                        flex items-center justify-center
                        disabled:opacity-20
                        transition-all duration-150
                        hover:scale-105 active:scale-90
                        disabled:hover:scale-100
                      "
                    >
                      <Send size={14} className="-ml-px" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </>
        )}

        {/* 4000-line limit warning */}
        {lineExceeded && (
          <div className="px-4 pb-2 pt-1">
            <p className="text-[13px] text-red-500 font-medium">
              4,000줄을 초과했어요. 줄여서 보내주세요.
            </p>
          </div>
        )}

        {isLocked && (
          <div className="py-6 text-center">
            <div className="text-lg font-semibold text-gray-800 dark:text-[var(--text-primary)]">
              일일 메시지 한도 초과
            </div>
            <div className="mt-2 text-sm text-gray-500 dark:text-[var(--text-secondary)]">
              {Math.max(1, Math.ceil((cooldownRemaining ?? 0) / 3600))}
              시간 후 자동 해제됩니다
            </div>
            <div className="mt-4">
              <button
                onClick={() => navigate("/upgrade")}
                className="inline-block px-4 py-2 bg-gray-900 text-white dark:bg-white dark:text-black rounded-xl"
              >
                업그레이드 하기
              </button>
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          hidden
          multiple
          accept="image/*,.csv,.tsv,.xlsx,.xls,.pdf,.doc,.docx,.hwp,.hwpx,.md,.txt,.rtf,.zip,.rar,.7z,.tar,.gz,.bz2,.ts,.tsx,.js,.jsx,.py,.java,.c,.cpp,.rs,.go,.rb,.php,.swift,.json"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
    </div>
  );
}
