# YUA Billing & Toss Payments 통합 설계 문서

> 작성일: 2026-03-08
> 상태: Draft v1
> 참조: YUA_MULTIPLATFORM_DESIGN.md, yua-backend billing audit

---

## 1. 현재 상태 감사 요약

### 1.1 DB 현황

| DB | 테이블 | 데이터 | 상태 |
|----|--------|--------|------|
| PG `subscriptions` | 있음 (9 cols) | **0건** | 스키마만 존재 |
| PG `workspace_plan_state` | 있음 | 4건 (전부 free) | SSOT tier |
| PG `api_credits` | 있음 | **0건** | 미사용 |
| PG `credit_transactions` | 있음 | **0건** | 미사용 |
| PG `platform_api_keys` | 있음 | **0건** | SDK 키 미발급 |
| MySQL `subscriptions` | 있음 (17 cols) | **0건** | 레거시 |
| MySQL `billing` | 있음 | **0건** | 레거시 |
| MySQL `billing_payments` | 있음 | **0건** | 레거시 |
| MySQL `plans` | 있음 | 4건 | free/pro/business/enterprise |
| MySQL `users` | 있음 | 8명 | 전부 free, credits 0 |
| MySQL `yua_usage_daily` | 있음 | 21건 | **token=0, message만 카운트** |

### 1.2 코드 감사 — Critical Issues

| # | 심각도 | 이슈 | 영향 |
|---|--------|------|------|
| 1 | CRITICAL | **PLAN_PRICE_MAP 이중 정의** — billing-router(49K/99K) vs renewal-worker(55K/140K) | 갱신 시 잘못된 금액 청구 |
| 2 | CRITICAL | **deductCredit() 미호출** — 정의만 있고 어디서도 호출 안 됨 | API 크레딧 차감 불가 |
| 3 | HIGH | **듀얼 DB subscriptions** — MySQL(user_id 키) + PG(workspace_id 키) 동기 없음 | 상태 불일치 |
| 4 | HIGH | **토큰 카운팅 0** — yua_usage_daily에 total_tokens=0으로 기록됨 | 과금 근거 없음 |
| 5 | MEDIUM | **billingBootstrap 추정치 부정확** — perToken 비용 무시 | 비용 미리보기 오류 |
| 6 | MEDIUM | **usage 쿼터 미시행** — BILLING_POLICY 한도 체크 안 됨 | 무제한 사용 |
| 7 | MEDIUM | **sendBillingFailureEmail() 미구현** | 갱신 실패 알림 없음 |

### 1.3 프론트엔드 가격 불일치

| 위치 | Pro | Business | Enterprise |
|------|-----|----------|-----------|
| PricingCard.tsx | ₩19,000 | ₩55,000 | ₩140,000 |
| upgrade/page.tsx | ₩17,000 | ₩55,000 | ₩110,000 |
| billing-router.ts | ₩19,000 | ₩49,000 | ₩99,000 |
| renewal-worker.ts | ₩19,000 | ₩55,000 | ₩140,000 |
| MySQL plans.base_price | ₩10,000 | ₩30,000 | ₩100,000 |

**6곳에서 가격이 전부 다름** — SSOT 통합 필수.

---

## 2. 최종 가격 정책 (SSOT)

### 2.1 원가 분석

**대화당 원가 (2,000 input + 1,000 output tokens 기준)**

| 모델 | 대화당 원가 |
|------|-----------|
| GPT-4o-mini / Haiku | ₩1~3 |
| GPT-4o / Sonnet | ₩22~31 |
| Claude Opus | ₩52 |
| Gemini Flash | ₩0.7 |
| DALL-E 3 (이미지) | ₩60~180/장 |

**모델 믹스별 가중 평균**

| Tier | 모델 믹스 | 가중 평균 대화당 원가 |
|------|----------|---------------------|
| Free/Pro | 70% 경량 + 30% 중급 | **₩7.6** |
| Business | 50% 중급 + 40% 경량 + 10% 프리미엄 | **₩17.0** |
| Enterprise | 40% 중급 + 30% 프리미엄 + 20% 경량 + 10% 특수 | **₩29.7** |

### 2.2 확정 가격표

| Plan | 월 가격 | 일 메시지 | 월 메시지 | API 원가 | 마진 |
|------|---------|----------|----------|---------|------|
| **Free** | ₩0 | 3회 | 30회 | ₩228 | -100% (CAC) |
| **Pro** | **₩14,900** | 15회 | 300회 | ₩2,280 | **84.7%** |
| **Business** | **₩39,000** | 50회 | 1,000회 | ₩17,000 | **56.4%** |
| **Enterprise** | **₩149,000** | 150회 | 3,000회 | ₩89,100 | **40.2%** |

### 2.3 멀티플랫폼 가격 (앱스토어 수수료 반영)

| Plan | Web/Desktop | Android | iOS (1년차 30%) | iOS (2년차+ 15%) |
|------|------------|---------|----------------|-----------------|
| Pro | ₩14,900 | ₩14,900 | ₩19,900 | ₩14,900 |
| Business | ₩39,000 | ₩39,000 | ₩49,000 | ₩39,000 |
| Enterprise | ₩149,000 (Web 전용) | Web 전용 | Web 전용 | Web 전용 |

> iOS 1년차: Apple 30% 수수료 상쇄를 위해 가격 인상
> Enterprise: 앱스토어 결제 불가, Web 직접결제만

### 2.4 경쟁사 대비

| 서비스 | 가격 (₩) | YUA Pro 대비 |
|--------|---------|------------|
| ChatGPT Plus | ₩29,600 | YUA **50% 저렴** |
| Claude Pro | ₩29,600 | YUA **50% 저렴** |
| Gemini Advanced | ₩29,585 | YUA **50% 저렴** |
| YUA Pro | ₩14,900 | — |

차별점: 멀티모델(OpenAI+Claude+Gemini) + 한국어 특화 + Web/Mobile/Desktop 통합

### 2.5 토큰 예산 (멀티플랫폼 설계문서 기준)

| Plan | Per Request | Per Day | Per Month | 5h Window |
|------|------------|---------|-----------|-----------|
| Free | 20K | 100K | 3M | 200K |
| Pro | 72K | 1M | 30M | 2M |
| Business | 140K | 5M | 150M | 10M |
| Enterprise | 240K | Unlimited | Custom | 50M (soft) |

### 2.6 Rate Limiting

| Plan | Per Min | Per Hour |
|------|---------|---------|
| Free | 10 req | 100 req |
| Pro | 30 req | 500 req |
| Business | 60 req | 2,000 req |
| Enterprise | 120 req | Custom |

---

## 3. 토스 페이먼츠 통합 설계

### 3.1 환경

```
TOSS_CLIENT_KEY=test_ck_Z61JOxRQVEm2naK52Dl2VW0X9bAq  (테스트)
TOSS_SECRET_KEY=test_sk_DpexMgkW36PD4GLkXWLBrGbR5ozO  (테스트)
```

라이브 전환 시 `live_ck_` / `live_sk_` 키로 교체만 하면 됨.

### 3.2 결제 플로우 (구독 — 정기결제)

```
┌─────────────────────────────────────────────────────────────┐
│  Client (Web/Mobile/Desktop)                                 │
│                                                              │
│  1. 사용자가 Pro 선택                                         │
│  2. POST /api/billing/create                                 │
│     → { plan: "pro", amount: 14900 }                         │
│     ← { orderId: "YUA_20260308_xxxxx" }                      │
│                                                              │
│  3. 토스 결제위젯 호출 (클라이언트 키 사용)                      │
│     tossPayments.requestPayment("카드", {                     │
│       amount: 14900,                                         │
│       orderId: "YUA_20260308_xxxxx",                          │
│       orderName: "YUA Pro 구독",                              │
│       customerName: "사용자명",                                │
│       successUrl: "https://yuaone.com/billing/success",       │
│       failUrl: "https://yuaone.com/billing/fail",             │
│     })                                                       │
│                                                              │
│  4. 토스 결제창에서 결제 완료                                    │
│     → successUrl?paymentKey=xxx&orderId=xxx&amount=14900      │
│                                                              │
│  5. POST /api/billing/confirm                                │
│     → { paymentKey, orderId, amount, plan: "pro" }           │
│     Backend:                                                  │
│       a. amount === PLAN_PRICE[plan] 검증                     │
│       b. 토스 API confirm 호출                                 │
│       c. MySQL subscriptions INSERT/UPDATE                    │
│       d. PG workspace_plan_state UPSERT tier="pro"            │
│       e. Redis plan 캐시 무효화                                │
│     ← { ok: true, tier: "pro" }                              │
│                                                              │
│  6. 클라이언트 상태 갱신 → Pro 기능 즉시 활성화                    │
└─────────────────────────────────────────────────────────────┘
```

### 3.3 결제 플로우 (빌링키 — 자동결제)

```
┌─────────────────────────────────────────────────────────────┐
│  첫 결제: 빌링키 발급 + 즉시 결제                               │
│                                                              │
│  1. POST /api/billing/create-billing-key                     │
│     → 토스 빌링키 발급 위젯 호출                                │
│     → 카드 등록 → billingKey 반환                              │
│                                                              │
│  2. POST /api/billing/confirm-billing                        │
│     Backend:                                                  │
│       a. 토스 POST /v1/billing/{billingKey}                   │
│          → 즉시 14900원 결제                                   │
│       b. billingKey DB 저장 (암호화)                           │
│       c. next_billing_at = NOW() + 1 MONTH                   │
│       d. subscription 생성                                    │
│                                                              │
│  매월 자동 갱신: subscription-renewal-worker                   │
│       a. next_billing_at <= NOW() 인 구독 조회                 │
│       b. 저장된 billingKey로 토스 자동결제                       │
│       c. 성공 → next_billing_at += 1 MONTH                   │
│       d. 실패 → grace_until = NOW() + 3 DAYS                 │
│       e. 3일 grace 초과 → status = "expired", tier = "free"   │
└─────────────────────────────────────────────────────────────┘
```

### 3.4 웹훅 처리

```
POST /api/billing/webhook
Headers: Toss-Signature: <HMAC-SHA256>

이벤트:
  PAYMENT_CONFIRMED  → 결제 승인 확인
  PAYMENT_CANCELED   → 결제 취소 (환불)
  PAYMENT_FAILED     → 결제 실패
  BILLING_CONFIRMED  → 자동결제 승인
  BILLING_FAILED     → 자동결제 실패

보안:
  - HMAC-SHA256 서명 검증 (TOSS_WEBHOOK_SECRET)
  - Redis NX로 replay 방지 (600초 TTL)
  - 멱등성: orderId + eventId 조합으로 중복 처리 방지
```

### 3.5 플랫폼별 결제 통합

| 플랫폼 | 결제 방식 | 구현 |
|--------|----------|------|
| **yua-web** | 토스 결제위젯 JS SDK | `@tosspayments/tosspayments-sdk` npm |
| **yua-mobile** | WebView 결제창 | `react-native-webview` + successUrl redirect 캡처 |
| **yua-desktop** | BrowserWindow 결제창 | Electron BrowserWindow + `will-navigate` 이벤트 캡처 |
| **CLI** | 브라우저 오픈 | `open` 으로 브라우저 결제 → localhost callback |

#### yua-web 구현

```typescript
// components/billing/TossPaymentButton.tsx
import { loadTossPayments } from "@tosspayments/tosspayments-sdk";

async function handlePayment(plan: string, amount: number) {
  const orderId = await billingCreate({ plan, amount });

  const toss = await loadTossPayments(TOSS_CLIENT_KEY);
  const payment = toss.payment({ customerKey: workspaceId });

  await payment.requestPayment({
    method: "CARD",
    amount: { currency: "KRW", value: amount },
    orderId,
    orderName: `YUA ${plan.toUpperCase()} 구독`,
    successUrl: `${window.location.origin}/billing/success`,
    failUrl: `${window.location.origin}/billing/fail`,
  });
}
```

#### yua-mobile 구현

```typescript
// components/billing/TossPaymentWebView.tsx
<WebView
  source={{ uri: tossPaymentUrl }}
  onNavigationStateChange={(navState) => {
    if (navState.url.includes("/billing/success")) {
      const params = parseQueryString(navState.url);
      confirmPayment(params.paymentKey, params.orderId, params.amount);
    }
    if (navState.url.includes("/billing/fail")) {
      handlePaymentFail();
    }
  }}
/>
```

#### yua-desktop 구현

```typescript
// main/billing-window.ts
const paymentWindow = new BrowserWindow({
  width: 500, height: 700,
  webPreferences: { nodeIntegration: false },
});

paymentWindow.loadURL(tossPaymentUrl);

paymentWindow.webContents.on("will-navigate", (event, url) => {
  if (url.includes("/billing/success")) {
    event.preventDefault();
    const params = new URL(url).searchParams;
    mainWindow.webContents.send("billing:success", {
      paymentKey: params.get("paymentKey"),
      orderId: params.get("orderId"),
      amount: params.get("amount"),
    });
    paymentWindow.close();
  }
});
```

---

## 4. DB 통합 설계

### 4.1 방향: PG 단일 SSOT

MySQL subscriptions → 레거시 유지 (읽기 전용)
PG subscriptions → 신규 SSOT (모든 쓰기)

```sql
-- PG subscriptions 스키마 확장
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS
  billing_key VARCHAR(255);      -- 토스 빌링키 (암호화)
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS
  next_billing_at TIMESTAMPTZ;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS
  grace_until TIMESTAMPTZ;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS
  renewal_attempts INT DEFAULT 0;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS
  scheduled_downgrade_plan VARCHAR(50);
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS
  order_id VARCHAR(255);
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS
  payment_key VARCHAR(255);
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS
  provider VARCHAR(50) DEFAULT 'toss';
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS
  amount INT DEFAULT 0;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS
  paid_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_subscriptions_workspace ON subscriptions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
```

### 4.2 가격 SSOT

```typescript
// src/billing/plan-prices.ts (단일 진실 원천)
export const PLAN_PRICE: Record<string, number> = {
  free: 0,
  pro: 14900,
  business: 39000,
  enterprise: 149000,
};

export const PLAN_LIMITS = {
  free:       { dailyMessages: 3,   monthlyMessages: 30,    dailyTokens: 100_000,   monthlyTokens: 3_000_000 },
  pro:        { dailyMessages: 15,  monthlyMessages: 300,   dailyTokens: 1_000_000, monthlyTokens: 30_000_000 },
  business:   { dailyMessages: 50,  monthlyMessages: 1000,  dailyTokens: 5_000_000, monthlyTokens: 150_000_000 },
  enterprise: { dailyMessages: 150, monthlyMessages: 3000,  dailyTokens: -1,        monthlyTokens: -1 },  // -1 = unlimited
};

export const PLAN_MODELS = {
  free:       ["yua-fast"],
  pro:        ["yua-fast", "yua-normal"],
  business:   ["yua-fast", "yua-normal", "yua-deep", "yua-deep-expanded", "yua-search"],
  enterprise: ["yua-fast", "yua-normal", "yua-deep", "yua-deep-expanded", "yua-search"],
};
```

이 파일 하나만 import해서 사용. 다른 곳에서 가격/한도 상수 정의 금지.

---

## 5. 구현 로드맵

### Phase 1: 기반 정리 (1일)

| # | 작업 | 파일 |
|---|------|------|
| 1-1 | `plan-prices.ts` SSOT 생성 | `src/billing/plan-prices.ts` |
| 1-2 | 모든 PLAN_PRICE_MAP 참조를 SSOT로 교체 | billing-router, renewal-worker, PricingCard, upgrade page |
| 1-3 | PG subscriptions 스키마 확장 (ALTER TABLE) | migration SQL |
| 1-4 | MySQL plans 테이블 가격 업데이트 | `UPDATE plans SET base_price` |
| 1-5 | 토큰 카운팅 수정 (total_tokens=0 버그) | billing-finalize.ts |

### Phase 2: 토스 결제위젯 연동 (2일)

| # | 작업 | 파일 |
|---|------|------|
| 2-1 | `@tosspayments/tosspayments-sdk` 설치 (yua-web) | package.json |
| 2-2 | TossPaymentButton 컴포넌트 | yua-web/components/billing/ |
| 2-3 | /billing/success, /billing/fail 페이지 | yua-web/app/billing/ |
| 2-4 | billing-router.ts confirm에서 실제 토스 API 호출 | billing-router.ts |
| 2-5 | toss-mock.ts fallback 유지 (BILLING_MODE=mock) | toss-mock.ts |

### Phase 3: 자동결제 (빌링키) (1일)

| # | 작업 | 파일 |
|---|------|------|
| 3-1 | 빌링키 발급 라우트 | billing-router.ts |
| 3-2 | 빌링키 자동결제 라우트 | billing-router.ts |
| 3-3 | renewal-worker SSOT 가격 사용 + 실제 토스 호출 | subscription-renewal-worker.ts |
| 3-4 | grace period + expiration 로직 검증 | subscription-expiration-worker.ts |

### Phase 4: 크레딧 시스템 활성화 (1일)

| # | 작업 | 파일 |
|---|------|------|
| 4-1 | deductCredit() 호출 배선 (billing-finalize 후) | credit-check.ts, middleware chain |
| 4-2 | usage 쿼터 체크 미들웨어 | billing-policy 기반 pre-check |
| 4-3 | 5시간 슬라이딩 윈도우 구현 (Redis) | new middleware |
| 4-4 | rate limiting 연동 | Redis sliding window |

### Phase 5: 모바일/데스크톱 결제 (1일)

| # | 작업 | 파일 |
|---|------|------|
| 5-1 | yua-mobile WebView 결제 | TossPaymentWebView.tsx |
| 5-2 | yua-desktop BrowserWindow 결제 | billing-window.ts |
| 5-3 | iOS 가격 차등 로직 | PricingCard 분기 |

### Phase 6: QA + 라이브 전환

| # | 작업 |
|---|------|
| 6-1 | 테스트키로 전체 플로우 E2E 테스트 |
| 6-2 | 웹훅 테스트 (토스 대시보드 → 수동 트리거) |
| 6-3 | 갱신/만료/grace 시나리오 테스트 |
| 6-4 | 라이브키 교체 (.env TOSS_CLIENT_KEY, TOSS_SECRET_KEY) |
| 6-5 | 전자결제 신청 완료 (토스 사업자 심사, 33만원 보증금 납부) |

---

## 6. 미디어 파이프라인 비용

이미지 생성(DALL-E 3)은 media pipeline orchestrator 경유로 이미 동작 중.

| 기능 | 모델 | 원가 | 포함 플랜 |
|------|------|------|----------|
| 이미지 생성 | DALL-E 3 (1024x1024) | ₩60/장 | Pro: 20장/월, Business: 100장/월 |
| 이미지 생성 (HD) | DALL-E 3 (1024x1792) | ₩120/장 | Business+만 |
| TTS | OpenAI TTS-1 | ₩22/1K chars | Pro+ |
| STT | Whisper | ₩9/분 | Pro+ |
| 임베딩 | text-embedding-3-small | ₩0.03/1K tokens | All (내부 메모리용) |

---

## 7. 환경변수 최종 목록

```bash
# 토스 페이먼츠
TOSS_CLIENT_KEY=test_ck_Z61JOxRQVEm2naK52Dl2VW0X9bAq
TOSS_SECRET_KEY=test_sk_DpexMgkW36PD4GLkXWLBrGbR5ozO
TOSS_WEBHOOK_SECRET=                    # 웹훅 시크릿 (토스 대시보드에서 설정)
BILLING_MODE=mock                       # mock | live (기본: mock)

# 라이브 전환 시 교체
# TOSS_CLIENT_KEY=live_ck_xxxxxxxxxxxx
# TOSS_SECRET_KEY=live_sk_xxxxxxxxxxxx
# BILLING_MODE=live
```

---

## 부록 A: 테스트 시나리오

```
1. 구독 생성 (Free → Pro)
   - POST /billing/create → orderId 생성 확인
   - 토스 결제위젯 호출 → 테스트 카드로 결제
   - POST /billing/confirm → workspace_plan_state tier=pro 확인

2. 구독 업그레이드 (Pro → Business)
   - 차액 결제 또는 신규 결제
   - tier 즉시 반영 확인

3. 구독 다운그레이드 (Business → Pro)
   - scheduled_downgrade_plan 설정
   - 다음 결제일에 적용 확인

4. 결제 실패 → Grace Period
   - renewal-worker 실패 시뮬레이션
   - grace_until 설정 확인
   - 3일 후 tier=free 전환 확인

5. 환불
   - POST /billing/refund → 토스 환불 API
   - 상태 변경 확인

6. 웹훅
   - PAYMENT_CONFIRMED → 정상 처리
   - 중복 웹훅 → 멱등성 확인 (Redis NX)

7. 멀티플랫폼
   - Web에서 결제 → Mobile에서 tier 반영 확인
   - Desktop에서 결제 → Web에서 tier 반영 확인
```

## 부록 B: iOS 앱스토어 결제 전략

```
Apple 가이드라인 3.1.1:
  - 디지털 콘텐츠/구독은 반드시 인앱결제 사용
  - 외부 결제 링크 제공 가능 (한국 전기통신사업법 적용)
  - 단, Apple 수수료 별도

전략 옵션:
  A) iOS에서 인앱결제만 허용 → ₩19,900 (30% 수수료 반영)
  B) 한국법 활용 → 외부 결제 링크 허용 (Apple 동의 필요)
  C) Reader Rule → AI 도구는 해당 없음 (콘텐츠 소비 앱이 아님)

추천: 옵션 A (안전). iOS ₩19,900, 나머지 ₩14,900.
Small Business Program 적용 시 (연 매출 $1M 이하) 15%로 감소.
```
