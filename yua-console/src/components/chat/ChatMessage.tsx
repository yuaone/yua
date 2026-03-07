"use client";

import { useState, memo, useMemo } from "react";
import type { ChatMessage } from "@/types/chat";
import { parseBlocks } from "@/utils/chat-utils";
import ChatFilePreview from "./ChatFilePreview";
import { Copy, Check } from "lucide-react";

import { useChatStore } from "@/store/useChatStore";
import { useTimelineStore } from "@/store/useTimelineStore";

/* ------------------------------------------------------
   언어 감지
------------------------------------------------------ */
function detectLanguage(code: string): string {
  const c = code.toLowerCase();
  if (/import .*react/.test(c)) return "tsx";
  if (c.includes("async") || c.includes("const") || c.includes("function"))
    return "ts";
  if (c.includes("def ") || c.includes("print(")) return "python";
  if (c.includes("#include") || c.includes("printf(")) return "c";
  if (c.includes("class ") && c.includes("{")) return "java";
  return "text";
}

const isImageUrl = (text: string) =>
  /^https?:\/\/[^ ]+\.(png|jpg|jpeg|gif|webp)$/i.test(text);

/* ------------------------------------------------------
   MAIN COMPONENT
------------------------------------------------------ */
export default memo(function ChatMessageItem({
  id,
  role,
  content,
  model,
  files = [],
}: ChatMessage & { model?: string }) {
  const isUser = role === "user";

  const { currentThreadId } = useChatStore();
  const { open } = useTimelineStore();

  const blocks = useMemo(() => parseBlocks(content ?? ""), [content]);
  const [copied, setCopied] = useState(false);

  const copyAll = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 700);
  };

  const isSpineAssistant = role === "assistant" && model === "spine";

  return (
    <div className={`w-full flex ${isUser ? "justify-end" : "justify-start"} my-4`}>
      <div
        className={`
          relative max-w-[78%] px-5 py-4 rounded-2xl shadow-lg border
          backdrop-blur-xl transition
          ${
            isUser
              ? "bg-black text-white border-black/30"
              : "bg-[rgba(255,255,255,0.55)] text-black border-black/10"
          }
        `}
      >
        {/* Copy 버튼 */}
        {!isUser && (
          <button
            onClick={copyAll}
            className="absolute top-2 right-2 p-1 rounded-md hover:bg-black/10 transition"
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </button>
        )}

        {/* 파일 */}
        {files.length > 0 && (
          <div className="flex flex-col gap-2 mb-3">
            {files.map((f) => (
              <ChatFilePreview key={f.id} file={f} />
            ))}
          </div>
        )}

        {/* 텍스트 + 코드 + 이미지 */}
        <div className="flex flex-col gap-3">
          {blocks.map((b, i) => {
            /* -----------------------
               CODE BLOCK
            ------------------------ */
            if (b.type === "code") {
              const lang = detectLanguage(b.content);

              return (
                <div
                  key={i}
                  className="relative group rounded-xl border border-black/10 bg-[rgba(255,255,255,0.65)] backdrop-blur-xl"
                >
                  <div className="absolute top-2 right-3 text-xs text-black/50">{lang}</div>

                  <pre className="overflow-x-auto p-4 text-xs leading-relaxed whitespace-pre">
                    {b.content.split("\n").map((line, idx) => (
                      <div key={idx} className="flex gap-4">
                        <span className="text-black/30 w-6 text-right select-none">{idx + 1}</span>
                        <span>{line}</span>
                      </div>
                    ))}
                  </pre>

                  <button
                    onClick={() => navigator.clipboard.writeText(b.content)}
                    className="
                      absolute bottom-2 right-3 opacity-0
                      group-hover:opacity-100 transition text-xs
                      px-2 py-1 rounded-md bg-black/10 hover:bg-black/20
                    "
                  >
                    Copy
                  </button>
                </div>
              );
            }

            /* -----------------------
               IMAGE BLOCK
               (parseBlocks가 이미지 URL을 url로 제공)
            ------------------------ */
            if (b.type === "image") {
              return (
                <div
                  key={i}
                  className="
                    rounded-xl overflow-hidden border border-black/10
                    bg-[rgba(255,255,255,0.5)] backdrop-blur-xl
                  "
                >
                  <img src={b.url} alt="" className="w-full rounded-xl" />
                </div>
              );
            }

            /* -----------------------
               TEXT BLOCK
               (또는 텍스트 안의 URL이 이미지일 수도 있음)
            ------------------------ */
            if (b.type === "text") {
              if (isImageUrl(b.content)) {
                return (
                  <img
                    key={i}
                    src={b.content}
                    alt=""
                    className="rounded-xl border border-black/10"
                  />
                );
              }

              return (
                <p key={i} className="text-[15px] leading-relaxed whitespace-pre-wrap">
                  {b.content}
                </p>
              );
            }

            return null;
          })}
        </div>

        {/* SPINE TIMELINE 버튼 */}
        {isSpineAssistant && (
          <button
            onClick={() => open(String(currentThreadId), String(id))}
            className="mt-3 text-xs text-black/60 font-medium hover:text-black transition"
          >
            View Timeline →
          </button>
        )}
      </div>
    </div>
  );
});
