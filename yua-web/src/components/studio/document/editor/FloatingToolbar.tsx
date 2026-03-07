"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  Highlighter,
  Link as LinkIcon,
} from "lucide-react";
import type { Editor } from "@tiptap/react";

type Props = {
  editor: Editor;
};

export default function FloatingToolbar({ editor }: Props) {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [linkInput, setLinkInput] = useState("");
  const [showLinkForm, setShowLinkForm] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const update = () => {
      const { from, to, empty } = editor.state.selection;

      if (empty || from === to) {
        setVisible(false);
        setShowLinkForm(false);
        return;
      }

      setVisible(true);

      const domAtPos = editor.view.coordsAtPos(from);
      const domAtEnd = editor.view.coordsAtPos(to);
      const editorRect = editor.view.dom.getBoundingClientRect();

      const midX = (domAtPos.left + domAtEnd.left) / 2 - editorRect.left;
      const topY = domAtPos.top - editorRect.top - 44;

      setPosition({ top: Math.max(0, topY), left: midX });
    };

    editor.on("selectionUpdate", update);
    editor.on("blur", () => {
      // Delay to allow toolbar button clicks
      setTimeout(() => {
        if (!toolbarRef.current?.contains(document.activeElement)) {
          setVisible(false);
          setShowLinkForm(false);
        }
      }, 150);
    });

    return () => {
      editor.off("selectionUpdate", update);
    };
  }, [editor]);

  const toggle = useCallback(
    (key: "bold" | "italic" | "underline" | "strike" | "code" | "highlight") => {
      const chain = editor.chain().focus();
      switch (key) {
        case "bold": chain.toggleBold().run(); break;
        case "italic": chain.toggleItalic().run(); break;
        case "underline": chain.toggleUnderline().run(); break;
        case "strike": chain.toggleStrike().run(); break;
        case "code": chain.toggleCode().run(); break;
        case "highlight": chain.toggleHighlight().run(); break;
      }
    },
    [editor]
  );

  const setLink = useCallback(() => {
    if (!linkInput.trim()) {
      editor.chain().focus().unsetLink().run();
    } else {
      editor.chain().focus().setLink({ href: linkInput.trim() }).run();
    }
    setShowLinkForm(false);
    setLinkInput("");
  }, [editor, linkInput]);

  if (!visible) return null;

  const buttons: {
    key: "bold" | "italic" | "underline" | "strike" | "code" | "highlight";
    icon: React.ReactNode;
    active: boolean;
  }[] = [
    { key: "bold", icon: <Bold size={15} />, active: editor.isActive("bold") },
    { key: "italic", icon: <Italic size={15} />, active: editor.isActive("italic") },
    { key: "underline", icon: <UnderlineIcon size={15} />, active: editor.isActive("underline") },
    { key: "strike", icon: <Strikethrough size={15} />, active: editor.isActive("strike") },
    { key: "code", icon: <Code size={15} />, active: editor.isActive("code") },
    { key: "highlight", icon: <Highlighter size={15} />, active: editor.isActive("highlight") },
  ];

  return (
    <div
      ref={toolbarRef}
      className="absolute z-50 flex items-center gap-0.5 rounded-lg border border-[#e5e7eb] dark:border-[var(--line)] bg-white dark:bg-[#252525] shadow-lg px-1 py-0.5 -translate-x-1/2 animate-[fadeIn_0.12s_ease-out]"
      style={{ top: position.top, left: position.left }}
      onMouseDown={(e) => e.preventDefault()}
    >
      {showLinkForm ? (
        <form
          onSubmit={(e) => { e.preventDefault(); setLink(); }}
          className="flex items-center gap-1 px-1"
        >
          <input
            autoFocus
            value={linkInput}
            onChange={(e) => setLinkInput(e.target.value)}
            placeholder="URL 입력"
            className="h-7 w-40 rounded border border-[#e5e7eb] dark:border-[var(--line)] bg-transparent px-2 text-xs outline-none"
            onMouseDown={(e) => e.stopPropagation()}
          />
          <button type="submit" className="h-7 rounded bg-[#111827] px-2 text-xs text-white">확인</button>
          <button type="button" onClick={() => setShowLinkForm(false)} className="h-7 px-1 text-xs text-[#6b7280]">취소</button>
        </form>
      ) : (
        <>
          {buttons.map((btn) => (
            <button
              key={btn.key}
              type="button"
              onClick={() => toggle(btn.key)}
              className={`inline-flex h-7 w-7 items-center justify-center rounded transition-colors ${
                btn.active
                  ? "bg-[#111827] text-white"
                  : "text-[#374151] dark:text-[var(--text-secondary)] hover:bg-[#f3f4f6] dark:hover:bg-white/5"
              }`}
              title={btn.key}
            >
              {btn.icon}
            </button>
          ))}
          <div className="mx-0.5 h-4 w-px bg-[#e5e7eb] dark:bg-[var(--line)]" />
          <button
            type="button"
            onClick={() => {
              const existing = editor.getAttributes("link").href;
              setLinkInput(existing || "");
              setShowLinkForm(true);
            }}
            className={`inline-flex h-7 w-7 items-center justify-center rounded transition-colors ${
              editor.isActive("link")
                ? "bg-[#111827] text-white"
                : "text-[#374151] dark:text-[var(--text-secondary)] hover:bg-[#f3f4f6] dark:hover:bg-white/5"
            }`}
            title="링크"
          >
            <LinkIcon size={15} />
          </button>
        </>
      )}
    </div>
  );
}
