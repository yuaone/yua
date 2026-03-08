import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

type SidebarContextValue = {
  isOpen: boolean;
  collapsed: boolean;
  openSidebar: () => void;
  closeSidebar: () => void;
  toggleCollapse: () => void;
};

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) {
    throw new Error("useSidebar must be used within SidebarProvider");
  }
  return ctx;
}

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(true);
  const [collapsed, setCollapsed] = useState(false);

  const openSidebar = useCallback(() => setIsOpen(true), []);
  const closeSidebar = useCallback(() => setIsOpen(true), []); // Desktop: sidebar always visible, closeSidebar is no-op
  const toggleCollapse = useCallback(() => setCollapsed((v) => !v), []);

  return (
    <SidebarContext.Provider
      value={{ isOpen, collapsed, openSidebar, closeSidebar, toggleCollapse }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export { SidebarContext };
