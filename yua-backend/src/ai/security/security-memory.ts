// 🧠 Security Memory — Enterprise Version
// ---------------------------------------------------------
// ✔ 파일 자동 생성 / 폴더 자동 생성
// ✔ JSON Lines (NDJSON) 저장 방식
// ✔ 동시 쓰기 안전 (write queue)
// ✔ 로그 롤링(일별) 지원
// ✔ MySQL / Elasticsearch 연동 포인트 제공
// ✔ 서버 크래시 없이 안정적
// ✔ 404 공격 패턴 추적 기능 추가 (increment404 / get404)
// ---------------------------------------------------------

import fs from "fs";
import path from "path";

export const SecurityMemory = {
  logDir: path.join(process.cwd(), "logs/security"),
  writeQueue: Promise.resolve(),

  // ---------------------------------------------
  // 🔥 404 공격 패턴 검출용 메모리 저장소
  // ---------------------------------------------
  _404Map: new Map<string, { count: number; last: number }>(),
  _404_TTL: 2 * 60 * 1000, // 2분

  ensureDir() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  },

  getLogFileName() {
    const date = new Date().toISOString().split("T")[0];
    return path.join(this.logDir, `security-${date}.log`);
  },

  // ---------------------------------------------------------
  // 🔥 핵심: write queue 방식 → 쓰기 충돌 방지
  // ---------------------------------------------------------
  async log(entry: any) {
    this.ensureDir();

    const fileName = this.getLogFileName();
    const payload =
      JSON.stringify({
        time: new Date().toISOString(),
        ...entry,
      }) + "\n";

    this.writeQueue = this.writeQueue.then(() => {
      return new Promise<void>((resolve) => {
        fs.appendFile(fileName, payload, (err) => {
          if (err) console.error("SecurityMemory write error:", err);
          resolve();
        });
      });
    });

    return this.writeQueue;
  },

  // ---------------------------------------------------------
  // 🛡️ 위험도/유저/IP 기반 저장
  // ---------------------------------------------------------
  recordEvent(event: {
    type: string;
    userId?: string;
    ip?: string;
    risk?: number;
    detail?: any;
  }) {
    return this.log(event);
  },

  // ---------------------------------------------------------
  // 🏦 MySQL 연동 (옵션)
  // ---------------------------------------------------------
  async saveToMySQL(pool: any, entry: any) {
    try {
      await pool.query(
        "INSERT INTO security_logs (type, user_id, ip, risk, detail) VALUES (?, ?, ?, ?, ?)",
        [
          entry.type || null,
          entry.userId || null,
          entry.ip || null,
          entry.risk || 0,
          JSON.stringify(entry.detail || {}),
        ]
      );
    } catch (err) {
      console.error("[SecurityMemory MySQL Error]", err);
    }
  },

  // ---------------------------------------------------------
  // 🔥 404 공격 추적: 증가
  // ---------------------------------------------------------
  increment404(ip: string) {
    const now = Date.now();
    const data = this._404Map.get(ip);

    if (!data) {
      this._404Map.set(ip, { count: 1, last: now });
      return 1;
    }

    // TTL 만료되면 초기화
    if (now - data.last > this._404_TTL) {
      this._404Map.set(ip, { count: 1, last: now });
      return 1;
    }

    const updated = { count: data.count + 1, last: now };
    this._404Map.set(ip, updated);

    return updated.count;
  },

  // ---------------------------------------------------------
  // 🔥 404 공격 추적: 조회
  // ---------------------------------------------------------
  get404(ip: string) {
    const now = Date.now();
    const data = this._404Map.get(ip);

    if (!data) return 0;

    // TTL 지나면 자동 삭제 (+0 반환)
    if (now - data.last > this._404_TTL) {
      this._404Map.delete(ip);
      return 0;
    }

    return data.count;
  },
};
