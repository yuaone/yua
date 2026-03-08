"use client";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html>
      <body style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "system-ui" }}>
        <div style={{ textAlign: "center" }}>
          <h1 style={{ fontSize: 48, fontWeight: 700, margin: 0 }}>500</h1>
          <p style={{ fontSize: 16, color: "#6b7280", marginTop: 8 }}>문제가 발생했습니다</p>
          <button
            onClick={() => reset()}
            style={{ marginTop: 16, padding: "8px 24px", borderRadius: 8, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer", fontSize: 14 }}
          >
            다시 시도
          </button>
        </div>
      </body>
    </html>
  );
}
