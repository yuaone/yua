"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import Highlight from "@tiptap/extension-highlight";
import Underline from "@tiptap/extension-underline";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";
import { useEffect, useMemo, useRef } from "react";
import * as Y from "yjs";

import { SlashCommand } from "./extensions/slash-command";
import { Callout } from "./extensions/callout";
import { FileBlock } from "./extensions/file-block";
import { AiBlock } from "./extensions/ai-block";
import SlashCommandMenu from "./SlashCommandMenu";
import FloatingToolbar from "./FloatingToolbar";
import { Collaboration } from "./collaboration/CollaborationExtension";

const lowlight = createLowlight(common);

type CollabConfig = {
  ydoc: Y.Doc;
  field?: string;
  user: { name: string; color: string };
};

type Props = {
  content?: string;
  editable?: boolean;
  placeholder?: string;
  onUpdate?: (json: Record<string, unknown>, html: string) => void;
  className?: string;
  collaboration?: CollabConfig;
  authFetch?: ((url: string, init?: RequestInit) => Promise<Response>) | null;
  docId?: string | null;
  onEditorReady?: (editor: import("@tiptap/react").Editor) => void;
};

export default function BlockEditor({
  content,
  editable = true,
  placeholder = "'/' 를 입력하여 블록을 추가하세요…",
  onUpdate,
  className,
  collaboration,
  authFetch,
  docId,
  onEditorReady,
}: Props) {
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  const extensions = useMemo(() => {
    const base = [
      StarterKit.configure({
        codeBlock: false,
        dropcursor: { color: "#a0a0a0", width: 2 },
      }),
      CodeBlockLowlight.configure({ lowlight }),
      Image.configure({ inline: false, allowBase64: true }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { class: "yua-editor-link" },
      }),
      Placeholder.configure({ placeholder }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      Highlight.configure({ multicolor: true }),
      Underline,
      TextStyle,
      Color,
      Callout,
      FileBlock,
      AiBlock,
      SlashCommand,
    ];

    if (collaboration) {
      base.push(
        Collaboration.configure({
          document: collaboration.ydoc,
          field: collaboration.field ?? "default",
          user: collaboration.user,
        }) as any
      );
    }

    return base;
  }, [collaboration, placeholder]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions,
    // When collaborating, Y.js owns the content — don't set initial content
    content: collaboration ? undefined : (content || ""),
    editable,
    editorProps: {
      attributes: {
        class: [
          "prose prose-sm sm:prose-base dark:prose-invert max-w-none",
          "focus:outline-none min-h-[200px] px-1",
        ].join(" "),
      },
    },
    onUpdate: ({ editor: e }) => {
      onUpdateRef.current?.(e.getJSON() as Record<string, unknown>, e.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(editable);
    onEditorReady?.(editor);
  }, [editor, editable]);

  // Inject authFetch/docId into AiBlock storage
  useEffect(() => {
    if (!editor) return;
    const s = (editor.storage as any).aiBlock;
    if (s) {
      s.authFetch = authFetch ?? null;
      s.docId = docId ?? null;
    }
  }, [editor, authFetch, docId]);

  // Sync content prop when switching documents (non-collab mode only)
  useEffect(() => {
    if (!editor || collaboration || content === undefined) return;
    const currentHtml = editor.getHTML();
    if (currentHtml === content) return;
    try {
      const parsed = JSON.parse(content);
      if (parsed && typeof parsed === "object") {
        editor.commands.setContent(parsed);
        return;
      }
    } catch {
      // Not JSON, treat as HTML
    }
    editor.commands.setContent(content || "");
  }, [editor, content, collaboration]);

  if (!editor) return null;

  return (
    <div className={`relative ${className ?? ""}`}>
      <EditorContent editor={editor} />
      {editable && <FloatingToolbar editor={editor} />}
      <SlashCommandMenu editor={editor} authFetch={authFetch} />
    </div>
  );
}
