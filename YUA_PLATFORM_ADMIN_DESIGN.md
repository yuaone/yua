# YUA Platform + Admin 통합 설계 문서

> 작성일: 2026-03-07
> 상태: Draft v1

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

```sql
-- 공통: 결제 수단
CREATE TABLE payment_methods (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL,
  type        VARCHAR(20) NOT NULL,   -- 'card' | 'bank' | 'iap'
  provider    VARCHAR(30),            -- 'stripe' | 'apple' | 'google'
  provider_id VARCHAR(255),           -- Stripe payment method ID 등
  last4       VARCHAR(4),
  is_default  BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- API 크레딧 (yua-platform)
CREATE TABLE api_credits (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL,
  balance     BIGINT NOT NULL DEFAULT 0,        -- 잔여 크레딧 (센트 단위)
  lifetime_purchased BIGINT NOT NULL DEFAULT 0, -- 총 구매액
  lifetime_used      BIGINT NOT NULL DEFAULT 0, -- 총 사용액
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- API 크레딧 충전 이력
CREATE TABLE api_credit_transactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL,
  type        VARCHAR(20) NOT NULL,   -- 'purchase' | 'usage' | 'refund' | 'bonus'
  amount      BIGINT NOT NULL,        -- 양수: 충전, 음수: 사용
  balance_after BIGINT NOT NULL,
  description VARCHAR(500),
  stripe_payment_id VARCHAR(255),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- API 사용량 (분 단위 집계)
CREATE TABLE api_usage (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID NOT NULL,
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
  user_id     UUID NOT NULL,
  plan        VARCHAR(20) NOT NULL,   -- 'free' | 'pro' | 'team'
  interval    VARCHAR(10) NOT NULL,   -- 'monthly' | 'yearly'
  status      VARCHAR(20) NOT NULL,   -- 'active' | 'canceled' | 'past_due' | 'trialing'
  stripe_subscription_id VARCHAR(255),
  current_period_start TIMESTAMPTZ,
  current_period_end   TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 구독 결제 이력
CREATE TABLE subscription_invoices (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL,
  subscription_id UUID REFERENCES subscriptions(id),
  amount      INT NOT NULL,           -- 센트 단위
  currency    VARCHAR(3) DEFAULT 'USD',
  status      VARCHAR(20) NOT NULL,   -- 'paid' | 'failed' | 'refunded'
  stripe_invoice_id VARCHAR(255),
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

**B. NORMAL 모드 — 일반 대화 (gpt-5.2)**
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

**D. RESEARCH 모드 — 웹 검색 + 멀티턴 (gpt-5.2, max 4 segments)**
```
유저 input: 800 tokens
시스템 + 검색 context: 5,000 tokens (웹 결과 포함)
총 input: 5,800 tokens x $1.75/1M = $0.0102
output: 5,000 tokens x $14.00/1M = $0.0700
continuation 2회: $0.0600
타이틀 + 임베딩: $0.0002
────────────────────────────────────
총 원가: ~$0.1404 (14.04센트)
```

### 6.3 YUA API 과금 모델 — "유저 가시 토큰 + 오버헤드 마진"

> 과금 방식: 유저에게 보이는 input/output 토큰만 과금, 내부 오버헤드(시스템 프롬프트, 타이틀, 임베딩)는 마진에 포함

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
| DEEP 심층 분석 (1000in/4000out) | $0.0928 | $0.1450 | $0.0522 | 36% |
| RESEARCH 웹검색 (800in/5000out) | $0.1404 | $0.1790 | $0.0386 | 22% |

> FAST: 최소 과금이 마진 보장 (절대금액 작아서 최소 과금 필수)
> NORMAL: 마진 47% — 가장 수익성 높음 (주력 모드)
> DEEP/RESEARCH: 마진 22~36% — continuation 비용이 커서 마진 낮음, 프리미엄 느낌

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
  user_id     UUID NOT NULL,
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

---

## 8. yua-platform 기술 스택

```
Framework:   Next.js 15 (App Router) — 기존 yua-console 유지
Styling:     Tailwind + shadcn/ui (Framer Motion 유지)
State:       Zustand 5 (업그레이드)
Auth:        Firebase Auth (yua-web과 통일)
API 통신:    yua-backend API only (DB 직접 접근 제거)
문서:        MDX 기반 docs 포탈
결제:        Stripe (카드, 인보이스)
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
Framework:   Next.js 15 (App Router)
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

### 10.1 자동 응답 플로우
1. 티켓 수신 → 임베딩 생성 → FAQ DB 코사인 유사도 검색
2. 유사도 > 0.85 → AI가 FAQ 기반 답변 초안 생성
3. `support_agent`가 검토 후 승인/수정/거부
4. 승인 → 이메일 발송 (SendGrid)

### 10.2 에스컬레이션 규칙
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

## Sources
- [OpenAI API Pricing](https://openai.com/api/pricing/)
- [Anthropic Claude API Pricing](https://platform.claude.com/docs/en/about-claude/pricing)
- [OpenAI Pricing Summary (TLDL)](https://www.tldl.io/resources/openai-api-pricing)
- [Claude Pricing Summary (TLDL)](https://www.tldl.io/resources/anthropic-api-pricing)
