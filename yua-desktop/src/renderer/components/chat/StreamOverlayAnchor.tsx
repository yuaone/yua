export default function StreamOverlayAnchor() {
  /**
   * SSOT:
   * StreamOverlay는 AssistantMessage bubble 내부에서만 (active message에 1회) 렌더한다.
   * 기존 상위 앵커는 중복 렌더의 원인이므로 noop 처리.
   *
   * (원하면 이 파일/사용처 자체를 삭제해도 됨)
   */
  return null;
}
