"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Type,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Code2,
  Quote,
  Minus,
  Image,
  Table,
  MessageSquare,
  Paperclip,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import type { Editor } from "@tiptap/react";
import { SlashCommandPluginKey } from "./extensions/slash-command";
import { detectCategory } from "./extensions/file-block";

type AuthFetchFn = (url: string, init?: RequestInit) => Promise<Response>;

type CommandItem = {
  title: string;
  description: string;
  icon: React.ReactNode;
  command: (editor: Editor, range: { from: number; to: number }) => void;
};

function buildCommands(authFetch?: AuthFetchFn | null): CommandItem[] {
return [
  {
    title: "텍스트",
    description: "기본 텍스트 블록",
    icon: <Type size={18} />,
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).setParagraph().run();
    },
  },
  {
    title: "제목 1",
    description: "큰 제목",
    icon: <Heading1 size={18} />,
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 1 }).run();
    },
  },
  {
    title: "제목 2",
    description: "중간 제목",
    icon: <Heading2 size={18} />,
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run();
    },
  },
  {
    title: "제목 3",
    description: "작은 제목",
    icon: <Heading3 size={18} />,
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 3 }).run();
    },
  },
  {
    title: "리스트",
    description: "순서 없는 목록",
    icon: <List size={18} />,
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run();
    },
  },
  {
    title: "번호 리스트",
    description: "순서 있는 목록",
    icon: <ListOrdered size={18} />,
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run();
    },
  },
  {
    title: "할 일",
    description: "체크리스트",
    icon: <CheckSquare size={18} />,
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).toggleTaskList().run();
    },
  },
  {
    title: "코드",
    description: "코드 블록",
    icon: <Code2 size={18} />,
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
    },
  },
  {
    title: "인용",
    description: "인용문",
    icon: <Quote size={18} />,
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).toggleBlockquote().run();
    },
  },
  {
    title: "구분선",
    description: "가로 구분선",
    icon: <Minus size={18} />,
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).setHorizontalRule().run();
    },
  },
  {
    title: "이미지",
    description: "이미지 삽입",
    icon: <Image size={18} />,
    command: (editor, range) => {
      const url = window.prompt("이미지 URL을 입력하세요:");
      if (url) {
        editor.chain().focus().deleteRange(range).setImage({ src: url }).run();
      }
    },
  },
  {
    title: "표",
    description: "3x3 테이블",
    icon: <Table size={18} />,
    command: (editor, range) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
        .run();
    },
  },
  {
    title: "콜아웃",
    description: "강조 블록 (정보)",
    icon: <AlertCircle size={18} />,
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).setCallout({ variant: "info" }).run();
    },
  },
  {
    title: "경고 콜아웃",
    description: "경고 강조 블록",
    icon: <MessageSquare size={18} />,
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).setCallout({ variant: "warning" }).run();
    },
  },
  {
    title: "AI 생성",
    description: "AI로 텍스트 생성",
    icon: <Sparkles size={18} />,
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).run();
      editor.commands.insertAiBlock({});
    },
  },
  {
    title: "파일 첨부",
    description: "파일 업로드",
    icon: <Paperclip size={18} />,
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).run();
      const input = document.createElement("input");
      input.type = "file";
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) return;
        const ext = file.name.split(".").pop() || "";
        const blockId = crypto.randomUUID();

        // Insert block with uploading state
        editor.commands.insertFileBlock({
          id: blockId,
          fileName: file.name,
          extension: ext,
          category: detectCategory(ext),
          sizeBytes: file.size,
          uploadStatus: "uploading",
          uploadProgress: 0,
          url: "",
        });

        if (!authFetch) {
          // Fallback: local blob URL
          updateFileBlock(editor, blockId, {
            url: URL.createObjectURL(file),
            uploadStatus: "complete",
            uploadProgress: 100,
          });
          return;
        }

        try {
          const form = new FormData();
          form.append("file", file);
          const res = await authFetch("/api/chat/upload", {
            method: "POST",
            body: form,
          });
          if (!res.ok) throw new Error("UPLOAD_FAILED");
          const data = await res.json();
          if (!data?.ok) throw new Error(data?.error ?? "UPLOAD_FAILED");

          updateFileBlock(editor, blockId, {
            url: data.attachment.url,
            uploadStatus: "complete",
            uploadProgress: 100,
          });
        } catch {
          updateFileBlock(editor, blockId, {
            uploadStatus: "error",
            uploadProgress: 0,
          });
        }
      };
      input.click();
    },
  },
];
}

/** Walk doc to find fileBlock with matching id and update attrs */
function updateFileBlock(
  editor: Editor,
  blockId: string,
  patch: Record<string, unknown>
) {
  const { doc, tr } = editor.view.state;
  doc.descendants((node, pos) => {
    if (node.type.name === "fileBlock" && node.attrs.id === blockId) {
      tr.setNodeMarkup(pos, undefined, { ...node.attrs, ...patch });
      return false;
    }
  });
  editor.view.dispatch(tr);
}

type Props = {
  editor: Editor;
  authFetch?: AuthFetchFn | null;
};

export default function SlashCommandMenu({ editor, authFetch }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const rangeRef = useRef<{ from: number; to: number } | null>(null);

  const commands = buildCommands(authFetch);
  const filtered = commands.filter(
    (cmd) =>
      cmd.title.toLowerCase().includes(query.toLowerCase()) ||
      cmd.description.toLowerCase().includes(query.toLowerCase())
  );

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setSelectedIndex(0);
    rangeRef.current = null;
    editor.view.dispatch(
      editor.view.state.tr.setMeta(SlashCommandPluginKey, {
        active: false,
        range: null,
        query: "",
      })
    );
  }, [editor]);

  useEffect(() => {
    const check = () => {
      const state = SlashCommandPluginKey.getState(editor.view.state);
      if (state?.active && !open) {
        rangeRef.current = state.range;
        setOpen(true);
        setQuery("");
        setSelectedIndex(0);
      } else if (state?.active && open && state.range) {
        // Keep range in sync as user types after /
        rangeRef.current = state.range;

        // 커서 위치 기반 메뉴 포지셔닝
        const coords = editor.view.coordsAtPos(
          editor.view.state.selection.from
        );
        const editorRect = editor.view.dom.getBoundingClientRect();
        setPosition({
          top: coords.bottom - editorRect.top + 8,
          left: coords.left - editorRect.left,
        });
      } else if (!state?.active && open) {
        setOpen(false);
      }
    };

    editor.on("transaction", check);
    return () => {
      editor.off("transaction", check);
    };
  }, [editor, open]);

  useEffect(() => {
    if (!open) return;

    const handleInput = () => {
      const { $from } = editor.view.state.selection;
      const text = $from.parent.textContent;
      const slashIdx = text.lastIndexOf("/");
      if (slashIdx >= 0) {
        setQuery(text.slice(slashIdx + 1));
        setSelectedIndex(0);
      }
    };

    editor.on("update", handleInput);
    return () => {
      editor.off("update", handleInput);
    };
  }, [editor, open]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % filtered.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => (i - 1 + filtered.length) % filtered.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        const cmd = filtered[selectedIndex];
        if (cmd && rangeRef.current) {
          cmd.command(editor, rangeRef.current);
          close();
        }
      } else if (e.key === "Escape") {
        close();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [open, filtered, selectedIndex, editor, close]);

  if (!open || filtered.length === 0) return null;

  return (
    <div
      ref={menuRef}
      className="absolute z-50 w-64 max-h-80 overflow-y-auto rounded-xl border bg-white dark:bg-[#1b1b1b] dark:border-[var(--line)] shadow-lg p-1.5"
      style={{ top: position.top, left: position.left }}
    >
      {filtered.map((cmd, i) => (
        <button
          key={cmd.title}
          type="button"
          className={`
            w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm
            transition-colors
            ${
              i === selectedIndex
                ? "bg-gray-100 dark:bg-white/10"
                : "hover:bg-gray-50 dark:hover:bg-white/5"
            }
          `}
          onMouseEnter={() => setSelectedIndex(i)}
          onClick={() => {
            if (rangeRef.current) {
              cmd.command(editor, rangeRef.current);
              close();
            }
          }}
        >
          <span className="flex-shrink-0 text-gray-500 dark:text-gray-400">
            {cmd.icon}
          </span>
          <div>
            <div className="text-gray-900 dark:text-[var(--text-primary)]">
              {cmd.title}
            </div>
            <div className="text-xs text-gray-500 dark:text-[var(--text-muted)]">
              {cmd.description}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
