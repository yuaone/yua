"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { Square, Send, Image as ImageIcon, X } from "lucide-react";
import { useThinkingProfile } from "@/hooks/src/hooks/useThinkingProfile";
import { useChatStore } from "@/store/useChatStore";
import { useChatStream } from "@/hooks/useChatStream";
import { useChatSender } from "@/hooks/useChatSender";
import { useAuth } from "@/contexts/AuthContext";
import { useChatDraft } from "@/store/useChatDraft";
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
  const router = useRouter();

  // Voice input
  const voiceUsedRef = useRef(false);
  const voice = useVoiceInput({
    authFetch,
    onTranscribed: (text) => {
      voiceUsedRef.current = true;
      setValue((prev) => prev ? prev + " " + text : text);
      contentRef.current = contentRef.current ? contentRef.current + " " + text : text;
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
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [isTall, setIsTall] = useState(false); // textarea가 커지면 전송버튼 bottom 고정
const { profile, enabled, enable, disable } = useThinkingProfile();
const sendLockRef = useRef(false); // 🔥 HARD LOCK (중복 전송 방지)
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
      // to prevent React from resetting textarea value mid-character
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
  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    const now = Date.now();

    const next: Attachment[] = Array.from(files).map((file, idx) => ({
      id: `${now}-${idx}-${Math.random().toString(16).slice(2)}`,
      file,
      kind: (file.type.startsWith("image/") || /\.(png|jpe?g|gif|webp|svg|bmp|ico)$/i.test(file.name)) ? "image" : "file",
      previewUrl: (file.type.startsWith("image/") || /\.(png|jpe?g|gif|webp|svg|bmp|ico)$/i.test(file.name))
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
          return { ...a, file: newFile, previewUrl: newPreviewUrl, status: "idle" as const };
        })
      );
    },
    []
  );

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
  const [sending, setSending] = useState(false); // UI submit lock only
  const [uploading, setUploading] = useState(false);


  const execute = useCallback(async () => {
    console.log("[SEND_EXECUTE]", {
      sending,
      uploading,
      attachments: attachments.length,
    });
  // 🚫 새로고침 직후 자동 실행 방지
  if (!mountedRef.current) {
    console.log("[BLOCK_SEND_NOT_MOUNTED]");
    return;
  }

  // 🚫 visibility guard (hydration/restore 중 방지)
  if (typeof document !== "undefined" && document.visibilityState !== "visible") {
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
      console.log("[SEND_EXECUTE_EARLY_RETURN] status_not_authed", { status, threadIdNum });
      sendLockRef.current = false;
      return;
    }

    if (streamState !== "idle") {
      console.log("[SEND_EXECUTE_EARLY_RETURN] stream_not_idle", { streamState });
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

    // 🔒 4000-line limit guard
    if (lineCountRef.current > LINE_LIMIT) {
      console.log("[SEND_EXECUTE_EARLY_RETURN] line_limit_exceeded", {
        lines: lineCountRef.current,
      });
      sendLockRef.current = false;
      return;
    }

    try {
 if (disabled || uploading) {
   console.log("[SEND_EXECUTE_EARLY_RETURN] disabled_or_uploading", { disabled, uploading });
   sendLockRef.current = false;
   return;
 }
      setSending(true);
      setUploading(true);

      // 🔥 상태 변경 (uploading 애니메이션용)
      setAttachments(prev =>
        prev.map(a => ({ ...a, status: "uploading" }))
      );

      const metas: AttachmentMeta[] = await Promise.all(
         attachments.map(a => uploadAttachmentWithProgress(a))
       );


      setUploading(false);

      setAttachments(prev =>
        prev.map(a => ({ ...a, status: "done" }))
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

      if (threadIdNum == null) return;

      let activeThreadId: number | null = threadIdNum;

      // 🔥 /chat 에서 첫 메시지 → thread 생성
      if (!activeThreadId) {
        const id = await createNewThread();
        if (!id) {
          return;
        }
        activeThreadId = Number(id);
        // 🔥 FIX: route 이동만 하고 send는 중단
        router.push(`/chat/${id}` as any);
        setDraft(trimmed); // 다음 화면에서 복원
        setAttachments([]);
        return;
      }

            // 🔒 타입 가드 (useChatSender는 number만 허용)
      if (!Number.isFinite(activeThreadId)) {
        return;
      }

         // ✅ STEP 1: 즉시 send (attachments 없이)
         window.dispatchEvent(new Event("chat:user:submit"));

  const effectiveProfile =
    enabled && profile === "DEEP"
      ? "DEEP"
      : "NORMAL";

  send({
    threadId: activeThreadId,
    content: trimmed,
    attachments: metas,
    thinkingProfile: effectiveProfile,
    deepVariant: effectiveProfile === "DEEP" ? deepVariant : undefined,
    inputMethod: voiceUsedRef.current ? "voice" : "keyboard",
  });
  voiceUsedRef.current = false;
  console.log("[SEND_DISPATCHED]", {
    threadId: activeThreadId,
    attachments: metas.length,
  });
     clearDraft();
    // ✅ SSOT: DEEP는 "이번 입력만"
    // 한 번 보내면 다음 입력부터 NORMAL로 복귀
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
      sendLockRef.current = false; // 🔥 LOCK RELEASE
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
    router,
    onSubmit,
    isLocked
  ]);

  /* =========================
     Enter handling
  ========================= */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
        e.preventDefault();
        // Block send when line limit exceeded
        if (lineCountRef.current > LINE_LIMIT) return;
        execute();
      }
    },
    [execute]
  );

  /* =========================
     Render
  ========================= */
  return (
 <div className="
   w-full pt-3 pb-3
   max-lg:pt-2 max-lg:pb-2
 ">


    {/* Input shell */}
      <div
        className={`
          relative w-full
          lg:mx-auto lg:max-w-[51rem]
          flex flex-col
          justify-center 
 rounded-2xl bg-white dark:bg-[#1b1b1b]
 shadow-xl
 border border-black/5 dark:border-[var(--line)]
 backdrop-blur
          transition-all
          max-lg:shadow-lg
          max-lg:border-black/10 dark:max-lg:border-[var(--line)]
          ${focused ? "ring-2 ring-black/40 dark:ring-[var(--line)]" : ""}
          ${enabled && profile === "DEEP" ? "mb-2" : ""}
        `}
      >

        {/* Voice Recording/Transcribing — replaces entire input area */}
        {(voice.isRecording || voice.isTranscribing) ? (
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
                      fileInputRef.current?.click();
                    }
                    if (type === "search") {
                      window.dispatchEvent(new Event("chat:search:open"));
                    }
                    if (type === "fork" && threadIdNum) {
                      const messages = useChatStore.getState().messagesByThread[threadIdNum] ?? [];
                      const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
                      if (!lastAssistant) return;
                      try {
                        const res = await authFetch("/api/chat/fork", {
                          method: "POST",
                          body: JSON.stringify({ messageId: lastAssistant.id }),
                        });
                        if (!res.ok) return;
                        const data = await res.json();
                        if (data.ok && data.threadId) {
                          router.push(`/chat/${data.threadId}`);
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
                onPaste={handlePaste}
                onCompositionStart={() => { composingRef.current = true; }}
                onCompositionEnd={(e) => {
                  composingRef.current = false;
                  const text = (e.target as HTMLTextAreaElement).value;
                  contentRef.current = text;
                  setValue(text);
                }}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                rows={1}
                placeholder={
                  isLocked
                    ? `일일 메시지 한도 초과 • ${Math.max(1, Math.ceil((cooldownRemaining ?? 0)/3600))}시간 후 재사용 가능`
                    : MODE_META[mode].hint
                }
                className="
                  w-full resize-none bg-transparent
                  pl-12 pr-12
                  pt-[16px]
                  pb-[18px]
                  min-h-[72px]
                  max-lg:pt-[16px]
                  max-lg:pb-[14px]
                  max-lg:min-h-[60px]
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
                    className="h-9 w-9 max-lg:h-10 max-lg:w-10 rounded-full bg-gray-900 text-white dark:bg-white dark:text-black flex items-center justify-center"
                  >
                    <Square size={16} />
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
                        h-9 w-9
                        max-lg:h-10 max-lg:w-10
                        rounded-full
                        bg-gray-900 text-white
                        dark:bg-white dark:text-black
                        flex items-center justify-center
                        disabled:opacity-30
                      "
                    >
                      <Send size={16} />
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
       {Math.max(1, Math.ceil((cooldownRemaining ?? 0)/3600))}시간 후 자동 해제됩니다
     </div>
     <div className="mt-4">
       <a
         href="/upgrade"
         className="inline-block px-4 py-2 bg-gray-900 text-white dark:bg-white dark:text-black rounded-xl"
       >
         업그레이드 하기
       </a>
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
