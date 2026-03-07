# 📄 /docs/ssot/decision-ssot.md

## 🔒 YUA Decision SSOT — Core Principles (v1.0)

---

## 1. Decision 철학 (Rule > ML)

YUA의 모든 판단은 **Rule 기반 결정**에서 시작한다.  
Rule은 시스템이 명시적으로 정의한 논리적 경계이며,  
어떠한 경우에도 확률적 모델(ML)은 이 경계를 침범할 수 없다.

Machine Learning은 판단 주체가 아니다.  
ML은 오직 **판단을 보조하는 신호(signal)**만을 제공한다.

### 불변 원칙
- Rule은 결정한다
- ML은 제안한다
- ML은 Rule을 뒤집을 수 없다

이 구조는 성능이나 유연성보다  
**판단의 안정성과 일관성**을 최우선으로 하기 위해 설계되었다.

---

## 2. HOLD의 정의

HOLD는 실패도, 미완도 아니다.  
HOLD는 **이론적으로 정당한 판단 결과**다.

YUA에서 HOLD는 다음 상태를 의미한다:
- 판단에 필요한 정보가 충분하지 않다
- 결과가 입력 변화에 민감하거나 불안정하다
- 승인(APPROVE) 또는 거절(REJECT) 모두 위험하다

이 경우 YUA는 의도적으로 결정을 유예한다.

### 불변 원칙
- 불확실하면 항상 HOLD를 선택한다
- HOLD는 시스템의 보호 장치다
- HOLD는 이후 판단을 위해 되돌릴 수 있다

---

## 3. ML의 역할 제한

Machine Learning은 판단을 생성하지 않는다.  
ML의 유일한 역할은 **confidence(확신도) 추정**이다.

ML은 다음을 수행할 수 없다:
- 최종 verdict 결정
- Rule 결과 변경
- 위험한 방향으로의 판단 이동

ML은 오직 Rule이 APPROVE인 경우에만,  
사전에 정의된 threshold 이상일 때 **보조 신호로만 작동**한다.

### 불변 원칙
- ML은 보조 레이어다
- ML은 독립적인 판단 권한을 갖지 않는다
- ML은 항상 Rule 뒤에 위치한다

---

## 4. 사고흐름 비노출 원칙

YUA는 내부 사고 과정(reasoning)을  
어떠한 형태로도 외부에 노출하지 않는다.

외부로 전달되는 정보는 다음으로 제한된다:
- 최종 verdict (APPROVE / HOLD / REJECT)
- 비구조화된 결과 요약(narration)

다음 정보는 절대 노출되지 않는다:
- 내부 Rule 평가 과정
- ML feature 또는 가중치
- confidence 산출 근거
- 중간 추론 단계

### 불변 원칙
- 사고흐름은 내부 전용이다
- 설명을 위해 사고를 노출하지 않는다
- 출력은 항상 결과 중심이다

---

## 5. Safe by Default 원칙

YUA의 모든 판단은 **되돌릴 수 있어야 한다**.

시스템은 다음 상황에서 항상 보수적으로 동작한다:
- 예외 상황
- 데이터 누락
- ML 실패 또는 비정상 종료
- 외부 의존성 장애

이 경우 YUA는 Rule-only 모드로 자동 전환되며,  
가능한 가장 안전한 verdict를 선택한다.

### 불변 원칙
- 안전하지 않으면 진행하지 않는다
- 판단보다 보호가 우선이다
- 모든 verdict는 reversible하다

---

## 🔐 SSOT 적용 범위

이 문서는 YUA의 모든 판단 시스템에 적용되는  
**상위 SSOT(Single Source of Truth)**이다.

- 모든 Rule Engine
- 모든 ML 보조 판단
- 모든 Stream / Narration 출력
- 모든 향후 버전 및 확장

이 원칙은 버전, 환경, 도메인과 무관하게  
항상 동일하게 적용된다.
