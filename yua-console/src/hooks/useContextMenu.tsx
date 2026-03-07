"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
  MouseEvent,
} from "react";

/* -------------------------------------------------------
   1) 두 가지 타입 모두 허용하도록 Union Type 작성
------------------------------------------------------- */
export type RawContextPayload =
  | { label: string; action: () => void }[]
  | {
      name: string;
      path: string;
      isDirectory: boolean;
    };

/* -------------------------------------------------------
   2) 실제 메뉴 렌더링은 menu.items: {label, action}[] 로 통일
------------------------------------------------------- */
interface MenuState {
  x: number;
  y: number;
  visible: boolean;
  items: { label: string; action: () => void }[];
}

interface ContextMenuContextType {
  menu: MenuState;
  openMenu: (e: MouseEvent, payload: RawContextPayload) => void;
  closeMenu: () => void;
}

const ContextMenuContext = createContext<ContextMenuContextType | null>(null);

export function useContextMenu() {
  return useContext(ContextMenuContext)!;
}

/* -------------------------------------------------------
   변환 로직:
   - FileTree: {name, path, isDirectory} → "일반 메뉴 배열"로 변환
   - 기존 메뉴는 그대로 items 로 사용
------------------------------------------------------- */
function normalizePayload(payload: RawContextPayload) {
  if (Array.isArray(payload)) {
    // 기존 메뉴 형태 그대로 반환
    return payload;
  }

  // FileTree에서 넘긴 형태: {name, path, isDirectory}
  const { name, path, isDirectory } = payload;

  const baseActions: { label: string; action: () => void }[] = [
    {
      label: isDirectory ? `📁 ${name} 열기` : `📄 ${name} 열기`,
      action: () => console.log("open:", path),
    },
    {
      label: "✏ 이름 변경",
      action: () => console.log("rename:", path),
    },
    {
      label: "🗑 삭제",
      action: () => console.log("delete:", path),
    },
  ];

  if (!isDirectory) {
    baseActions.push({
      label: "💻 터미널에서 열기",
      action: () => console.log("open in terminal:", path),
    });
  }

  return baseActions;
}

/* -------------------------------------------------------
   Provider
------------------------------------------------------- */
export function ContextMenuProvider({ children }: { children: ReactNode }) {
  const [menu, setMenu] = useState<MenuState>({
    x: 0,
    y: 0,
    visible: false,
    items: [],
  });

  const openMenu = useCallback(
    (e: MouseEvent, payload: RawContextPayload) => {
      e.preventDefault();

      const normalized = normalizePayload(payload);

      setMenu({
        x: e.clientX,
        y: e.clientY,
        visible: true,
        items: normalized,
      });
    },
    []
  );

  const closeMenu = useCallback(() => {
    setMenu((m) => ({ ...m, visible: false }));
  }, []);

  return (
    <ContextMenuContext.Provider value={{ menu, openMenu, closeMenu }}>
      {children}
    </ContextMenuContext.Provider>
  );
}
