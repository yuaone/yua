"use client";

import { useEffect, useState, useMemo } from "react";
import Editor from "@monaco-editor/react";

type Props = {
  fileName: string | null;
};

// 확장자 → Monaco 언어 매핑
function detectLanguage(file: string | null) {
  if (!file) return "plaintext";

  const ext = file.split(".").pop()?.toLowerCase();

  switch (ext) {
    case "ts":
      return "typescript";
    case "tsx":
      return "typescript";
    case "js":
      return "javascript";
    case "jsx":
      return "javascript";
    case "json":
      return "json";
    case "md":
      return "markdown";
    case "yml":
    case "yaml":
      return "yaml";
    case "sh":
      return "shell";
    case "html":
      return "html";
    case "css":
      return "css";
    case "env":
      return "plaintext";
    default:
      return "plaintext";
  }
}

export default function EditorPanel({ fileName }: Props) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // 자동 언어 감지
  const language = useMemo(() => detectLanguage(fileName), [fileName]);

  // 파일 로딩
  useEffect(() => {
    if (!fileName) return;

    setLoading(true);

    fetch(`/api/console/fs/read?file=${encodeURIComponent(fileName)}`, {
      cache: "no-store",
    })
      .then((res) => res.text())
      .then((txt) => setContent(txt))
      .finally(() => setLoading(false));
  }, [fileName]);

  // 저장
  const saveFile = async () => {
    if (!fileName) return;

    setSaving(true);

    await fetch(`/api/console/fs/write`, {
      method: "POST",
      body: JSON.stringify({
        file: fileName,
        content,
      }),
      headers: { "Content-Type": "application/json" },
    });

    setSaving(false);

    // 트리 reload 이벤트
    window.dispatchEvent(new CustomEvent("fs:reload"));
  };

  // 파일 선택이 없을 때
  if (!fileName)
    return (
      <div className="w-full h-full flex items-center justify-center text-black/50 text-sm">
        Select a file from the left explorer to edit.
      </div>
    );

  return (
    <div className="relative flex flex-col w-full h-full overflow-hidden">

      {/* HEADER */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-black/10 bg-white/70 backdrop-blur-xl text-sm">
        <span className="font-medium text-black">{fileName}</span>

        <button
          onClick={saveFile}
          className="
            px-3 py-1 rounded-lg text-xs 
            bg-black text-white hover:bg-black/80 transition
          "
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>

      {/* MONACO EDITOR */}
      <Editor
        key={fileName} // 파일 변경 시 안전하게 에디터 리셋
        height="100%"
        language={language}
        theme="vs-light"
        value={content}
        onChange={(v) => setContent(v ?? "")}
        options={{
          fontSize: 14,
          minimap: { enabled: false },
          smoothScrolling: true,
          scrollBeyondLastLine: false,
          wordWrap: "on",
          automaticLayout: true,
        }}
      />

      {/* Loading Indicator */}
      {loading && (
        <div className="absolute top-3 right-4 text-xs text-black/40">
          Loading...
        </div>
      )}
    </div>
  );
}
