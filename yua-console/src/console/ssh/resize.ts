// src/console/ssh/resize.ts

export function sendResize(ws: WebSocket, cols: number, rows: number) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;

  ws.send(
    JSON.stringify({
      type: "resize",
      cols,
      rows,
    })
  );
}

// 정원의 기존 기능 유지
export function attachResizeListener(conn: any, element: HTMLElement) {
  const observer = new ResizeObserver(() => {
    const width = element.offsetWidth;
    const height = element.offsetHeight;

    const cols = Math.floor(width / 8);
    const rows = Math.floor(height / 17);

    conn.resize(cols, rows);
  });

  observer.observe(element);
  return () => observer.disconnect();
}
