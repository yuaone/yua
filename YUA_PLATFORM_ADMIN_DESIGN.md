# YUA Platform + Admin 통합 설계 문서

> 작성일: 2026-03-07 (Updated: 2026-03-08)
> 상태: Draft v3 — 데스크탑 앱 & 다운로드 허브 추가

---

## 1. 레포 구조 변경

```
현재                          변경 후
yua-console  ──────→  yua-platform   (개발자 SDK 플랫폼)
(없음)       ──────→  yua-admin      (내부 관리자 시스템)
```

### 1.1 yua-platform (구 yua-console)
- **대상**: 외부 개발자, B2B 고객
- **목적**: YUA API 키 발급, SDK 문서, 사용량/과금, 플레이그라운드
- **삭제 대상**: 터미널(xterm), 인스턴스 관리, SSH, DB 직접 접근

### 1.2 yua-admin (신규)
- **대상**: 내부 직원 (슈퍼어드민, 관리자, 서포트, 빌링매니저)
- **목적**: IAM, 유저/워크스페이스 관리, 매출 대시보드, Support AI, 시스템 모니터링

---

## 2. yua-platform 라우트 설계

```
/                           → 랜딩 (API 소개, 시작하기 CTA)
/login                      → 로그인 (Firebase Auth)
/signup                     → 개발자 회원가입

/dashboard                  → 대시보드 (API 호출 요약, 잔여 크레딧, 최근 활동)
/keys                       → API 키 관리 (생성/삭제/로테이션)
/usage                      → 사용량 상세 (모델별, 일별, 프로젝트별)

/billing/api                → API 결제 (크레딧 충전, 종량제 설정)
/billing/api/history        → API 결제 이력
/billing/subscription       → 구독 플랜 업그레이드 (Free/Pro/Team)
/billing/subscription/history → 구독 결제 이력

/docs                       → API 문서 포탈
/docs/quickstart            → 빠른 시작
/docs/chat-api              → Chat API 레퍼런스
/docs/sdk                   → SDK (Python, Node, REST)
/docs/webhooks              → Webhook 설정

/playground                 → API 테스트 플레이그라운드
/models                     → 모델 목록 + 가격표
/settings                   → 계정 설정, 팀 멤버 관리
```

---

## 3. yua-admin 라우트 설계

```
/login                      → 관리자 로그인 (IAM 인증)

/                           → 대시보드 (KPI: DAU, 매출, API호출, 에러율)
/users                      → 유저 관리 (검색, 상세, 정지/복구)
/users/[id]                 → 유저 상세 (프로필, 사용량, 결제, 스레드)
/workspaces                 → 워크스페이스 관리

/iam                        → IAM 관리
/iam/members                → 직원 목록 (초대/삭제)
/iam/roles                  → 역할 관리 (권한 매트릭스)

/revenue                    → 매출 대시보드 (API + 구독 통합)
/revenue/api                → API 매출 상세
/revenue/subscription       → 구독 매출 상세
/revenue/invoices           → 인보이스 관리

/support                    → Support AI 대시보드
/support/tickets            → 티켓 목록
/support/tickets/[id]       → 티켓 상세 (AI 응답 히스토리)
/support/settings           → FAQ/에스컬레이션 설정

/system                     → 시스템 모니터링 (PM2, DB, Redis)
/models                     → AI 모델 설정/비용 관리
/logs                       → 감사 로그 (관리자 행동 기록)
```

---

## 4. IAM (Identity & Access Management)

### 4.1 역할 체계

| 역할 | 코드 | 설명 |
|------|------|------|
| 슈퍼어드민 | `superadmin` | 모든 권한 + IAM 관리 + 역할 부여 |
| 관리자 | `admin` | 유저/워크스페이스 관리, 매출 조회 |
| 서포트 에이전트 | `support_agent` | 티켓 관리, 유저 조회 (수정 불가) |
| 빌링 매니저 | `billing_manager` | 매출/결제/인보이스 관리 |
| 뷰어 | `viewer` | 읽기 전용 (대시보드, 로그 조회) |

### 4.2 권한 매트릭스

| 리소스 | superadmin | admin | support_agent | billing_manager | viewer |
|--------|:---:|:---:|:---:|:---:|:---:|
| IAM 관리 | RW | - | - | - | - |
| 유저 CRUD | RW | RW | R | - | R |
| 매출 대시보드 | RW | R | - | RW | R |
| 티켓 관리 | RW | RW | RW | - | R |
| 시스템 설정 | RW | R | - | - | - |
| 모델 설정 | RW | RW | - | - | R |
| 감사 로그 | R | R | - | - | R |

### 4.3 DB 스키마

```sql
-- 관리자 계정 (Firebase Auth 연동)
CREATE TABLE admin_users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_uid VARCHAR(128) UNIQUE NOT NULL,
  email       VARCHAR(255) UNIQUE NOT NULL,
  name        VARCHAR(100) NOT NULL,
  role        VARCHAR(30) NOT NULL DEFAULT 'viewer',
  status      VARCHAR(20) NOT NULL DEFAULT 'active',  -- active | suspended | invited
  invited_by  UUID REFERENCES admin_users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 감사 로그
CREATE TABLE admin_audit_log (
  id          BIGSERIAL PRIMARY KEY,
  admin_id    UUID NOT NULL REFERENCES admin_users(id),
  action      VARCHAR(100) NOT NULL,   -- e.g. 'user.suspend', 'role.assign'
  target_type VARCHAR(50),             -- e.g. 'user', 'workspace', 'ticket'
  target_id   VARCHAR(255),
  meta        JSONB DEFAULT '{}',
  ip_address  INET,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 5. 결제 시스템 분리 설계

### 5.1 왜 분리하는가

| 구분 | API 결제 | 구독 결제 |
|------|----------|----------|
| **매출 인식** | 사용 시점 (종량) | 결제 시점 (선불) |
| **과금 단위** | 토큰 (1M 단위) | 월/연 고정 |
| **환불 정책** | 미사용 크레딧 환불 | 기간 비례 환불 |
| **결제 수단** | 카드, 인보이스, 크레딧 | 카드, 앱내결제 |
| **대상** | 개발자 (B2B) | 일반 유저 (B2C) |
| **세금** | B2B 세금계산서 | B2C 부가세 |

### 5.2 DB 스키마

> **Cross-DB 참조 전략 (SSOT)**:
> - `user_id`는 **INT (MySQL users.id auto_increment)** 로 통일. 모든 테이블에서 INT 사용.
> - `firebase_uid (VARCHAR 128)`는 MySQL `users.firebase_uid` 컬럼에만 저장, 인증 연결용.
> - DB 간 FK 불가하므로 application-level에서 참조 무결성 보장.
> - 유저 삭제 시 backend API에서 cascade로 관련 과금/구독 레코드 soft delete 처리.
>
> **3-DB 아키텍처**:
> - Firebase Auth: 인증 SSOT (UID, email, provider)
> - MySQL (yuaai): 유저 SSOT (users, yua_usage_daily, yua_usage_monthly, api_keys_v2, subscriptions)
> - PostgreSQL: 워크스페이스/메모리 + **Admin Analytics Layer** (admin_user_stats, admin_usage_hourly)
>
> **Admin Dashboard용 Analytics Layer**:
> PostgreSQL에 admin_* 테이블을 두고, Background Sync (매시간)로 MySQL 데이터를 집계.
> Admin 쿼리는 단일 PostgreSQL 조회로 처리 (cross-DB JOIN 제거, 300ms → 50ms).

```sql
-- 공통: 결제 수단
CREATE TABLE payment_methods (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     INT NOT NULL,              -- MySQL users.id (SSOT)
  type        VARCHAR(20) NOT NULL,   -- 'card' | 'bank' | 'iap'
  provider    VARCHAR(30),            -- 'toss' | 'apple' | 'google'
  provider_id VARCHAR(255),           -- Toss paymentKey / Apple transactionId 등
  last4       VARCHAR(4),
  is_default  BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- API 크레딧 (yua-platform) — 섹션 7.5 api_key_credits와 통합, 이 테이블이 SSOT
CREATE TABLE api_credits (
  id          SERIAL PRIMARY KEY,
  user_id     INT NOT NULL,              -- MySQL users.id (SSOT)
  workspace_id VARCHAR(255),
  balance     DECIMAL(12,4) NOT NULL DEFAULT 0,    -- USD 단위
  reserved    DECIMAL(12,4) NOT NULL DEFAULT 0,    -- 실행 중 예약금
  total_topup DECIMAL(12,4) NOT NULL DEFAULT 0,
  total_spent DECIMAL(12,4) NOT NULL DEFAULT 0,
  last_topup_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, workspace_id)
);

-- API 크레딧 트랜잭션 이력
CREATE TABLE api_credit_transactions (
  id          SERIAL PRIMARY KEY,
  user_id     INT NOT NULL,              -- MySQL users.id (SSOT)
  workspace_id VARCHAR(255),
  type        VARCHAR(20) NOT NULL,   -- 'topup' | 'deduct' | 'refund' | 'bonus'
  amount      DECIMAL(12,4) NOT NULL,
  balance_after DECIMAL(12,4) NOT NULL,
  description VARCHAR(255),           -- "Developer 패키지 $50" | "NORMAL 1회 호출"
  toss_payment_key VARCHAR(255),      -- 충전 시 결제 키
  api_key_hash VARCHAR(255),          -- 차감 시 사용된 키
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_credit_tx_user ON api_credit_transactions(user_id, created_at);

-- API 사용량 (분 단위 집계)
CREATE TABLE api_usage (
  id          BIGSERIAL PRIMARY KEY,
  user_id     INT NOT NULL,              -- MySQL users.id (SSOT)
  api_key_id  UUID NOT NULL,
  model       VARCHAR(50) NOT NULL,   -- 'gpt-4o' | 'claude-sonnet-4-6' 등
  input_tokens  INT NOT NULL DEFAULT 0,
  output_tokens INT NOT NULL DEFAULT 0,
  cost_cents    INT NOT NULL DEFAULT 0,  -- 원가 (센트)
  price_cents   INT NOT NULL DEFAULT 0,  -- 청구가 (마진 포함)
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_api_usage_user_date ON api_usage(user_id, created_at);

-- 구독 (yua-web/mobile)
CREATE TABLE subscriptions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     INT NOT NULL,              -- MySQL users.id (SSOT)
  plan        VARCHAR(20) NOT NULL,   -- 'free' | 'pro' | 'team'
  interval    VARCHAR(10) NOT NULL,   -- 'monthly' | 'yearly'
  status      VARCHAR(20) NOT NULL,   -- 'active' | 'canceled' | 'past_due' | 'trialing'
  toss_billing_key VARCHAR(255),
  current_period_start TIMESTAMPTZ,
  current_period_end   TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 구독 결제 이력
CREATE TABLE subscription_invoices (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     INT NOT NULL,              -- MySQL users.id (SSOT)
  subscription_id UUID REFERENCES subscriptions(id),
  amount      INT NOT NULL,           -- 센트 단위
  currency    VARCHAR(3) DEFAULT 'USD',
  status      VARCHAR(20) NOT NULL,   -- 'paid' | 'failed' | 'refunded'
  toss_payment_key VARCHAR(255),       -- 인보이스 결제 paymentKey
  paid_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

### 5.3 Admin 매출 대시보드 쿼리 구조

```
/admin/revenue
  ├─ 총 매출 = API 매출 + 구독 매출
  ├─ API 매출: SUM(api_usage.price_cents) GROUP BY day/month
  ├─ 구독 매출: SUM(subscription_invoices.amount) GROUP BY day/month
  ├─ 마진: 총 매출 - 총 원가 (api_usage.cost_cents + LLM 비용)
  └─ 차트: 일별/월별 추이, 모델별 비중, 플랜별 비중
```

---

## 6. YUA API 1회 호출당 과금 설계

### 6.1 Backend 실제 사용 모델 + 원가 (2026.03 기준)

> 소스: openai-runtime.ts MODEL_BY_MODE, title-worker.ts, memory-embedding-generator.ts

#### 메인 채팅 모델 (openai-runtime.ts:297-304)

| YUA 모드 | 실제 모델 | 원가 Input/1M | 원가 Output/1M |
|----------|-----------|---:|---:|
| FAST | gpt-5-mini | $0.25 | $2.00 |
| NORMAL | gpt-5.2-chat-latest | $1.75 | $14.00 |
| SEARCH | gpt-5.2-chat-latest | $1.75 | $14.00 |
| DEEP | gpt-5.2 | $1.75 | $14.00 |
| RESEARCH | gpt-5.2-chat-latest | $1.75 | $14.00 |
| BENCH | gpt-5.2-chat-latest | $1.75 | $14.00 |

> **Note**: BENCH 모드는 내부 벤치마크/테스트 전용이며, 외부 API로 노출되지 않음. 과금 대상 아님.

#### 보조 모델 (내부 오버헤드)

| 용도 | 모델 | 원가/1M |
|------|------|---:|
| 스레드 타이틀 생성 | gpt-4.1-mini | In $0.40 / Out $1.60 |
| 메모리 임베딩 | text-embedding-3-large | $0.13 (input only) |
| 벡터 검색/dedup | text-embedding-3-small | $0.02 (input only) |

### 6.2 YUA API 1회 호출 — 내부 원가 분해

#### 구성 요소 (1회 호출 시 backend에서 발생하는 전체 토큰)

```
YUA API 1회 호출
│
├─ [1] 시스템 프롬프트 (SYSTEM_CORE_FINAL)        ~600 input tokens (항상)
├─ [2] 개발자 힌트 (userName + memoryContext)      ~200 input tokens (있을 때)
├─ [3] 언어 힌트 (reasoning language)              ~100 input tokens (DEEP만)
├─ [4] 유저 메시지                                  가변 (유저 입력)
├─ [5] 메인 LLM 응답                               가변 (모델 출력)
├─ [6] 도구 연속 호출 (tool continuation)           0~5회 추가 라운드
├─ [7] 타이틀 생성 (gpt-4.1-mini)                  ~100 in + ~30 out (첫 메시지만)
├─ [8] 메모리 임베딩 (text-embedding-3-large)       ~200 tokens (커밋 시)
└─ [9] 벡터 검색 (text-embedding-3-small)           ~100 tokens (메모리 조회 시)
```

#### 시나리오별 1회 호출 원가 계산

**A. FAST 모드 — 짧은 질문 (gpt-5-mini)**
```
유저 input: 200 tokens
시스템 오버헤드: 600 tokens
총 input: 800 tokens x $0.25/1M = $0.0002
output: 256 tokens x $2.00/1M = $0.0005
타이틀: (100 in x $0.40 + 30 out x $1.60) / 1M = $0.0001
────────────────────────────────────
총 원가: ~$0.0008 (0.08센트)
```

**B. NORMAL 모드 — 일반 대화 (gpt-5.2-chat-latest)**
```
유저 input: 500 tokens
시스템 오버헤드: 800 tokens
총 input: 1,300 tokens x $1.75/1M = $0.0023
output: 1,500 tokens x $14.00/1M = $0.0210
타이틀: $0.0001
임베딩: $0.0001
────────────────────────────────────
총 원가: ~$0.0235 (2.35센트)
```

**C. DEEP 모드 — 심층 분석 (gpt-5.2, reasoning)**
```
유저 input: 1,000 tokens
시스템 오버헤드: 900 tokens (+ 언어 힌트)
총 input: 1,900 tokens x $1.75/1M = $0.0033
output: 4,000 tokens x $14.00/1M = $0.0560
continuation 1회: input 3,000 x $1.75/1M + output 2,000 x $14/1M = $0.0333
타이틀 + 임베딩: $0.0002
────────────────────────────────────
총 원가: ~$0.0928 (9.28센트)
```

**D. RESEARCH 모드 — 웹 검색 (gpt-5.2-chat-latest, 현재 1 segment)**
```
유저 input: 800 tokens
시스템 + 검색 context: 5,000 tokens (웹 결과 포함)
총 input: 5,800 tokens x $1.75/1M = $0.0102
output: 5,000 tokens x $14.00/1M = $0.0700
타이틀 + 임베딩: $0.0002
────────────────────────────────────
총 원가: ~$0.0804 (8.04센트)

⚠️ RESEARCH 모드는 현재 미구현 — 나중에 연동 예정.
   멀티턴 segment 로직 (execution-engine.ts:646-652) 추가 필요.
```

### 6.3 YUA API 과금 모델 — "유저 가시 토큰 + 오버헤드 마진"

> 과금 방식: 유저에게 보이는 input/output 토큰만 과금, 내부 오버헤드(시스템 프롬프트, 타이틀, 임베딩)는 마진에 포함
>
> **Continuation 과금 정책**: DEEP/RESEARCH에서 tool 호출이나 자동 continuation이 발생하면,
> continuation으로 생성된 output 토큰도 유저에게 과금됨.
> 즉 최종 응답의 **전체 output 토큰** = 초기 output + continuation output 합산하여 과금.
> (continuation의 input은 내부 오버헤드로 처리, 마진에 포함)

#### YUA API 가격표 (1회 호출당)

| YUA 모드 | 유저에게 과금 기준 | YUA 판매가 Input/1M | YUA 판매가 Output/1M | 최소 과금 |
|----------|-------------------|---:|---:|---:|
| **FAST** | 유저 input + output | $0.50 | $4.00 | $0.001 (0.1센트) |
| **NORMAL** | 유저 input + output | $4.00 | $28.00 | $0.005 (0.5센트) |
| **SEARCH** | 유저 input + output | $5.00 | $28.00 | $0.01 (1센트) |
| **DEEP** | 유저 input + output | $5.00 | $35.00 | $0.02 (2센트) |
| **RESEARCH** | 유저 input + output | $5.00 | $35.00 | $0.03 (3센트) |

#### 마진 검증 (시나리오별)

| 시나리오 | 원가 | YUA 청구가 | 마진 | 마진율 |
|----------|-----:|----------:|-----:|-------:|
| FAST 짧은 질문 (200in/256out) | $0.0008 | $0.0011 (최소) | $0.0003 | 27% |
| NORMAL 일반 대화 (500in/1500out) | $0.0235 | $0.0440 | $0.0205 | 47% |
| DEEP 심층 분석 (1000in/4000+2000out) | $0.0928 | $0.2150 | $0.1222 | 57% |
| RESEARCH 웹검색 (800in/5000+4000out) | $0.1404 | $0.3190 | $0.1786 | 56% |

> FAST: 최소 과금이 마진 보장 (절대금액 작아서 최소 과금 필수)
> NORMAL: 마진 47% — 가장 수익성 높음 (주력 모드)
> DEEP/RESEARCH: 마진 56~57% — continuation 포함해도 오버헤드 마진으로 흡수, 프리미엄 모드

### 6.4 크레딧 충전 패키지

| 패키지 | 가격 | 크레딧 | 보너스 | NORMAL 호출 약 |
|--------|-----:|-------:|-------:|---------------:|
| Starter | $10 | $10 | - | ~230회 |
| Developer | $50 | $55 | +10% | ~1,250회 |
| Business | $200 | $230 | +15% | ~5,200회 |
| Enterprise | $1,000 | $1,200 | +20% | ~27,000회 |

> NORMAL 1회 평균 과금 ~$0.044 기준

### 6.5 구독 플랜 (yua-web/mobile)

| 플랜 | 월간 | 연간 (월 환산) | 포함 사항 |
|------|-----:|---------------:|-----------|
| Free | $0 | $0 | 30 msg/day, FAST만, 기본 기능 |
| Pro | $20 | $16/mo ($192/yr) | 무제한 msg, NORMAL+DEEP+SEARCH, 파일분석, 메모리 |
| Team | $30/seat | $25/seat/mo | Pro + RESEARCH, 팀 워크스페이스, 공유 프로젝트 |

> **모바일 IAP**: App Store / Google Play 인앱결제는 앱스토어 출시 후 Phase 5에서 연동 예정.
> payment_methods.provider에 'apple' | 'google' 지원 구조는 확보되어 있음.
> 수수료(Apple 30%, Google 15~30%) 반영한 별도 가격 테이블 필요.

### 6.6 구독 원가 시뮬레이션 (월 1,000명 Pro)

```
가정: Pro 유저 평균 20 msg/day, 70% NORMAL + 20% DEEP + 10% FAST

일 원가/유저:
  NORMAL 14회 x $0.024 = $0.336
  DEEP    4회 x $0.093 = $0.372
  FAST    2회 x $0.001 = $0.002
  일 합계: $0.710

월 원가/유저: $0.710 x 30 = $21.30
월 매출/유저: $20.00
────────────────────────────────────
단독 적자: -$1.30/유저 (-6.5%)

해결 전략:
1. FAST 라우팅 비율 올리기 — 단순 질문 자동 감지 → FAST (원가 1/30)
2. 프롬프트 캐싱 — 반복 시스템 프롬프트 90% 할인 → input 원가 ~40% 절감
3. 실제 사용 패턴 — 평균 유저는 10-15 msg/day (20은 파워유저)
4. API 매출 크로스보전 — B2B API 마진으로 보전

현실 추정 (캐싱 + 실사용 10msg/day):
  월 원가/유저: ~$8.50
  월 매출/유저: $20.00
  마진: $11.50 (57.5%)
```

### 6.7 Hero Pricing Card 표시 기준

> yua-web/mobile landing + yua-platform 가격 페이지에 표시할 내용

```
┌──────────────────────────────────────────────┐
│  YUA API Pricing                             │
│                                              │
│  FAST    $0.50 / $4.00  per 1M tokens        │
│  NORMAL  $4.00 / $28.00 per 1M tokens        │
│  DEEP    $5.00 / $35.00 per 1M tokens        │
│                                              │
│  최소 과금: 호출당 $0.001 ~ $0.03            │
│  일반 대화 1회 평균: ~$0.04 (~50원)          │
│                                              │
│  [크레딧 충전] [무료 체험]                    │
└──────────────────────────────────────────────┘
```

---

## 7. API 키 시스템

### 7.1 키 구조

```
yua_live_a1b2c3d4e5f6...    (프로덕션 키)
yua_test_x9y8z7w6v5u4...    (테스트 키 — 과금 안 됨, rate limit 있음)
```

### 7.2 DB 스키마

```sql
CREATE TABLE api_keys (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     INT NOT NULL,              -- MySQL users.id (SSOT)
  name        VARCHAR(100) NOT NULL,          -- "My Production Key"
  key_prefix  VARCHAR(20) NOT NULL,           -- "yua_live_a1b2" (표시용)
  key_hash    VARCHAR(255) NOT NULL UNIQUE,   -- SHA-256 해시 (저장용)
  environment VARCHAR(10) NOT NULL,           -- 'live' | 'test'
  scopes      TEXT[] DEFAULT '{}',            -- ['chat', 'files', 'memory']
  rate_limit  INT DEFAULT 60,                 -- req/min
  last_used   TIMESTAMPTZ,
  expires_at  TIMESTAMPTZ,
  revoked_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

### 7.3 Rate Limiting

| 플랜 | RPM (req/min) | TPM (tokens/min) | 동시 요청 |
|------|---:|---:|---:|
| Free (테스트) | 20 | 40K | 2 |
| Starter | 60 | 200K | 5 |
| Developer | 300 | 1M | 20 |
| Business | 1,000 | 5M | 50 |
| Enterprise | Custom | Custom | Custom |

### 7.4 백엔드 감사 결과 — 현재 구현 vs 설계 Gap (2026.03.08)

> 소스: `auth-or-apikey.ts`, `api-key-router.ts`, `api-key-controller.ts`, `check-usage.ts`, `billing-engine.ts`, `cost-policy.ts`, `rate-limit.ts`

#### 현재 구현 상태

| 항목 | 설계 (7.1~7.3) | 현재 백엔드 | Gap |
|------|----------------|-------------|-----|
| 키 형식 | `yua_live_*` / `yua_test_*` | `yua_sk_*` (단일) | test/live 분리 없음 |
| 해싱 | SHA-256 | SHA-256 (솔트 없음) | 솔트 추가 필요 |
| 저장소 | api_keys (단일 테이블) | **3중복**: keys.json + MySQL api_keys_v2 + Firestore api_keys | SSOT 통일 필요 |
| 스코프 | `['chat', 'files', 'memory']` | 없음 (모든 키 = user role) | 미구현 |
| 만료/로테이션 | `expires_at`, `revoked_at` | `active` 플래그만 | 미구현 |
| Rate Limit | 키별 RPM/TPM | IP 기반 글로벌만 (500ms/5burst) | 키별 미구현 |
| 워크스페이스 바인딩 | `user_id` | `user_id`만 (워크스페이스 격리 없음) | `workspace_id` 추가 필요 |

#### CRITICAL 보안 이슈

| # | 이슈 | 파일 | 영향 | 해결 |
|---|------|------|------|------|
| S1 | **keys.json 평문 저장** | `api-key-router.ts` | raw 키 파일시스템 노출 | keys.json 제거, MySQL SSOT |
| S2 | **실행 전 잔고 체크 없음** | `check-usage.ts` | 크레딧 없이 무한 호출 가능 | 선불 크레딧 미들웨어 추가 |
| S3 | **IP 화이트리스트 미적용** | `auth-or-apikey.ts` | 스키마에만 존재, 실제 검증 안 함 | auth 미들웨어에 IP 검증 추가 |
| S4 | **Firestore에 rawKey 저장** | `api-key-router.ts` | 해싱 무력화 | rawKey 필드 제거 |

### 7.5 SDK 과금 — OpenAI Runtime 연계 설계

> 현재 백엔드는 `openai-runtime.ts`에서 `response.completed` 이벤트로 실제 토큰 추출 →
> `billing-finalize.ts`에서 `cost_unit` 계산 → `yua_usage_daily`에 누적.
> SDK API Key 사용자도 **동일 파이프라인**을 타므로 별도 과금 시스템 불필요.

#### 과금 흐름 (1회 호출)

```
[SDK 유저] API 호출 (x-api-key 헤더)
    |
    v
[auth-or-apikey.ts] 키 검증 → user_id 해석
    |
    v
[credit-check.ts] (NEW) 선불 잔고 확인 → 부족 시 402 반환
    |
    v
[execution-engine.ts] OpenAI 호출 → 토큰 사용
    |
    v
[openai-runtime.ts] response.completed → {input_tokens, output_tokens}
    |
    v
[billing-finalize.ts] cost_unit = (in + out) x perToken x tierMultiplier
    |
    v
[credit-deduct.ts] (NEW) 잔고 차감 + api_key_audit_log 기록
    |
    v
[yua_usage_daily] 일간 누적 저장
```

#### 선불 크레딧 테이블 → 섹션 5.2 api_credits 테이블로 통합됨 (SSOT)

> 기존 7.5의 api_key_credits와 5.2의 api_credits가 중복이었음.
> **api_credits (섹션 5.2)가 SSOT.** api_key_credits는 사용하지 않음.

크레딧/트랜잭션 테이블은 **섹션 5.2의 `api_credits` + `api_credit_transactions`가 SSOT**.
여기서는 요청별 감사 로그만 추가:

#### 요청별 감사 로그 (NEW — 추가 필요)

```sql
CREATE TABLE api_key_audit_log (
  id              SERIAL PRIMARY KEY,
  api_key_hash    VARCHAR(255) NOT NULL,
  user_id         INT NOT NULL,
  workspace_id    VARCHAR(255),
  endpoint        VARCHAR(255) NOT NULL,   -- "/chat/stream"
  method          VARCHAR(10) NOT NULL,    -- "POST"
  yua_mode        VARCHAR(20),             -- "FAST" | "NORMAL" | "DEEP"
  tokens_in       INT DEFAULT 0,
  tokens_out      INT DEFAULT 0,
  cost_unit       DECIMAL(10,4) DEFAULT 0,
  status_code     INT,
  response_ms     INT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_key ON api_key_audit_log (api_key_hash, created_at);
CREATE INDEX idx_audit_user ON api_key_audit_log (user_id, created_at);
```

### 7.6 SDK 모드별 툴 접근 + 과금 정책

> 소스: `execution-engine.ts:687-812` 툴 설정, `cost-policy.ts` 과금 정책

#### 모드별 기능 매트릭스

| 모드 | 웹검색 | 코드실행 | 파일분석 | 퀀트분석 | 비고 |
|------|--------|---------|---------|---------|------|
| **FAST** | X | X | X | X | 단순 응답만 |
| **NORMAL** | 의도감지시 | O | 첨부시 | 의도시 | 주력 모드 |
| **SEARCH** | **항상** | X | 첨부시 | 의도시 | 웹검색 특화 |
| **DEEP** | 의도감지시 | O | 첨부시 | 의도시 | 심층분석 + continuation |

> **툴 추가비용 = 없음.** 웹검색/코드실행 토큰은 OpenAI response.usage에 포함되어 자동 과금.
> SDK 유저 입장에서는 모드만 선택하면 툴은 자동으로 붙음.

#### SDK API 응답 타입 설계

```typescript
// SDK 유저가 모드 선택하는 방식
const response = await yua.chat.send(threadId, {
  content: "서울 날씨 알려줘",
  mode: "NORMAL",           // FAST | NORMAL | SEARCH | DEEP
  // tools는 모드에 따라 자동 결정 (유저가 직접 선택 안 함)
});

// 응답에 사용된 모드/툴/토큰 정보 포함
stream.on("done", (summary) => {
  console.log(summary.mode);        // "NORMAL"
  console.log(summary.tools_used);  // ["web_search"]
  console.log(summary.tokens);      // { input: 1300, output: 1500 }
  console.log(summary.cost);        // 0.044 (USD)
});
```

### 7.7 SDK 상용화 로드맵

| Phase | 기간 | 작업 | 우선순위 |
|-------|------|------|----------|
| **Phase 1** | 출시 전 | keys.json 제거 + MySQL SSOT 통일 | CRITICAL |
| | | 선불 크레딧 테이블 + 잔고 체크 미들웨어 | CRITICAL |
| | | API 키 워크스페이스 바인딩 | CRITICAL |
| | | IP 화이트리스트 적용 (auth-or-apikey.ts) | CRITICAL |
| | | Firestore rawKey 필드 제거 | CRITICAL |
| **Phase 2** | 1개월 | 키 로테이션 API (POST /key/:id/rotate) | HIGH |
| | | 키별 Rate Limit 테이블 + 미들웨어 | HIGH |
| | | Scope/권한 시스템 (read/write/admin) | HIGH |
| | | bcrypt/Argon2 해싱 마이그레이션 | HIGH |
| | | 요청별 감사 로그 (api_key_audit_log) | HIGH |
| **Phase 3** | 2개월 | SDK 유저 사용량 대시보드 | MEDIUM |
| | | 웹훅 알림 (80% 잔고, 월간 리포트) | MEDIUM |
| | | 자동 충전 (카드 등록 → Toss 자동결제) | MEDIUM |
| | | test/live 키 분리 + 테스트 모드 과금면제 | MEDIUM |

---

## 8. yua-platform 기술 스택

```
Framework:   Next.js 14 (App Router) — yua-web과 버전 통일
Styling:     Tailwind + shadcn/ui (Framer Motion 유지)
State:       Zustand 5 (업그레이드)
Auth:        Firebase Auth (yua-web과 통일)
API 통신:    yua-backend API only (DB 직접 접근 제거)
문서:        MDX 기반 docs 포탈
결제:        Toss Payments (카드, 계좌이체, 간편결제)
```

### 8.1 제거 대상 (yua-console에서)

- `xterm`, `node-pty` — 터미널 기능
- `ssh2`, `dockerode` — SSH/Docker 접속
- `mysql2`, `pg` — DB 직접 접근 (backend API로 대체)
- 인스턴스 관리 페이지 전체
- `/console` 라우트

---

## 9. yua-admin 기술 스택

```
Framework:   Next.js 14 (App Router) — yua-web과 버전 통일
Styling:     Tailwind + shadcn/ui
State:       Zustand 5
Auth:        Firebase Auth + IAM 역할 검증 미들웨어
API 통신:    yua-backend /admin/* 라우터
차트:        Recharts 또는 Chart.js (매출/KPI 시각화)
테이블:      TanStack Table v8 (유저/티켓 목록)
```

### 9.1 Backend Admin API 라우터

```
POST   /admin/auth/login           — IAM 로그인
GET    /admin/dashboard/kpi        — KPI 데이터

GET    /admin/users                — 유저 목록 (검색/필터/페이지네이션)
GET    /admin/users/:id            — 유저 상세
PATCH  /admin/users/:id/status     — 유저 상태 변경 (정지/복구)

GET    /admin/iam/members          — 직원 목록
POST   /admin/iam/members/invite   — 직원 초대
PATCH  /admin/iam/members/:id/role — 역할 변경
DELETE /admin/iam/members/:id      — 직원 제거

GET    /admin/revenue/summary      — 매출 요약 (API + 구독)
GET    /admin/revenue/api          — API 매출 상세
GET    /admin/revenue/subscription — 구독 매출 상세

GET    /admin/support/tickets      — 티켓 목록
GET    /admin/support/tickets/:id  — 티켓 상세
PATCH  /admin/support/tickets/:id  — 티켓 상태 변경
POST   /admin/support/tickets/:id/reply — AI/수동 응답

GET    /admin/system/status        — 시스템 상태 (PM2, DB, Redis)
GET    /admin/audit-log            — 감사 로그
```

### 9.2 IAM 미들웨어

```typescript
// yua-backend/src/middleware/admin-iam.ts
export function requireRole(...roles: AdminRole[]) {
  return async (req, res, next) => {
    const admin = await getAdminFromToken(req);
    if (!admin || !roles.includes(admin.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    req.admin = admin;
    next();
  };
}

// 사용 예
router.get('/admin/iam/members', requireRole('superadmin'));
router.get('/admin/users', requireRole('superadmin', 'admin', 'support_agent'));
router.get('/admin/revenue', requireRole('superadmin', 'admin', 'billing_manager'));
```

---

## 10. Support AI 파이프라인

```
[유저 이메일/채팅]
       │
       ▼
[Support Ticket 생성]
       │
       ▼
[AI 분류] ──→ FAQ 매칭 ──→ 자동 응답 (검토 후 발송)
       │
       ├─→ 기술 문의 ──→ AI 초안 + 에이전트 검토
       │
       └─→ 결제/환불 ──→ billing_manager 에스컬레이션
```

### 10.1 DB 스키마

```sql
-- Support 티켓
CREATE TABLE support_tickets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     INT NOT NULL,                -- MySQL users.id (SSOT)
  subject     VARCHAR(300) NOT NULL,
  category    VARCHAR(30) NOT NULL,        -- 'billing' | 'technical' | 'account' | 'general'
  status      VARCHAR(20) NOT NULL DEFAULT 'open', -- 'open' | 'in_progress' | 'waiting' | 'resolved' | 'closed'
  priority    VARCHAR(10) DEFAULT 'normal', -- 'low' | 'normal' | 'high' | 'urgent'
  assigned_to UUID,                        -- admin_users.id (담당 에이전트)
  source      VARCHAR(20) DEFAULT 'email', -- 'email' | 'chat' | 'web_form'
  resolved_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_tickets_status ON support_tickets(status, created_at);
CREATE INDEX idx_tickets_user ON support_tickets(user_id);

-- 티켓 메시지 (유저/에이전트/AI 응답 히스토리)
CREATE TABLE ticket_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id   UUID NOT NULL REFERENCES support_tickets(id),
  sender_type VARCHAR(10) NOT NULL,        -- 'user' | 'agent' | 'ai' | 'system'
  sender_id   VARCHAR(128),               -- user_id 또는 admin_member_id
  content     TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false,       -- 내부 메모 (유저에게 미표시)
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_ticket_msgs ON ticket_messages(ticket_id, created_at);

-- FAQ 항목 (AI 자동 응답 매칭용)
CREATE TABLE faq_entries (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question    TEXT NOT NULL,
  answer      TEXT NOT NULL,
  category    VARCHAR(30) NOT NULL,
  embedding   vector(1536),               -- text-embedding-3-large
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_faq_embedding ON faq_entries USING ivfflat (embedding vector_cosine_ops);
```

### 10.2 자동 응답 플로우
1. 티켓 수신 → 임베딩 생성 → FAQ DB 코사인 유사도 검색
2. 유사도 > 0.85 → AI가 FAQ 기반 답변 초안 생성
3. `support_agent`가 검토 후 승인/수정/거부
4. 승인 → 이메일 발송 (SendGrid)

### 10.3 에스컬레이션 규칙
- 유사도 < 0.6 → 수동 처리 배정
- "환불", "결제 오류" 키워드 → billing_manager 알림
- 24시간 미응답 → superadmin 알림

---

## 11. 구현 우선순위

### Phase 1 (2주) — yua-platform 핵심
1. yua-console → yua-platform 리네이밍
2. 터미널/SSH/Docker/DB직접접근 코드 제거
3. Firebase Auth 통일 (JWT 자체발급 제거)
4. API 키 관리 페이지 (생성/삭제/로테이션)
5. 사용량 대시보드

### Phase 2 (2주) — 결제 시스템
6. Toss payments 연동 (API 크레딧 충전)
7. 구독 플랜 페이지 (Free/Pro/Team)
8. 결제 이력 페이지 (API / 구독 분리)
9. Backend: 토큰 사용량 미터링 + 크레딧 차감

### Phase 3 (2주) — yua-admin
10. yua-admin 프로젝트 초기 세팅
11. IAM (직원 초대, 역할 부여)
12. 유저 관리 (검색, 상세, 상태 변경)
13. 매출 대시보드 (API + 구독 통합)

### Phase 4 (2주) — Support AI + 고도화
14. 티켓 시스템 + 이메일 수신
15. AI 자동 응답 파이프라인
16. SDK 문서 포탈 (MDX)
17. 감사 로그 + 시스템 모니터링

---

## 12. 앱 분리 아키텍처 (2026.03.08 확정)

### 12.1 배포 구조

```
platform.yuaone.com  → yua-platform (외부 개발자용)
  - 공개 접근 (HTTPS)
  - Firebase Auth 인증
  - /dashboard, /api-keys, /billing, /docs, /usage, /playground

admin.yuaone.com     → yua-admin (내부 운영용)
  - 사내 IP + VPN만 접근 허용
  - Firebase Auth + IAM 미들웨어
  - /dashboard, /users, /revenue, /support, /iam, /audit-log
```

### 12.2 네트워크 보안 (admin)

| 레이어 | 설정 | 설명 |
|--------|------|------|
| DNS | admin.yuaone.com → 내부 IP | 외부 DNS에 미노출 |
| Firewall | 사내 IP 대역 + VPN CIDR만 허용 | GCP Firewall Rules |
| CORS | `origin: "https://admin.yuaone.com"` 만 | 와일드카드 금지 |
| Backend | `/admin/*` 라우트 IP 체크 미들웨어 | 이중 검증 |
| Auth | Firebase Auth + IAM role + 2FA (Phase 2) | 3중 인증 |

### 12.3 공유 구성요소

```
yua-shared/            → 타입, 계약 (기존)
yua-shared-ui/ (NEW)   → 공통 UI 컴포넌트 (Button, Table, Chart, Modal)
  - platform과 admin 모두에서 import
  - Tailwind + CSS 변수 기반
  - shadcn/ui 래퍼
```

---

## 13. Admin 대시보드 시각화 설계 (2026.03.08)

### 13.1 KPI 카드 (8개)

| KPI | 소스 | 업데이트 |
|-----|------|---------|
| 총 회원 수 | MySQL `COUNT(*) FROM users` | 60초 polling |
| 오늘 DAU | MySQL `COUNT(DISTINCT user_id) FROM yua_usage_daily` | 60초 polling |
| 오늘 매출 | MySQL `SUM(amount) FROM subscriptions` | SSE (결제 webhook) |
| 활성 구독 | MySQL `COUNT(*) FROM subscriptions WHERE status='active'` | 60초 polling |
| 오늘 API 호출 | MySQL `SUM(calls) FROM yua_usage_daily` | 30초 polling |
| 에러율 | Redis/Memory | SSE (실시간) |
| 평균 응답시간 | Redis/Memory | SSE (실시간) |
| MRR | MySQL `SUM(amount) FROM subscriptions WHERE status='active'` | 300초 polling |

### 13.2 실시간 업데이트: SSE + Polling 하이브리드

```
SSE (즉시):  GET /admin/monitor/stream
  → kpi_update, new_user, payment_completed, payment_failed, error_alert
  → 15초 heartbeat, IAM 인증 필수

Polling (보조):
  → /admin/dashboard/kpi      60초 간격
  → /admin/revenue/summary   300초 간격

Toss Webhook → Redis Pub/Sub → Admin SSE Push (결제 즉시 반영)
```

### 13.3 유저 테이블 컬럼

| 컬럼 | 소스 | 타입 | 정렬 | 필터 |
|------|------|------|------|------|
| 이름 | MySQL users.name | string | A-Z | 검색 |
| 이메일 | MySQL users.email | string | A-Z | 검색 |
| 플랜 | MySQL subscriptions.plan | badge | - | dropdown |
| 가입일 | MySQL users.created_at | date | 최신순 | date range |
| 마지막 접속 | MySQL yua_usage_daily MAX(date) | relative | 최근순 | - |
| 총 토큰 | MySQL SUM(yua_usage_monthly.total_tokens) | number | 높은순 | - |
| 상태 | 복합 | badge | - | dropdown |

> 상태: 🟢 활성 (7일내 접속), 🟡 비활성 (7~30일), 🔴 이탈 (30일+), ⛔ 정지
> Pagination: cursor-based (offset 대신 `WHERE id < ? LIMIT 50`)

### 13.4 결제 테이블 컬럼

| 컬럼 | 소스 | 타입 |
|------|------|------|
| 결제일시 | subscriptions.paid_at | datetime |
| 회원 | users.name (JOIN) | link |
| 플랜 | subscriptions.plan | badge |
| 금액 | subscriptions.amount | currency (KRW) |
| 결제수단 | subscriptions.provider + last4 | string |
| 주문ID | subscriptions.order_id | truncated |
| 상태 | subscriptions.status | badge (완료/실패/환불) |

### 13.5 추가 필요 Admin API

```
GET  /admin/dashboard/kpi              — KPI 8개 종합
GET  /admin/users?q=&plan=&cursor=     — 유저 목록 (cursor pagination)
GET  /admin/users/:id                  — 유저 상세 (프로필+구독+사용량)
GET  /admin/revenue/summary?from=&to=  — 매출 요약 (일별/주별/월별)
GET  /admin/revenue/transactions       — 결제 트랜잭션 목록
GET  /admin/revenue/subscription/analysis — 플랜별 MRR/Churn 분석
POST /admin/revenue/refund             — 환불 처리 (Toss cancelPayment)
GET  /admin/monitor/stream             — SSE 실시간 모니터링
POST /admin/support/tickets            — 티켓 생성 (누락됐던 API)
```

---

## 14. 보안 감사 결과 (2026.03.08)

### 14.1 현재 구현 vs 설계 Gap (설계 완성도 ~40%)

| 항목 | 설계 | 구현 | Gap |
|------|------|------|-----|
| IAM 역할 체계 (5단계) | O | X | admin_users 테이블 없음 |
| requireRole() 미들웨어 | O | X | SUPERADMIN_KEY 단일키만 |
| 2FA/MFA | O | X | TOTP 미구현 |
| API 키 Scope | O | X | 전체 user 권한 |
| 키 로테이션/만료 | O | X | active 플래그만 |
| 크레딧 잔고 체크 | O | X | 무한 호출 가능 |
| IP 화이트리스트 | O (스키마) | X (미적용) | auth 미들웨어에 없음 |
| 감사 로그 (admin) | O | X | admin_audit_log 없음 |
| CSRF 토큰 | X | X | 설계/구현 모두 없음 |
| CSP (Content Security Policy) | X | X (disabled) | Helmet에서 비활성 |

### 14.2 CRITICAL 보안 이슈 (출시 전 필수)

| # | 이슈 | 파일 | 수정 시간 |
|---|------|------|----------|
| S1 | keys.json 평문 저장 | api-key-router.ts | 1h |
| S2 | Firestore rawKey 평문 | api-key-router.ts | 30min |
| S3 | 실행 전 크레딧 잔고 체크 없음 | check-usage.ts | 2h |
| S4 | IP 화이트리스트 미적용 | auth-or-apikey.ts | 1h |
| S5 | admin_users 테이블 없음 | (schema) | 4h |
| S6 | 역할 기반 접근 제어 없음 | all routes | 6h |
| S7 | SUPERADMIN_KEY 단일 키 | admin-auth.ts | 3h |

### 14.3 보안 구현 로드맵

```
Phase 1 (출시 전 2주):
  S1 keys.json 삭제 + MySQL SSOT (bcrypt)
  S2 Firestore rawKey 삭제
  S3 credit-check 미들웨어
  S4 IP 화이트리스트 적용
  S5 admin_users + admin_audit_log 테이블
  S6 requireRole() 미들웨어 + 라우트 보호
  S7 멀티 어드민 인증 (단일키 → 세션 기반)

Phase 2 (1개월):
  H1 어드민 IP 제한 필수화
  H2 API 키 Scope 시스템
  H3 키 로테이션 API
  H4 브루트포스 보호 (3회 실패 → 잠금)
  H5 CSRF 토큰 미들웨어
  H6 2FA/TOTP (Google Authenticator)
  H7 CSP 활성화

Phase 3 (2개월):
  M1 PII 마스킹 (admin API 응답)
  M2 DB 컬럼 암호화 (email, API key)
  M3 GDPR 데이터 export/삭제 API
  M4 어드민 세션 관리 (디바이스 추적, 타임아웃)
```

### 14.4 공격 시나리오 분석 (Penetration Test Simulation)

> 2026.03.08 백엔드 소스 코드 기반 공격 시뮬레이션 결과

#### 14.4.1 인증/권한 공격

| # | 공격 벡터 | 심각도 | 현황 | 대응 |
|---|-----------|--------|------|------|
| A1 | **OWNER_SECRET 하드코딩 폴백** — `dev-auth-controller.ts`에서 `JWT_SECRET` 미설정 시 `"yua-secret"` 폴백 사용. 공격자가 이 값으로 임의 JWT 발급 가능 | CRITICAL | 취약 | `.env` 필수화 + 폴백 제거, 서버 부팅 시 미설정이면 `process.exit(1)` |
| A2 | **IP 스푸핑 (x-forwarded-for)** — `rate-limit.ts`에서 `req.headers['x-forwarded-for']` 신뢰. 헤더 조작으로 rate-limit 우회 + IP 화이트리스트 우회 가능 | CRITICAL | 취약 | `trust proxy` 설정 (Nginx/LB hop 수 고정), `req.ip` 사용 |
| A3 | **Admin 라우트 우회 (A1+A2 결합)** — 하드코딩 시크릿 + IP 스푸핑 조합으로 admin 전체 접근 가능. 어드민 키 1개로 모든 관리 작업 수행 | CRITICAL | 취약 | A1+A2 수정 + 멀티 어드민 세션 (S7) |
| A10 | **API 키 브루트포스** — SHA256 해시만 사용 (salt 없음), 키 길이 충분하나 레인보우 테이블 공격 가능. rate-limit도 A2로 우회 가능 | HIGH | 취약 | bcrypt/scrypt + per-key salt, rate-limit 강화 |
| A12 | **JWT 시크릿 폴백** — `"yua-secret"` 하드코딩으로 모든 유저 토큰 위조 가능 | CRITICAL | 취약 | A1과 동일 (폴백 제거) |

#### 14.4.2 데이터/실행 공격

| # | 공격 벡터 | 심각도 | 현황 | 대응 |
|---|-----------|--------|------|------|
| A8 | **RCE via Math Engine** — `math-engine.ts`에서 `new Function()` 사용. 사용자 입력이 코드로 실행됨. `process.exit()`, 파일 접근 등 서버 탈취 가능 | CRITICAL | 취약 | `new Function()` 제거 → mathjs 라이브러리 또는 VM2 샌드박스 |
| A4 | **keys.json 평문 유출** — 파일 시스템에 API 키 평문 저장. 서버 접근 시 모든 키 탈취 | CRITICAL | 취약 | 파일 삭제 → MySQL SSOT (S1) |
| A5 | **Firestore rawKey 평문** — Firestore에 해시 안 된 키 저장 | CRITICAL | 취약 | 해시 저장 (S2) |
| A9 | **무한 크레딧 소진** — 잔고 체크 없이 API 호출 가능. 악의적 사용자가 무제한 OpenAI 토큰 소비 | HIGH | 취약 | pre-flight 잔고 체크 미들웨어 (S3) |

#### 14.4.3 네트워크/인프라 공격

| # | 공격 벡터 | 심각도 | 현황 | 대응 |
|---|-----------|--------|------|------|
| A6 | **CORS origin: "*"** — `server.ts`에서 모든 origin 허용. CSRF/XSS 공격 시 쿠키/토큰 탈취 가능 | HIGH | 취약 | 화이트리스트: `yuaone.com`, `platform.yuaone.com` |
| A7 | **CSP 비활성화** — Helmet에서 CSP disabled. XSS 공격 방어 불가 | MEDIUM | 취약 | Phase 2에서 CSP 활성화 (H7) |
| A11 | **Rate-limit 쿼리 파라미터 우회** — 특정 경로에서 rate-limit 미적용 또는 key 조작 가능 | MEDIUM | 취약 | 고정 키 정책, 전역 rate-limit |
| A13 | **Admin 네트워크 격리 없음** — admin API가 public 네트워크에 노출 | HIGH | 취약 | VPN + IP 제한 (section 12 참조) |

#### 14.4.4 공격 체인 (복합 시나리오)

```
Chain 1: 서버 탈취
  A8 (Math Engine RCE) → 서버 셸 → keys.json(A4) 전체 키 탈취 → 모든 유저 사칭

Chain 2: Admin 장악
  A1 (하드코딩 시크릿) + A2 (IP 스푸핑) → Admin 전체 접근(A3) → 유저 데이터/과금 조작

Chain 3: 무한 과금
  A10 (키 브루트포스) 또는 A4 (키 유출) → A9 (잔고 체크 없음) → OpenAI 비용 무제한 발생

Chain 4: XSS → 세션 하이재킹
  A7 (CSP 없음) + A6 (CORS *) → XSS 주입 → 유저 토큰 탈취 → 계정 장악
```

#### 14.4.5 수정 우선순위 (출시 전)

```
즉시 (Day 1-3):
  A1/A12  JWT/OWNER 시크릿 폴백 제거 (30min)
  A8      Math Engine new Function() 제거 (2h)
  A4/A5   keys.json + Firestore rawKey 제거 (2h)

1주차:
  A2      IP 신뢰 정책 (trust proxy 설정) (1h)
  A9      크레딧 잔고 체크 미들웨어 (2h)
  A6      CORS 화이트리스트 (30min)

2주차:
  A3      멀티 어드민 인증 (S7 연계) (3h)
  A10     API 키 bcrypt 마이그레이션 (2h)
  A13     Admin 네트워크 격리 (section 12 연계)

1개월:
  A7/A11  CSP 활성화 + rate-limit 강화
```

---

## 15. Admin Analytics Layer (Cross-DB 해결)

### 15.1 PostgreSQL admin_* 테이블

```sql
-- 유저 통합 뷰 (매시간 MySQL에서 동기화)
CREATE TABLE admin_user_stats (
  user_id               INT PRIMARY KEY,
  firebase_uid          VARCHAR(128) UNIQUE NOT NULL,
  email                 VARCHAR(255),
  name                  VARCHAR(100),
  latest_subscription   VARCHAR(50),
  workspace_count       INT DEFAULT 0,
  total_cost_unit       DECIMAL(12,4) DEFAULT 0,
  daily_messages_avg    DECIMAL(8,2) DEFAULT 0,
  last_activity_at      TIMESTAMPTZ,
  created_at            TIMESTAMPTZ,
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- 워크스페이스 통합 뷰
CREATE TABLE admin_workspace_stats (
  workspace_id          VARCHAR(255) PRIMARY KEY,
  owner_user_id         INT REFERENCES admin_user_stats(user_id),
  member_count          INT DEFAULT 0,
  plan_tier             VARCHAR(50),
  subscription_plan     VARCHAR(50),
  subscription_status   VARCHAR(50),
  total_usage_cost      DECIMAL(12,4) DEFAULT 0,
  messages_this_month   INT DEFAULT 0,
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- 시간별 사용량 시계열
CREATE TABLE admin_usage_hourly (
  id                    BIGSERIAL PRIMARY KEY,
  workspace_id          VARCHAR(255),
  user_id               INT,
  hour                  TIMESTAMPTZ,
  message_count         INT DEFAULT 0,
  api_calls             INT DEFAULT 0,
  cost_unit             DECIMAL(10,4) DEFAULT 0,
  tokens_in             INT DEFAULT 0,
  tokens_out            INT DEFAULT 0,
  UNIQUE(workspace_id, user_id, hour)
);
CREATE INDEX idx_usage_hourly_time ON admin_usage_hourly(hour DESC);
```

### 15.2 동기화 전략

```
Background Jobs:
  매시간: MySQL yua_usage_daily → admin_usage_hourly 집계
  매일:   MySQL users + subscriptions → admin_user_stats 업데이트
  이벤트: 구독 변경 시 즉시 admin_user_stats.latest_subscription 업데이트

쿼리 성능:
  Before (cross-DB): MySQL → PG → MySQL (300ms+, 3-4 라운드트립)
  After (analytics):  PostgreSQL 단일 조회 (< 50ms)
```

---

## 16. VPN/네트워크 보안 아키텍처

### 16.1 현재 상태

- `admin-auth.ts`: 단일 `SUPERADMIN_KEY` (x-admin-key 헤더), 선택적 IP 화이트리스트 (`ADMIN_ALLOW_IPS`)
- `owner-auth.ts` + `owner-mode-guard.ts`: SuperAdmin 2단계 인증 (시크릿 키 + DB 토큰)
- `AuditEngine`: MySQL `audit_logs` + pgvector 기록
- CORS: `origin: "*"` — 완전 개방
- Express: `0.0.0.0:4000`, `trust proxy: true`
- **VPN 없음, 네트워크 레벨 접근 제어 없음**

### 16.2 VPN 솔루션 비교

| 항목 | WireGuard (자체) | Tailscale | GCP IAP | Cloudflare Access |
|------|-----------------|-----------|---------|-------------------|
| 설치 시간 | 30분 | 10분 | 1-2시간 | 30분 |
| 월 비용 (5명) | $0 | $0~30 | $18+ | $0 |
| SSH/DB 보호 | O | O | X (HTTP만) | X (HTTP만) |
| SSO 연동 | X | O | O (Google) | O |
| 디바이스 관리 | 수동 | 대시보드 | X | WARP |
| DDoS 방어 | 내재적 | 내재적 | O | O |
| 유지보수 | 높음 | 낮음 | 중간 | 낮음 |

**결정: Tailscale** — 1-5명 팀 최적, 10분 설정, 자동 키 로테이션

### 16.3 네트워크 아키텍처

```
┌─────────────────────────────────────────────────────┐
│  Admin Devices (Tailscale 설치)                     │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐            │
│  │ Admin 1 │  │ Admin 2 │  │ Admin 3 │            │
│  └────┬────┘  └────┬────┘  └────┬────┘            │
│       └──────┬─────┴──────┬─────┘                  │
│              │ Tailscale Mesh (WireGuard)           │
│              ▼                                      │
│  ┌─────────────────────────────────────────┐       │
│  │  GCP VM (34.50.27.221)                  │       │
│  │  Tailscale Node: yua-prod               │       │
│  │                                         │       │
│  │  ┌── GCP Firewall ──────────────────┐  │       │
│  │  │  443: ALLOW 0.0.0.0/0 (public)   │  │       │
│  │  │  4000: DENY 0.0.0.0/0            │  │       │
│  │  │  4000: ALLOW 100.64.0.0/10 (VPN) │  │       │
│  │  │  5432/3306/6379: DENY 0.0.0.0/0  │  │       │
│  │  └──────────────────────────────────┘  │       │
│  │                                         │       │
│  │  ┌── nginx ─────────────────────────┐  │       │
│  │  │  yuaone.com (public)             │  │       │
│  │  │    /     → :3000 (yua-web)       │  │       │
│  │  │    /api  → :4000 (public 라우트)  │  │       │
│  │  │    /api/superadmin → 403         │  │       │
│  │  │    /api/control    → 403         │  │       │
│  │  │    /api/audit      → 403         │  │       │
│  │  │                                  │  │       │
│  │  │  admin.yuaone.com (VPN 전용)     │  │       │
│  │  │    allow 100.64.0.0/10;          │  │       │
│  │  │    deny all;                     │  │       │
│  │  │    /     → :3100 (admin SPA)     │  │       │
│  │  │    /api  → :4000 (전체 라우트)    │  │       │
│  │  └──────────────────────────────────┘  │       │
│  └─────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────┘
```

### 16.4 GCP 방화벽 설정

```bash
# Port 4000 public 차단
gcloud compute firewall-rules create deny-backend-public \
  --direction=INGRESS --priority=900 --action=DENY \
  --rules=tcp:4000 --source-ranges=0.0.0.0/0 \
  --target-tags=yua-prod

# VPN 서브넷 허용
gcloud compute firewall-rules create allow-vpn-backend \
  --direction=INGRESS --priority=800 --action=ALLOW \
  --rules=tcp:4000 --source-ranges=100.64.0.0/10 \
  --target-tags=yua-prod

# Tailscale UDP 허용
gcloud compute firewall-rules create allow-tailscale \
  --direction=INGRESS --priority=800 --action=ALLOW \
  --rules=udp:41641 --source-ranges=0.0.0.0/0 \
  --target-tags=yua-prod

# DB 포트 외부 차단
gcloud compute firewall-rules create deny-db-public \
  --direction=INGRESS --priority=900 --action=DENY \
  --rules=tcp:5432,tcp:3306,tcp:6379 --source-ranges=0.0.0.0/0 \
  --target-tags=yua-prod
```

### 16.5 nginx Admin 라우트 보호

```nginx
# yuaone.com 서버 블록에 추가 (admin 라우트 차단)
location ~ ^/api/(superadmin|control|audit|dev) {
    return 403;
}

# admin.yuaone.com 전용 서버 블록
server {
    listen 443 ssl;
    server_name admin.yuaone.com;
    allow 100.64.0.0/10;  # Tailscale CGNAT
    deny all;
    location / { proxy_pass http://127.0.0.1:3100; }
    location /api/ { proxy_pass http://127.0.0.1:4000/api/; }
}
```

### 16.6 구현 단계

```
Phase 1 (Day 1, ~2시간):
  1. GCP VM에 Tailscale 설치 + 어드민 디바이스 등록
  2. GCP 방화벽 규칙 적용 (port 4000 public 차단)
  3. nginx admin 라우트 deny 규칙 추가
  4. 검증: public에서 admin 라우트 접근 불가 확인

Phase 2 (Day 2-3):
  1. SUPERADMIN_KEY → per-user admin 인증 전환
  2. x-forwarded-for → req.socket.remoteAddress (Tailscale 뒤)
  3. CORS 화이트리스트: yuaone.com, platform.yuaone.com, admin.yuaone.com

Phase 3 (Day 5-7):
  1. Redis 기반 rate-limit (in-memory Map 대체)
  2. Slack webhook 알림 (admin auth 실패 시)
  3. 일일 감사 로그 다이제스트
```

### 16.7 월 비용

| 항목 | 비용 |
|------|------|
| Tailscale (3명 무료) | $0 |
| Tailscale (5명 Teams) | $30 |
| GCP 방화벽 규칙 | $0 |
| nginx 설정 변경 | $0 |

---

## 17. Admin 인증 & 세션 관리 설계

### 17.1 인증 전략

**Firebase Auth + PostgreSQL admin_users (하이브리드)**

- Firebase Auth: 로그인 시 idToken 발급 (기존 인프라 재활용)
- PostgreSQL `admin_users`: 역할/상태 SSOT (Firebase custom claims 사용하지 않음)
- Redis: 세션 캐시 (요청당 DB 히트 방지)
- httpOnly Secure 쿠키: XSS 토큰 탈취 방지

> Firestore `console_users` + 자체 JWT (현행) → 이 시스템으로 대체 예정

### 17.2 DB 스키마

```sql
-- admin_users: 어드민 신원 + 역할 SSOT
CREATE TABLE admin_users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_uid  VARCHAR(128) UNIQUE NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  name          VARCHAR(100) NOT NULL,
  role          VARCHAR(30) NOT NULL DEFAULT 'viewer'
                CHECK (role IN ('superadmin','admin','support_agent','billing_manager','viewer')),
  status        VARCHAR(20) NOT NULL DEFAULT 'invited'
                CHECK (status IN ('active','suspended','invited')),
  invited_by    UUID REFERENCES admin_users(id),
  totp_secret   TEXT,            -- AES-256-GCM 암호화
  totp_enabled  BOOLEAN NOT NULL DEFAULT false,
  backup_codes  TEXT,            -- bcrypt 해시 JSON 배열
  last_login_at TIMESTAMPTZ,
  failed_login_count INT NOT NULL DEFAULT 0,
  locked_until  TIMESTAMPTZ,     -- 브루트포스 잠금
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- admin_sessions: 서버 사이드 세션
CREATE TABLE admin_sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id      UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  token_hash    VARCHAR(128) NOT NULL UNIQUE,  -- SHA-256
  ip_address    INET,
  user_agent    VARCHAR(500),
  device_label  VARCHAR(100),
  is_2fa_verified BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  expires_at    TIMESTAMPTZ NOT NULL,
  last_active_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_admin_sessions_admin ON admin_sessions(admin_id);

-- admin_audit_log: 섹션 4 스키마 참조 (중복 정의 제거)
```

Redis 세션 캐시:
```
admin:session:{tokenHash} → { adminId, role, status, is2faVerified, expiresAt }
TTL: 900초 (15분)
```

### 17.3 로그인 플로우

```
1. Frontend: Firebase signInWithEmailAndPassword → idToken
2. POST /admin/auth/login { idToken }
3. Backend: firebaseAuth.verifyIdToken(idToken, checkRevoked=true) → firebase_uid
4. SELECT FROM admin_users WHERE firebase_uid = ? AND status = 'active'
   → 없거나 suspended → 403
5. 브루트포스 체크: failed_login_count >= 5 → 423 "account_locked"
6. IP 화이트리스트 체크
7. session_token 생성 (crypto.randomBytes(32))
8. INSERT admin_sessions + Redis 캐시
9. httpOnly 쿠키 설정 (Secure, SameSite=Strict, Max-Age=3600)
10. 응답: { ok, requires2fa, admin: { id, name, role } }
11. 2FA 필요 시 → POST /admin/auth/verify-2fa { code }
12. TOTP 검증 → 성공 시 is_2fa_verified = true
```

### 17.4 세션 라이프사이클

| 이벤트 | 동작 |
|--------|------|
| 로그인 | PG + Redis 세션 생성, 쿠키 설정 |
| 요청마다 | Redis 검증 (빠름), last_active_at 슬라이딩 |
| 30분 경과 | 세션 토큰 자동 로테이션 |
| 60분 경과 | 세션 만료, 재로그인 필요 |
| 명시적 로그아웃 | PG + Redis 삭제, 쿠키 제거 |
| 전체 로그아웃 | 해당 admin_id 모든 세션 삭제 |
| 계정 정지 | 백그라운드: 전체 세션 삭제 |

동시 세션 제한:
- `superadmin`: 최대 2개 (3번째 생성 시 가장 오래된 것 삭제)
- 나머지 역할: 최대 3개

### 17.5 2FA (TOTP)

| 역할 | 2FA 요구 |
|------|----------|
| superadmin | **필수** — 미설정 시 다른 라우트 접근 불가 |
| admin | **필수** — 계정 생성 후 7일 유예 |
| support_agent | 권장 (비필수) |
| billing_manager | 권장 (비필수) |
| viewer | 불필요 |

설정 플로우:
1. `POST /admin/auth/2fa/setup` → TOTP 시크릿 생성, QR URI 반환
2. Google Authenticator로 스캔
3. `POST /admin/auth/2fa/confirm { code }` → 검증 후 10개 백업 코드 발급

복구: 백업 코드 사용 또는 superadmin이 `POST /admin/iam/members/:id/reset-2fa`

### 17.6 미들웨어 스택

```
/admin/* 요청
  │
  ├─ adminRateLimit (30 req/min per IP)
  ├─ adminSessionMiddleware (쿠키 → Redis/PG 검증 → req.admin 주입)
  ├─ admin2faGate (/admin/auth/* 제외)
  ├─ requireAdminRole(...roles) (라우트별)
  ├─ adminAuditMiddleware (변경 요청 자동 로깅)
  └─ Route handler
```

### 17.7 어드민 초대 플로우

```
1. superadmin: POST /admin/iam/members/invite { email, name, role }
2. admin_users INSERT (status='invited', firebase_uid=NULL)
3. 초대 토큰 생성 → Redis (72시간 TTL)
4. 이메일 발송: https://admin.yuaone.com/invite/{token}
5. 신규 어드민: Firebase 계정 생성 + POST /admin/auth/accept-invite
6. admin_users UPDATE (firebase_uid 설정, status='active')
7. 2FA 필수 역할 → /settings/2fa-setup 리다이렉트
```

### 17.8 비상 잠금 절차

서버 SSH 접근 필요 (API 아님):
```bash
npx ts-node scripts/admin-emergency-lockdown.ts
```
- 모든 admin_users status → 'suspended'
- 모든 admin_sessions 삭제
- Redis `admin:session:*` 전체 플러시
- DB 직접 접근으로만 superadmin 재활성화

### 17.9 구현 순서

```
Week 1-2: Core Auth
  - admin_users, admin_sessions, admin_audit_log 테이블
  - yua-shared AdminRole/AdminUser 타입
  - admin-session.ts + admin-rbac.ts 미들웨어
  - admin-auth-router.ts (login/logout/verify-2fa)
  - 첫 superadmin seed 스크립트

Week 3: 2FA + 초대
  - otplib 설치, TOTP 설정/확인/검증 API
  - 초대 플로우 + 이메일 (SendGrid)
  - 백업 코드 생성/사용

Week 4: 세션 강화
  - 30분 토큰 로테이션
  - 동시 세션 제한
  - 브루트포스 보호 (5회 실패 → 15분 잠금)
  - 기존 admin-auth.ts/owner-auth.ts 제거
```

### 17.10 수정 대상 파일

| 파일 | 작업 |
|------|------|
| `middleware/admin-auth.ts` | 세션 기반으로 전면 교체 |
| `auth/auth.server.ts` | Firebase verifyIdToken 패턴 재활용 |
| `types/express.d.ts` | `admin?` 프로퍼티 추가 |
| `db/redis.ts` | admin 세션 키 헬퍼 추가 |
| `routes/auth-router.ts` | console JWT 인증 deprecated 처리 |

---

## 18. 데스크탑 앱 & 다운로드 허브

> 상세 설계: `YUA_DESKTOP_DESIGN.md` 참조

### 18.1 제품 라인업

| 채널 | 상태 | URL/배포 |
|-------|------|----------|
| Web | 운영 중 | yuaone.com |
| Mobile | 빌드 완료 | Google Play / App Store |
| **Desktop** | **설계 완료** | **platform.yuaone.com/download** |
| API/SDK | 설계 중 | platform.yuaone.com/docs |

### 18.2 platform.yuaone.com = 중앙 허브

platform.yuaone.com은 모든 YUA 제품의 **단일 진입점**:

```
platform.yuaone.com/
├── /                        → 메인 랜딩 (제품군 소개)
├── /download                → 다운로드 허브 (OS 자동 감지)
│   ├── /download/desktop    → 데스크탑 상세 + 다운로드 버튼
│   ├── /download/mobile     → 모바일 상세 + 스토어 링크
│   └── /download/release-notes → 릴리스 노트
├── /pricing                 → 통합 가격표 (웹/모바일/데스크탑 공통)
├── /docs                    → API 문서 포탈
├── /dashboard               → 개발자 대시보드
└── /keys                    → API 키 관리
```

### 18.3 다운로드 허브 설계

**OS 자동 감지**: User-Agent + navigator.platform으로 macOS/Windows/iOS/Android 판별 → 해당 플랫폼 다운로드 버튼 하이라이트

**다운로드 항목:**

| 플랫폼 | 파일 | 크기 (예상) |
|--------|------|-----------|
| macOS (Apple Silicon) | YUA-arm64.dmg | ~150MB |
| macOS (Intel) | YUA-x64.dmg | ~150MB |
| Windows (x64) | YUA-Setup-x64.exe | ~160MB |
| Windows (ARM64) | YUA-Setup-arm64.exe | ~160MB |
| Android | Google Play 링크 | - |
| iOS | App Store 링크 | - |

**버전 표시**: 최신 버전 번호, 릴리스 날짜, 변경사항 요약

### 18.4 yua-platform 라우트 추가 (섹션 2 보충)

기존 라우트에 다음 추가:

```
/download                    → 다운로드 허브 메인
/download/desktop            → 데스크탑 상세 (기능 소개 + OS별 다운로드)
/download/mobile             → 모바일 상세 (스크린샷 + 스토어 배지)
/download/release-notes      → 전체 릴리스 노트 (데스크탑/모바일)
```

### 18.5 데스크탑 요약 (상세 → YUA_DESKTOP_DESIGN.md)

- **프레임워크**: Electron 35+ (Phase 1), Tauri 평가 (Phase 2)
- **코드 재사용**: yua-web의 ~72% 재사용 (스토어/훅/API/컴포넌트)
- **핵심 기능**: 시스템 트레이, 글로벌 단축키(Cmd+Shift+Y), 미니모드, 파일 D&D
- **보안**: safeStorage(OS 키체인), CSP, contextIsolation, sandbox
- **배포**: GitHub Releases + 자동 업데이트, MS Store (Phase 2)
- **수익**: 무료 앱 + 기존 구독 모델 (웹/모바일/데스크탑 통합)
- **MVP 일정**: 4주 (핵심 기능) + 2주 (안정화)

---

## Sources
- [OpenAI API Pricing](https://openai.com/api/pricing/)
- [Anthropic Claude API Pricing](https://platform.claude.com/docs/en/about-claude/pricing)
- [OpenAI Pricing Summary (TLDL)](https://www.tldl.io/resources/openai-api-pricing)
- [Claude Pricing Summary (TLDL)](https://www.tldl.io/resources/anthropic-api-pricing)
