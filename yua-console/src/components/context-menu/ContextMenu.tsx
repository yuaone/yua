"use client";

import { useContextMenu } from "@/components/context-menu/ContextMenuProvider";
import { FolderPlus, FilePlus, Pencil, Trash2 } from "lucide-react";
import { useEffect, useRef } from "react";

export default function ContextMenu() {
  const { menu, closeMenu } = useContextMenu();
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onPointerDownCapture = (e: PointerEvent) => {
      const el = menuRef.current;
      if (!el) return;
      if (el.contains(e.target as Node)) return; // ✅ 메뉴 내부 클릭은 닫지 않음
      closeMenu();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMenu();
    };

    // 🔥 capture 단계에서 outside만 닫기 (React onClick 씹힘 방지)
    window.addEventListener("pointerdown", onPointerDownCapture, true);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDownCapture, true);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [closeMenu]);

  if (!menu.visible || !menu.target) return null;

  const { x, y, target } = menu;
  const isDir = target.isDirectory;

  const items = [
    ...(isDir
      ? [
          { icon: <FilePlus size={14} />, label: "New File", action: "new_file" },
          { icon: <FolderPlus size={14} />, label: "New Folder", action: "new_folder" },
        ]
      : []),
    { icon: <Pencil size={14} />, label: "Rename", action: "rename" },
    {
      icon: <Trash2 size={14} className="text-red-500" />,
      label: "Delete",
      action: "delete",
      danger: true,
    },
  ];

  return (
    <div
    ref={menuRef}
      className="
        fixed z-[5000]
        min-w-[170px] py-2
        bg-white/80 backdrop-blur-xl
        border border-black/10 shadow-xl rounded-lg
        animate-fade-in
      "
      style={{ top: y, left: x }}
    >
      {items.map((item) => (
        <MenuItem key={item.label} item={item} target={target} onClose={closeMenu} />
      ))}
    </div>
  );
}

function MenuItem({
  item,
  target,
  onClose,
}: {
  item: any;
  target: any;
  onClose: () => void;
}) {
  const handle = async () => {
    onClose();

    switch (item.action) {
      case "new_file": {
        const name = prompt("New file name?");
        if (!name) return;
        await fetch("/api/console/fs/create", {
          method: "POST",
          body: JSON.stringify({ folder: `${target.path}/${name}`, type: "file" }),
        });
        break;
      }
      case "new_folder": {
        const name = prompt("New folder name?");
        if (!name) return;
        await fetch("/api/console/fs/create", {
          method: "POST",
          body: JSON.stringify({ folder: `${target.path}/${name}`, type: "folder" }),
        });
        break;
      }
      case "rename": {
        const newName = prompt("Rename to:", target.name);
        if (!newName) return;
        await fetch("/api/console/fs/rename", {
          method: "POST",
          body: JSON.stringify({
            oldName: target.path,
            newName: target.path.replace(target.name, newName),
          }),
        });
        break;
      }
      case "delete": {
        if (!confirm(`Delete "${target.name}" ?`)) return;
        await fetch("/api/console/fs/delete", {
          method: "POST",
          body: JSON.stringify({ target: target.path }),
        });
        break;
      }
    }

    window.dispatchEvent(new CustomEvent("fs:reload"));
  };

  return (
    <button
      onClick={handle}
      className={` 
        w-full px-3 py-2 flex items-center gap-2 text-sm text-black
        hover:bg-black/5 transition
        ${item.danger ? "text-red-600 font-medium" : ""}
      `}
    >
      {item.icon}
      {item.label}
    </button>
  );
}
