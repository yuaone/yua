# YUA Platform 프론트엔드-백엔드 통합 감사 보고서

> 감사일: 2026-03-08
> 감사 범위: yua-platform 전체 페이지, yua-backend 관련 라우터, yua-shared 빌링 타입, 설계 문서(YUA_PLATFORM_ADMIN_DESIGN.md)

---

## 1. 페이지별 API 연동 현황

### 1.1 API 호출 매칭 표

| 페이지 | 경로 | 프론트에서 호출하는 API | 백엔드 존재 여부 | 연동 상태 |
|--------|------|------------------------|:---:|:---:|
| Dashboard | `/dashboard` | 없음 (MOCK 데이터만 사용) | - | MOCK |
| API Keys | `/keys` | `GET /api/platform/keys` | O | **연동 완료** |
| | | `POST /api/platform/keys` | O | **연동 완료** |
| | | `DELETE /api/platform/keys/:id` | O | **연동 완료** |
| Playground | `/playground` | `POST /api/platform/test` | O | **연동 완료** |
| Usage | `/usage` | 없음 (MOCK_DAILY_USAGE, MOCK_USAGE, MOCK_MODEL_BREAKDOWN) | - | MOCK |
| Billing Overview | `/billing` | 없음 (MOCK_PLAN) | - | MOCK |
| Billing API | `/billing/api` | 없음 (MOCK_PLAN, MOCK_TRANSACTIONS) | - | MOCK |
| Billing Subscription | `/billing/subscription` | 없음 (MOCK_PLAN, MOCK_BILLING_HISTORY) | - | MOCK |
| Docs | `/docs` | 없음 (정적 문서) | - | 해당 없음 |
| Login | `/login` | 없음 (Firebase Auth TODO 상태) | - | **미구현** |
| Signup | `/signup` | 없음 (Firebase Auth TODO 상태) | - | **미구현** |
| Root | `/` | 없음 (redirect to /dashboard) | - | 해당 없음 |

### 1.2 요약

- **실제 API 연동 완료**: 4개 endpoint (keys CRUD + playground test)
- **MOCK 데이터만 사용**: 6개 페이지 (dashboard, usage, billing 3개, keys 일부)
- **미구현**: 2개 페이지 (login, signup)의 Firebase Auth

---

## 2. 미구현 API 목록 (프론트에서 호출하지만 백엔드에 없는 endpoint)

현재 프론트엔드가 호출하는 모든 실제 API(`fetchApiKeys`, `createApiKey`, `revokeApiKey`, `testApiCall`)는 백엔드에 존재한다.

그러나 **프론트에서 호출해야 하지만 아직 MOCK으로 처리 중인** API가 다수 존재:

| 필요한 API | 사용처 (페이지) | 백엔드 존재 여부 | 비고 |
|------------|----------------|:---:|------|
| `GET /api/billing/v2/credits` | `/billing`, `/billing/api`, `/dashboard` | O | 존재하지만 프론트 미연동 |
| `GET /api/billing/v2/transactions` | `/billing/api` | O | 존재하지만 프론트 미연동 |
| `GET /api/billing/v2/subscription` | `/billing/subscription` | O | 존재하지만 프론트 미연동 |
| `POST /api/billing/v2/purchase-credits` | `/billing/api` | O | 존재하지만 프론트 미연동 |
| `POST /api/billing/v2/subscribe` | `/billing/subscription` | O | 존재하지만 프론트 미연동 |
| `POST /api/billing/v2/cancel-subscription` | `/billing/subscription` | O | 존재하지만 프론트 미연동 |
| `GET /api/usage/daily` (또는 유사) | `/usage`, `/dashboard` | **X** | 사용량 통계 API 자체가 없음 |
| `GET /api/usage/by-model` (또는 유사) | `/usage` | **X** | 모델별 사용량 API 없음 |
| `GET /api/usage/recent-calls` | `/dashboard` | **X** | 최근 API 호출 목록 API 없음 |
| Firebase Auth login/signup | `/login`, `/signup` | **X** (프론트 코드 자체가 TODO) | Firebase 초기화 미완 |

---

## 3. 미사용 API 목록 (백엔드에 있지만 프론트에서 사용하지 않는 endpoint)

| 백엔드 endpoint | 라우터 | 프론트 사용 여부 | 비고 |
|-----------------|--------|:---:|------|
| `GET /api/billing/v2/credits` | billing-v2-router | X | 프론트가 MOCK_PLAN 사용 |
| `GET /api/billing/v2/transactions` | billing-v2-router | X | 프론트가 MOCK_TRANSACTIONS 사용 |
| `GET /api/billing/v2/subscription` | billing-v2-router | X | 프론트가 MOCK_PLAN 사용 |
| `POST /api/billing/v2/purchase-credits` | billing-v2-router | X | 프론트가 toast만 표시 |
| `POST /api/billing/v2/subscribe` | billing-v2-router | X | 프론트가 toast만 표시 |
| `POST /api/billing/v2/cancel-subscription` | billing-v2-router | X | 프론트에 취소 UI 자체 없음 |
| `POST /api/v1/chat/completions` | v1-completions-router | 간접 | playground /test가 내부 호출 |

> billing-v2-router의 **6개 endpoint 모두** 백엔드에 완전히 구현되어 있으나, 프론트에서 단 하나도 호출하지 않고 있다. 모든 결제/구독/크레딧 데이터가 하드코딩된 MOCK이다.

---

## 4. 결제 시스템 정합성

### 4.1 Toss 연동 현황

| 구성 요소 | 설계 (Section 5, 6) | 구현 현황 | 정합성 |
|-----------|---------------------|-----------|:---:|
| Toss 결제 승인 | 실 Toss SDK | `TossMock` (500ms delay + 하드코딩 success) | MOCK |
| Toss 구독 생성 | 실 Toss Billing | `TossMock.createSubscription` (mock) | MOCK |
| Toss 구독 취소 | 실 Toss Billing | `TossMock.cancelSubscription` (mock) | MOCK |
| Toss 환불 | 실 Toss API | `TossMock.refund` (mock, 호출하는 곳 없음) | MOCK |
| Toss Widget (프론트) | Toss 결제창 연동 | **미구현** (handlePurchase = toast만 표시) | 미구현 |
| Toss customerKey | Toss Billing Key | 백엔드 subscribe에서 요구하지만 프론트 미연동 | 미구현 |

### 4.2 크레딧 충전 구현 현황

| 항목 | 설계 | 구현 |
|------|------|------|
| 크레딧 패키지 UI | Section 6.4의 4단계 패키지 | 프론트에 하드코딩 (Starter/Developer/Business/Enterprise) |
| 충전 결제 플로우 | Toss Widget -> paymentKey -> POST /billing/v2/purchase-credits | 프론트: toast 표시만, 백엔드: API 존재 + DB 트랜잭션 구현 |
| 잔액 조회 | GET /billing/v2/credits | 백엔드 구현 O, 프론트 미연동 (MOCK_PLAN.creditBalance=47.35 하드코딩) |
| 거래 내역 | GET /billing/v2/transactions (페이징) | 백엔드 구현 O, 프론트 미연동 (MOCK_TRANSACTIONS 하드코딩) |
| 선불 잔고 체크 | credit-check.ts 미들웨어 | 백엔드 구현 O (402 반환), v1-completions-router에서 사용 여부 미확인 |

### 4.3 구독 관리 구현 현황

| 항목 | 설계 | 구현 |
|------|------|------|
| 플랜 선택 UI | Free/Pro/Team | 프론트에 하드코딩 ($0/$20/$30), billingInterval 토글 존재 |
| 구독 변경 플로우 | POST /billing/v2/subscribe | 프론트: toast만, 백엔드: API 존재 + DB upsert 구현 |
| 구독 취소 | POST /billing/v2/cancel-subscription | 프론트: handleDowngrade에서 toast만, 취소 UI 없음 |
| 현재 구독 조회 | GET /billing/v2/subscription | 백엔드 구현 O, 프론트 미연동 (MOCK_PLAN.tier="pro" 하드코딩) |
| 결제 이력 | 별도 API 필요 (subscription_invoices) | 백엔드 미구현, 프론트 MOCK_BILLING_HISTORY 하드코딩 |

### 4.4 크레딧 차감 파이프라인

| 항목 | 상태 |
|------|------|
| credit-check.ts (선불 잔고 미들웨어) | 구현 완료 (api_key_id 기반, 402 반환) |
| deductCredit() 함수 | 구현 완료 (atomic transaction, credit_transactions + api_credits) |
| v1-completions-router 연계 | creditCheck 미들웨어가 v1 라우터 미들웨어 체인에 포함되지 않음 -- 확인 필요 |

---

## 5. API 키 시스템 정합성

### 5.1 설계 (Section 7) vs 실제 구현 비교

| 항목 | 설계 (Section 7.1~7.3) | 프론트 구현 | 백엔드 구현 | Gap |
|------|------------------------|------------|------------|-----|
| 키 형식 | `yua_live_*` / `yua_test_*` | N/A | `yua_sk_*` (단일) | test/live 분리 없음 |
| 키 생성 | POST /platform/keys | 구현 O (모달 + 복사 UI) | 구현 O (SHA-256 해싱) | **정합** |
| 키 목록 | GET /platform/keys | 구현 O (fetchApiKeys) | 구현 O | **정합** |
| 키 폐기 | DELETE /platform/keys/:id | 구현 O (확인 모달) | 구현 O (soft delete) | **정합** |
| 키 로테이션 | POST /key/:id/rotate | 미구현 | 미구현 | 설계 Phase 2 |
| 스코프 | `['chat', 'files', 'memory']` | 미구현 | 미구현 | 설계 Phase 2 |
| 만료일 | `expires_at` | 미구현 | 미구현 | 설계 Phase 2 |
| Rate Limit (키별) | 플랜별 RPM/TPM | 미구현 | IP 글로벌만 | 설계 Phase 2 |
| 환경 분리 (test/live) | `environment` 컬럼 | 미구현 | 미구현 | 설계 Phase 3 |
| IP 화이트리스트 | auth 미들웨어에서 검증 | 미구현 | 미구현 | 설계 S3 |
| API 테스트 | POST /platform/test | 구현 O (playground) | 구현 O (내부 proxy) | **정합** |

### 5.2 보안 이슈 현황 (Section 7.4)

| # | 이슈 | 설계 문서 Status | 현재 상태 |
|---|------|-----------------|-----------|
| S1 | keys.json 평문 저장 | CRITICAL | platform의 api-keys-router.ts는 PostgreSQL만 사용 -- keys.json 참조 없음 |
| S2 | 실행 전 잔고 체크 없음 | CRITICAL | credit-check.ts 구현됨, 라우터 연결은 별도 확인 필요 |
| S3 | IP 화이트리스트 미적용 | CRITICAL | 미구현 |
| S4 | Firestore에 rawKey 저장 | CRITICAL | platform의 api-keys-router.ts에는 없음 (기존 레거시 이슈) |

### 5.3 프론트-백엔드 데이터 구조 비교

| 필드 | 프론트 (ApiKey 인터페이스) | 백엔드 DB 반환 | 정합성 |
|------|---------------------------|----------------|:---:|
| id | number | number (SERIAL) | O |
| name | string | string | O |
| key_prefix | string | string | O |
| key | string (optional, 생성 시만) | string (생성 시만) | O |
| status | "active" \| "revoked" | "active" \| "revoked" | O |
| last_used_at | string \| null | TIMESTAMPTZ \| null | O |
| created_at | string | TIMESTAMPTZ | O |
| revoked_at | string \| null | TIMESTAMPTZ \| null | O |

> API 키 CRUD는 **프론트-백엔드 완전 정합**. 유일하게 정상적으로 연동된 기능이다.

---

## 6. 디자인 정합성 -- 설계 문서 대비 구현 완성도

### 6.1 Section 2 (yua-platform 라우트 설계) vs 실제 구현

| 설계 라우트 | 구현 여부 | 실제 데이터 | 완성도 |
|------------|:---:|:---:|:---:|
| `/` (랜딩) | redirect to /dashboard | N/A | 50% (랜딩 페이지 없음) |
| `/login` | O | Firebase TODO (stub) | 30% |
| `/signup` | O | Firebase TODO (stub) | 30% |
| `/dashboard` | O | MOCK | 70% (UI 완성, 데이터 MOCK) |
| `/keys` | O | **실제 API 연동** | **95%** |
| `/usage` | O | MOCK | 60% (UI 완성, 데이터 MOCK) |
| `/billing/api` | O | MOCK | 50% (UI 완성, 결제 미연동) |
| `/billing/api/history` | X | - | 0% |
| `/billing/subscription` | O | MOCK | 50% (UI 완성, 결제 미연동) |
| `/billing/subscription/history` | X | - | 0% |
| `/docs` | O | 정적 | **90%** (6개 섹션 완성) |
| `/docs/quickstart` | 통합 | docs 내 섹션 | 포함됨 |
| `/docs/chat-api` | 통합 | docs 내 섹션 | 포함됨 |
| `/docs/sdk` | 통합 | docs 내 섹션 | 포함됨 |
| `/docs/webhooks` | X | - | 0% |
| `/playground` | O | **실제 API 연동** | **90%** |
| `/models` | X | - | 0% |
| `/settings` | X | - | 0% |

### 6.2 Section 5 (결제 시스템) 구현 완성도

| 항목 | 설계 | 프론트 | 백엔드 | 총 완성도 |
|------|:---:|:---:|:---:|:---:|
| DB 스키마 | 100% | - | ~60% (테이블 일부 다름) | 60% |
| Toss 결제 | 100% | 0% | Mock 100% | 30% |
| 크레딧 충전 | 100% | 0% (MOCK) | 100% (API 완성) | 50% |
| 구독 관리 | 100% | 0% (MOCK) | 100% (API 완성) | 50% |
| 결제 이력 | 100% | 0% (MOCK) | 50% (credit_tx만) | 25% |

### 6.3 Section 7 (API 키 시스템) 구현 완성도

| 항목 | 설계 | 구현 | 완성도 |
|------|------|------|:---:|
| 기본 CRUD (Phase 0) | O | O | **100%** |
| 보안 (Phase 1) | 5개 CRITICAL | 1~2개 해결 | 30% |
| 고급 기능 (Phase 2) | 로테이션/스코프/Rate Limit | 미구현 | 0% |
| 운영 기능 (Phase 3) | 대시보드/웹훅/자동충전 | 미구현 | 0% |

### 6.4 Section 8 (기술 스택) 정합성

| 항목 | 설계 | 실제 |
|------|------|------|
| Next.js 14 (App Router) | O | O (14.2.35) |
| Tailwind | O | O |
| shadcn/ui | O | X (직접 구현 컴포넌트) |
| Framer Motion | O | X (CSS transition만) |
| Zustand 5 | O | X (useState만, 스토어 없음) |
| Firebase Auth | O | X (TODO stub만) |
| MDX docs | O | X (React 컴포넌트로 직접 구현) |
| Toss Payments | O | X (프론트 미연동) |

### 6.5 전체 완성도 요약

| 영역 | 완성도 |
|------|:---:|
| API 키 관리 (CRUD + UI) | **95%** |
| API 플레이그라운드 | **90%** |
| API 문서 | **85%** |
| 대시보드 UI | **70%** (데이터 MOCK) |
| 사용량 페이지 UI | **60%** (데이터 MOCK) |
| 결제/과금 프론트-백엔드 연동 | **5%** (UI만, 연동 0) |
| 인증 (Firebase Auth) | **5%** (stub만) |
| 백엔드 결제 API | **80%** (6개 endpoint 완성) |
| **전체 평균** | **약 45%** |

---

## 7. 권장 수정 사항

### P0 -- CRITICAL (출시 차단)

| # | 항목 | 상세 | 파일 |
|---|------|------|------|
| P0-1 | **Firebase Auth 연동** | login/signup 페이지의 TODO를 실제 Firebase Auth로 교체. Auth state 관리 (Zustand store 또는 Context). 미인증 유저 리다이렉트 처리. | `/yua-platform/src/app/login/page.tsx`, `/signup/page.tsx` |
| P0-2 | **크레딧 잔액 실시간 연동** | MOCK_PLAN을 제거하고 `GET /api/billing/v2/credits` 호출로 교체. dashboard, billing 3개 페이지 모두 적용. | `/yua-platform/src/lib/platform-api.ts`, 각 billing 페이지 |
| P0-3 | **구독 상태 실시간 연동** | `GET /api/billing/v2/subscription` 호출로 현재 플랜 표시. MOCK_PLAN.tier 하드코딩 제거. | `/yua-platform/src/app/(dashboard)/billing/subscription/page.tsx` |
| P0-4 | **Toss 결제 위젯 연동** | 크레딧 충전/구독 변경 시 Toss 결제창을 띄우고 paymentKey를 받아 백엔드 API 호출하는 플로우 구현. | `/billing/api/page.tsx`, `/billing/subscription/page.tsx` |
| P0-5 | **credit-check 미들웨어 v1 연결 확인** | v1-completions-router가 creditCheck 미들웨어를 거치는지 확인. 미적용 시 무제한 무료 API 호출 가능. | `/yua-backend/src/routes/index.ts` |

### P1 -- HIGH (출시 후 2주 이내)

| # | 항목 | 상세 |
|---|------|------|
| P1-1 | **사용량 통계 API 구현** | 일별/모델별 API 사용량 집계 endpoint 필요. 프론트 usage 페이지에서 MOCK 제거 후 연동. |
| P1-2 | **거래 내역 연동** | billing/api 페이지에서 `GET /api/billing/v2/transactions` 호출. MOCK_TRANSACTIONS 제거. |
| P1-3 | **구독 결제 이력 API** | subscription_invoices 테이블 조회 API 구현. 프론트 MOCK_BILLING_HISTORY 제거. |
| P1-4 | **Zustand 도입** | 인증 상태, 크레딧 잔액, 구독 정보를 전역 스토어로 관리. 현재 모든 페이지가 독립적 useState만 사용. |
| P1-5 | **Dashboard 실데이터 연동** | RECENT_ACTIVITY, stat cards를 실제 API 데이터로 교체. |
| P1-6 | **yua-shared 빌링 타입 활용** | `Subscription`, `ApiCredit`, `CreditTransaction` 등 yua-shared에 이미 정의된 타입을 프론트에서 import하여 사용. 현재 platform-api.ts에서 독립적으로 타입 재정의 중. |

### P2 -- MEDIUM (출시 후 1개월 이내)

| # | 항목 | 상세 |
|---|------|------|
| P2-1 | **미구현 페이지 추가** | `/models` (모델 목록 + 가격표), `/settings` (계정 설정), `/billing/api/history`, `/billing/subscription/history` |
| P2-2 | **Docs Webhook 섹션** | `/docs` 페이지에 Webhook 문서 추가 (설계 문서 Section 2에 명시됨) |
| P2-3 | **랜딩 페이지** | `/` 경로를 redirect가 아닌 API 소개 + CTA 랜딩으로 변경 |
| P2-4 | **API 키 고급 기능** | 키 로테이션, 스코프 설정, 만료일 설정 UI (설계 Phase 2) |
| P2-5 | **shadcn/ui + Framer Motion** | 설계에 명시된 UI 라이브러리를 실제 도입하여 컴포넌트 품질 향상 |
| P2-6 | **DB 스키마 정합** | 설계 문서(Section 5.2, 7.2)의 스키마와 실제 테이블 구조 차이 조정 (api_key_id 기반 vs user_id 기반, 컬럼명 불일치 등) |
| P2-7 | **Toss Mock 제거** | toss-mock.ts를 실제 Toss Payments SDK로 교체 |

---

## 부록: 핵심 파일 경로

### yua-platform (프론트)
- `/home/dmsal020813/projects/yua-platform/src/lib/platform-api.ts` -- API 헬퍼 + MOCK 데이터 SSOT
- `/home/dmsal020813/projects/yua-platform/src/app/(dashboard)/keys/page.tsx` -- API 키 관리 (연동 완료)
- `/home/dmsal020813/projects/yua-platform/src/app/(dashboard)/playground/page.tsx` -- 플레이그라운드 (연동 완료)
- `/home/dmsal020813/projects/yua-platform/src/app/(dashboard)/billing/api/page.tsx` -- 크레딧 충전 (MOCK)
- `/home/dmsal020813/projects/yua-platform/src/app/(dashboard)/billing/subscription/page.tsx` -- 구독 관리 (MOCK)

### yua-backend (백엔드)
- `/home/dmsal020813/projects/yua-backend/src/routes/api-keys-router.ts` -- Platform API Key CRUD
- `/home/dmsal020813/projects/yua-backend/src/routes/billing-v2-router.ts` -- 결제 V2 (6개 endpoint)
- `/home/dmsal020813/projects/yua-backend/src/routes/v1-completions-router.ts` -- OpenAI 호환 API
- `/home/dmsal020813/projects/yua-backend/src/billing/toss-mock.ts` -- Toss Mock
- `/home/dmsal020813/projects/yua-backend/src/middleware/credit-check.ts` -- 크레딧 잔고 검증

### yua-shared (공유 타입)
- `/home/dmsal020813/projects/yua-shared/src/billing/billing-types.ts` -- Subscription, ApiCredit, CreditTransaction 타입

### 설계 문서
- `/home/dmsal020813/projects/YUA_PLATFORM_ADMIN_DESIGN.md` -- 통합 설계 (18개 섹션)
