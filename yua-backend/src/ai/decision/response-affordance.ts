// src/ai/decision/response-affordance.ts
export type ResponseAffordanceVector = {
  /** 설명을 계속해도 되는 정도 */
  describe: number;   // 0~1

  /** 예시/확장 허용 */
  expand: number;     // 0~1

  /** 분기 제안 가능성 */
  branch: number;     // 0~1

  /** 사용자에게 되묻기 허용 */
  clarify: number;    // 0~1

  /** 명시적 결론 허용 */
  conclude: number;   // 0~1
};
