import { useCallback, useMemo, useState } from "react";

export type TopPanelType = "sidebar" | "activity" | "think" | "photoLibrary" | "auth";

export function useTopPanel() {
  const [activePanel, setActivePanel] = useState<TopPanelType | null>(null);

  const open = useCallback((panel: TopPanelType) => {
    setActivePanel(panel);
  }, []);

  const close = useCallback(() => {
    setActivePanel(null);
  }, []);

  const toggle = useCallback((panel: TopPanelType) => {
    setActivePanel((prev) => (prev === panel ? null : panel));
  }, []);

  const visible = activePanel !== null;

  return useMemo(
    () => ({
      activePanel,
      visible,
      open,
      close,
      toggle,
    }),
    [activePanel, visible, open, close, toggle]
  );
}
