// 🔒 SSOT FINAL
export interface FactualVisualizationPayload {
  data: number[];
  title?: string;

  /** 출력 품질 */
  dpi?: number;

  /** 특정 포인트 강조 */
  highlight?: {
    x: number;
    y: number;
  };

  /** 소비 목적 */
  purpose?: "REPORT" | "PRESENTATION" | "DEFAULT";
}
