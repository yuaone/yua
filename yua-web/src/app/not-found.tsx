export default function NotFound() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "system-ui" }}>
      <div style={{ textAlign: "center" }}>
        <h1 style={{ fontSize: 48, fontWeight: 700, margin: 0 }}>404</h1>
        <p style={{ fontSize: 16, color: "#6b7280", marginTop: 8 }}>페이지를 찾을 수 없습니다</p>
      </div>
    </div>
  );
}
