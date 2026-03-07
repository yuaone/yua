  // 🔥 YUA AnswerBuffer — STREAM FINAL OUTPUT CAPTURE (SSOT)
  // --------------------------------------------------------
  // ✔ Stream token 복제용 (publish 영향 ❌)
  // ✔ DONE 이후 AnswerState 분석 전용
  // ✔ threadId 단위 버퍼
  // ✔ 메모리 누수 방지 (consume 시 제거)

  export class AnswerBuffer {
    private static buffers = new Map<number, string>();
    private static started = new Map<number, boolean>();
     private static strict = new Map<number, boolean>(); // 🔥 overflow/불안정 보호용

       /**
   * ✅ SSOT: DONE 이후 "최종 답변"은 heuristics 없이 그대로 캡처
   * - append()는 token chunk용 (start guard 포함)
   * - DONE 시점 fullAnswer는 이미 완성 텍스트이므로 bypass
   */
  static captureFinal(threadId: number, text: string) {
    if (!text) return;
    this.buffers.set(threadId, text);
    this.started.set(threadId, true);
  }

  /** TokenSafety overflow 등에서 stricter start 조건 */
  static setStrictMode(threadId: number, value: boolean) {
    this.strict.set(threadId, value);
  }
    /** token / chunk 누적 */
    static append(threadId: number, chunk: string) {
      if (!chunk) return;
    const trimmed = chunk.trim();


    // 🔒 SSOT: math escape residue guard
    if (/^W(to|frac|dfrac|int|le|ge|cdot|displaystyle)\b/.test(trimmed)) {
      return;
    }

    // 🔒 SSOT 1: 시작 전에는 메타/헤더 전부 차단
    if (!this.started.get(threadId)) {
     if (
        /^이 문단의 기능은 /.test(trimmed) ||
        /^가정:/.test(trimmed) ||
        /^이 가정이 깨질 수 있는 경우:/.test(trimmed) ||
        /^목표:/.test(trimmed)
      ) {
        return;
      }
        // 🔒 숫자 섹션 찌꺼기 차단
  if (/^\*{0,2}[0-9]+\.\s*$/.test(trimmed)) {
    return;
  }
      // 메타 블록, 지시문, 내부 헤더 차단
      if (
        trimmed.startsWith("[") ||
        trimmed.startsWith("##") ||
        trimmed.startsWith("###") ||
        trimmed.startsWith("-") ||
        trimmed.startsWith("*")
      ) {
        return;
      }


        // 🔒 SSOT: 시스템 가이드/톤 문장 차단
      if (
        /(설명은|답변은|전반적인 말투는|다음으로 생각해볼|자연스럽게 시작)/.test(
          trimmed
        )
      ) {
        return;
      }

     // 3️⃣ 의미 없는 전이 문장 차단
      if (
        /^(좋다|좋아요|그럼|그러면|다음은|이제|그래서|우선|먼저)$/i.test(
          trimmed
        )
      ) {
        return;
      }

      // 4️⃣ 시작 조건 (SSOT SAFE)
      const isStrict = this.strict.get(threadId) === true;

      const hasEnoughLength = trimmed.length >= (isStrict ? 40 : 20);

      const hasSentenceBoundary =
        /[.!?。！？]$/.test(trimmed) ||
        /(이다|합니다|된다|한다|임|함)$/.test(trimmed) ||
        /\b(is|are|means|will|does)\b/i.test(trimmed);

      if (hasEnoughLength && hasSentenceBoundary) {
        this.started.set(threadId, true);
      } else {
        return;
      }
    }

      const prev = this.buffers.get(threadId) ?? "";
      this.buffers.set(threadId, prev + chunk);
    }

    /** DONE 시 단 1회 호출 */
    static consume(threadId: number): string {
      const text = this.buffers.get(threadId) ?? "";
      this.buffers.delete(threadId);
      this.started.delete(threadId);
      this.strict.delete(threadId);
      return text;
    }

    /** READ-ONLY: narration patch 용 (consume ❌) */
  static peekReadOnly(threadId: number): string | undefined {
    return this.buffers.get(threadId);
  }

    /** 비정상 종료 대비 */
    static clear(threadId: number) {
      this.buffers.delete(threadId);
      this.started.delete(threadId);
      this.strict.delete(threadId);
    }
  }
