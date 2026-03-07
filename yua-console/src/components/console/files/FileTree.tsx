"use client";

import { useState } from "react";
import {
  Folder,
  FolderOpen,
  File as FileDefault,
  FileCode,
  FileJson,
  FileText,
  ImageIcon,
  Lock,
  TerminalSquare,
  Cog,
} from "lucide-react";

import { useContextMenu } from "@/hooks/useContextMenu";

// -----------------------------
// File Icon 자동 매핑
// -----------------------------
function getFileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase();

  switch (ext) {
    case "ts":
    case "js":
      return <FileCode size={14} className="text-sky-600" />;
    case "tsx":
    case "jsx":
      return <FileCode size={14} className="text-indigo-500" />;
    case "json":
      return <FileJson size={14} className="text-emerald-500" />;
    case "md":
      return <FileText size={14} className="text-slate-500" />;
    case "env":
      return <Lock size={14} className="text-yellow-600" />;
    case "png":
    case "jpg":
    case "jpeg":
    case "svg":
      return <ImageIcon size={14} className="text-rose-500" />;
    case "sh":
      return <TerminalSquare size={14} className="text-lime-600" />;
    case "yaml":
    case "yml":
      return <Cog size={14} className="text-zinc-600" />;
    default:
      return <FileDefault size={14} className="text-black/60" />;
  }
}

export default function FileTree({
  tree,
  onSelect,
}: {
  tree: any[];
  onSelect: (path: string) => void;
}) {
  return (
    <div className="text-sm select-none">
      {tree.map((node) => (
        <TreeNode key={node.path} node={node} depth={0} onSelect={onSelect} />
      ))}
    </div>
  );
}

function TreeNode({
  node,
  depth,
  onSelect,
}: {
  node: any;
  depth: number;
  onSelect: (path: string) => void;
}) {
  const [open, setOpen] = useState(node.isDirectory);
  const { openMenu } = useContextMenu();

  const paddingLeft = depth * 14;

  // -----------------------------
  // DIRECTORY
  // -----------------------------
  if (node.isDirectory) {
    return (
      <div>
        <div
          className="
            flex items-center gap-2 cursor-pointer px-2 py-1 
            rounded-md hover:bg-black/10
          "
          style={{ paddingLeft }}
          onClick={() => setOpen(!open)}
          onContextMenu={(e) =>
            openMenu(e, {
              name: node.name,
              path: node.path,
              isDirectory: true,
            })
          }
        >
          {open ? (
            <FolderOpen size={15} className="text-amber-600" />
          ) : (
            <Folder size={15} className="text-amber-600" />
          )}

          <span className="font-medium text-black">{node.name}</span>
        </div>

        {open &&
          node.children?.map((child: any) => (
            <TreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              onSelect={onSelect}
            />
          ))}
      </div>
    );
  }

  // -----------------------------
  // FILE
  // -----------------------------
  return (
    <div
      className="
        flex items-center gap-2 cursor-pointer px-2 py-1 
        rounded-md hover:bg-black/10
      "
      style={{ paddingLeft }}
      onClick={() => onSelect(node.path)}
      onContextMenu={(e) =>
        openMenu(e, {
          name: node.name,
          path: node.path,
          isDirectory: false,
        })
      }
    >
      {getFileIcon(node.name)}
      <span className="text-black truncate">{node.name}</span>
    </div>
  );
}
