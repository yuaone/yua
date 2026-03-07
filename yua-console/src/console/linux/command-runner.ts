/**
 * Linux Shell – Command Runner
 * ----------------------------
 * WebSocket 기반 Shell 명령 실행기
 */

import { LinuxConnection } from "./connection";

export class LinuxCommandRunner {
  private conn: LinuxConnection;

  constructor(conn: LinuxConnection) {
    this.conn = conn;
  }

  /**
   * 문자열 명령어를 Linux Shell WS로 전송
   */
  run(cmd: string) {
    this.conn.send(cmd + "\n");
  }

  /**
   * 키 입력 / Raw stream 전송
   */
  write(data: string | Uint8Array) {
    this.conn.send(data);
  }
}
