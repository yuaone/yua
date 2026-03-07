export function autoScrollToBottom(container: HTMLElement | null) {
    if (!container) return;
    container.scrollTo({
      top: container.scrollHeight,
      behavior: "smooth",
    });
  }
  