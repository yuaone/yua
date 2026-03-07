"use client";

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
  type MouseEvent as ReactMouseEvent,
} from "react";

type MenuTarget = {
  path: string;
  name: string;
  isDirectory: boolean;
};

type MenuState = {
  visible: boolean;
  x: number;
  y: number;
  target: MenuTarget | null;
};

type MenuContextValue = {
  menu: MenuState;
  openMenu: (e: ReactMouseEvent, target: MenuTarget) => void;
  closeMenu: () => void;
};

const ContextMenuCtx = createContext<MenuContextValue | null>(null);

export function ContextMenuProvider({ children }: { children: ReactNode }) {
  const [menu, setMenu] = useState<MenuState>({
    visible: false,
    x: 0,
    y: 0,
    target: null,
  });

  function openMenu(e: ReactMouseEvent, target: MenuTarget) {
    e.preventDefault();
    setMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      target,
    });
  }

  function closeMenu() {
    setMenu((prev) => ({ ...prev, visible: false }));
  }

  return (
    <ContextMenuCtx.Provider value={{ menu, openMenu, closeMenu }}>
      {children}
    </ContextMenuCtx.Provider>
  );
}

export function useContextMenu() {
  const ctx = useContext(ContextMenuCtx);
  if (!ctx) {
    throw new Error("useContextMenu must be used inside ContextMenuProvider");
  }
  return ctx;
}
