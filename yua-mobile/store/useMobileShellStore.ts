import { useCallback, useState } from "react";

import type { TopPanelType } from "@/hooks/useTopPanel";

export function useMobileShellStore() {
  const [activePanel, setActivePanel] = useState<TopPanelType | null>(null);

  const openPanel = useCallback((panel: TopPanelType) => setActivePanel(panel), []);
  const closePanel = useCallback(() => setActivePanel(null), []);

  return {
    activePanel,
    panelVisible: activePanel !== null,
    openPanel,
    closePanel,
  };
}
