import { useCallback, useState } from "react";

export function useImageModal() {
  const [src, setSrc] = useState<string | null>(null);

  const open = useCallback((url: string) => {
    setSrc(url);
    document.body.style.overflow = "hidden";
  }, []);

  const close = useCallback(() => {
    setSrc(null);
    document.body.style.overflow = "";
  }, []);

  return {
    src,
    open,
    close,
    isOpen: src !== null,
  };
}
