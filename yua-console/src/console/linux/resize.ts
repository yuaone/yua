/**
 * Linux Shell – Resize Controller
 */

import { LinuxConnection } from "./connection";

export function sendResize(conn: LinuxConnection, cols: number, rows: number) {
  if (!conn) return;

  const payload = JSON.stringify({
    type: "resize",
    cols,
    rows,
  });

  conn.send(payload);
}
