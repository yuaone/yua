# YUA Admin + Support AI 설계 문서

> **DEPRECATED (2026-03-08)** — 이 문서는 `YUA_PLATFORM_ADMIN_DESIGN.md`로 대체되었습니다.
> yua-console → yua-platform + yua-admin 분리 결정에 따라, Admin/Support AI 설계는
> PLATFORM_ADMIN 문서가 SSOT입니다. 이 문서는 참고용으로만 유지합니다.
>
> 작성일: 2026-03-07
> 대상 패키지: yua-console (Admin UI), yua-backend (API), yua-shared (타입 SSOT)

---

## 1. 시스템 아키텍처

```
                         [yuaone.com]
                              |
              +---------------+---------------+
              |                               |
        [yua-web]                      [yua-console]
        (사용자 앱)                  (Admin + Support AI)
              |                               |
              +---------------+---------------+
                              |
                      [yua-backend :4000]
                              |
         +--------+-----------+-----------+--------+
         |        |           |           |        |
      [PostgreSQL] [MySQL]  [Redis]   [Firebase] [Email]
                                                   |
                                          +--------+--------+
                                          |                 |
                                   [Gmail API /       [Support AI
                                    SendGrid]         LLM Pipeline]
```

  ### Admin 구역 (yua-console 확장)

  ```
  yua-console (Next.js 15 App Router)
    /admin                      -- Admin 대시보드 (시스템 상태)
    /admin/users                -- 사용자 관리
    /admin/workspaces           -- 워크스페이스 관리
    /admin/threads              -- 채팅/스레드 모니터링
    /admin/system               -- PM2, DB, API 상태
    /admin/models               -- AI 모델 설정
    /admin/billing              -- 결제/구독 관리
    /admin/support              -- Support AI 대시보드
    /admin/support/tickets      -- 티켓 목록
    /admin/support/settings     -- FAQ/에스컬레이션 설정
  ```

  ### Support AI 파이프라인 구역

  ```
  [수신]                    [처리]                    [발송]
  Gmail API Webhook    ->  Email Ingestion Worker   ->  분류/파싱
                                |
                          Support AI Engine
                          (FAQ 검색 + LLM 초안)
                                |
                      +----+----+----+
                      |              |
                [자동 발송]    [관리자 큐]
                (confidence    (Admin UI에서
                >= 0.9)       승인/수정/발송)
  ```

---

## 2. DB 스키마 설계

### 2-1. Admin 관련 (PostgreSQL 확장)

기존 테이블 활용: `users` (MySQL), `workspaces`, `workspace_users`, `chat_threads`, `chat_messages`, `engine_instances`

#### 신규 테이블: `admin_audit_log`
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | BIGSERIAL PK | |
| admin_user_id | INT NOT NULL | FK -> users.id |
| action | VARCHAR(100) NOT NULL | 'user.suspend', 'ticket.approve' 등 |
| target_type | VARCHAR(50) | 'user', 'workspace', 'thread', 'ticket' |
| target_id | VARCHAR(100) | 대상 ID |
| metadata | JSONB | 추가 정보 |
| ip_address | INET | |
| created_at | TIMESTAMPTZ DEFAULT NOW() | |

#### 신규 테이블: `system_metrics`
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | BIGSERIAL PK | |
| metric_type | VARCHAR(50) NOT NULL | 'api_latency', 'db_pool', 'pm2_status', 'error_rate' |
| metric_value | JSONB NOT NULL | { avg_ms, p95_ms, count } 등 |
| recorded_at | TIMESTAMPTZ DEFAULT NOW() | |
| INDEX | (metric_type, recorded_at DESC) | |

#### 신규 테이블: `admin_model_config`
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | SERIAL PK | |
| model_key | VARCHAR(100) UNIQUE NOT NULL | 'claude-sonnet-4-20250514', 'gpt-4o' 등 |
| provider | VARCHAR(30) NOT NULL | 'claude', 'openai', 'gemini' |
| display_name | VARCHAR(100) | |
| enabled | BOOLEAN DEFAULT true | |
| rate_limit_rpm | INT | 분당 요청 제한 |
| max_tokens | INT | |
| priority | INT DEFAULT 0 | 높을수록 우선 |
| config | JSONB | temperature, system prompt 등 |
| updated_by | INT | FK -> users.id |
| updated_at | TIMESTAMPTZ DEFAULT NOW() | |

### 2-2. Support AI 관련 (PostgreSQL)

#### `support_tickets`
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID PK DEFAULT gen_random_uuid() | |
| external_email_id | VARCHAR(255) UNIQUE | Gmail message ID (중복 방지) |
| from_email | VARCHAR(255) NOT NULL | 발신자 |
| from_name | VARCHAR(255) | |
| subject | VARCHAR(500) | |
| body_text | TEXT NOT NULL | 원문 텍스트 |
| body_html | TEXT | 원문 HTML |
| category | VARCHAR(50) | 'billing', 'technical', 'account', 'feature_request', 'bug_report', 'general' |
| priority | VARCHAR(20) DEFAULT 'normal' | 'low', 'normal', 'high', 'urgent' |
| status | VARCHAR(30) DEFAULT 'new' | 아래 상태 머신 참조 |
| assigned_admin_id | INT | FK -> users.id |
| linked_user_id | INT | from_email로 매칭된 YUA 유저 |
| linked_workspace_id | VARCHAR(100) | |
| metadata | JSONB | 첨부파일 정보, 원본 헤더 등 |
| created_at | TIMESTAMPTZ DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ DEFAULT NOW() | |
| resolved_at | TIMESTAMPTZ | |
| INDEX | (status, priority, created_at) | |
| INDEX | (from_email) | |

**티켓 상태 머신:**
```
new -> ai_processing -> ai_drafted -> pending_review -> approved -> sent -> resolved
                    |                                           |
                    +-> escalated -> pending_review             |
                                                                +-> closed
```

#### `support_messages`
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID PK DEFAULT gen_random_uuid() | |
| ticket_id | UUID NOT NULL FK -> support_tickets.id | |
| direction | VARCHAR(10) NOT NULL | 'inbound', 'outbound' |
| sender_type | VARCHAR(20) NOT NULL | 'customer', 'ai', 'admin' |
| sender_id | INT | admin인 경우 users.id |
| content_text | TEXT NOT NULL | |
| content_html | TEXT | |
| ai_confidence | FLOAT | AI 생성 시 신뢰도 (0~1) |
| ai_model_used | VARCHAR(100) | 사용된 모델 |
| ai_sources | JSONB | FAQ ID 목록, 참조 문서 등 |
| email_message_id | VARCHAR(255) | 실제 발송된 이메일 ID |
| sent_at | TIMESTAMPTZ | |
| created_at | TIMESTAMPTZ DEFAULT NOW() | |
| INDEX | (ticket_id, created_at) | |

#### `support_faq`
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | SERIAL PK | |
| category | VARCHAR(50) NOT NULL | |
| question | TEXT NOT NULL | |
| answer | TEXT NOT NULL | |
| keywords | TEXT[] | 검색 키워드 |
| embedding | vector(1536) | pgvector 임베딩 |
| usage_count | INT DEFAULT 0 | AI가 참조한 횟수 |
| enabled | BOOLEAN DEFAULT true | |
| created_by | INT | FK -> users.id |
| created_at | TIMESTAMPTZ DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ DEFAULT NOW() | |

#### `support_escalation_rules`
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | SERIAL PK | |
| name | VARCHAR(100) NOT NULL | |
| condition_type | VARCHAR(50) NOT NULL | 'keyword', 'category', 'confidence_below', 'sentiment', 'vip_user' |
| condition_value | JSONB NOT NULL | { keywords: [...] } 또는 { threshold: 0.5 } |
| action | VARCHAR(50) NOT NULL | 'escalate', 'assign_admin', 'notify_slack' |
| action_config | JSONB | { admin_id, slack_channel } |
| priority | INT DEFAULT 0 | |
| enabled | BOOLEAN DEFAULT true | |
| created_at | TIMESTAMPTZ DEFAULT NOW() | |

#### `support_kpi_daily`
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | SERIAL PK | |
| date | DATE UNIQUE NOT NULL | |
| total_tickets | INT DEFAULT 0 | |
| auto_resolved | INT DEFAULT 0 | |
| manually_resolved | INT DEFAULT 0 | |
| escalated | INT DEFAULT 0 | |
| avg_response_time_sec | INT | 최초 응답까지 평균 시간 |
| avg_resolution_time_sec | INT | 해결까지 평균 시간 |
| ai_accuracy_rate | FLOAT | 관리자가 수정 없이 승인한 비율 |
| by_category | JSONB | { billing: 5, technical: 12, ... } |
| created_at | TIMESTAMPTZ DEFAULT NOW() | |

---

## 3. API 엔드포인트 목록

모든 Admin API는 `/api/admin/*` prefix, `requireFirebaseAuth` + `requireAdminRole` 미들웨어 적용.

### 3-1. 사용자 관리

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/admin/users` | 사용자 목록 (검색, 페이지네이션, 필터) |
| GET | `/api/admin/users/:userId` | 사용자 상세 (프로필 + 사용량 + 구독) |
| PATCH | `/api/admin/users/:userId/status` | 활성/비활성/정지 |
| GET | `/api/admin/users/:userId/usage` | 사용량 상세 (일별/모델별) |
| GET | `/api/admin/users/:userId/threads` | 해당 유저 스레드 목록 |

### 3-2. 워크스페이스 관리

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/admin/workspaces` | 워크스페이스 목록 |
| GET | `/api/admin/workspaces/:wsId` | 상세 (멤버, 사용량) |
| PATCH | `/api/admin/workspaces/:wsId` | 설정 변경 |
| DELETE | `/api/admin/workspaces/:wsId` | 소프트 삭제 |

### 3-3. 채팅/스레드 모니터링

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/admin/threads` | 스레드 목록 (필터: 날짜, 유저, 모델) |
| GET | `/api/admin/threads/:threadId` | 스레드 상세 (메시지 포함) |
| GET | `/api/admin/threads/stats` | 통계 (일별 스레드 수, 평균 메시지 수) |
| DELETE | `/api/admin/threads/:threadId` | 소프트 삭제 |

### 3-4. 시스템 상태

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/admin/system/health` | PM2 프로세스, DB 풀, Redis, 디스크 |
| GET | `/api/admin/system/metrics` | API 응답시간, 에러율 (기간별) |
| GET | `/api/admin/system/logs` | 시스템 로그 (최근 N건) |
| POST | `/api/admin/system/pm2/:process/restart` | PM2 프로세스 재시작 |

### 3-5. AI 모델 관리

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/admin/models` | 등록된 모델 목록 |
| POST | `/api/admin/models` | 모델 추가 |
| PATCH | `/api/admin/models/:modelId` | 모델 설정 변경 (활성/비활성, rate limit 등) |
| DELETE | `/api/admin/models/:modelId` | 모델 제거 |
| GET | `/api/admin/models/usage` | 모델별 사용량 통계 |

### 3-6. 결제/구독

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/admin/billing/subscriptions` | 전체 구독 목록 |
| GET | `/api/admin/billing/revenue` | 매출 통계 (일/월별) |
| PATCH | `/api/admin/billing/subscriptions/:subId` | 구독 수동 조정 (플랜 변경, 연장) |
| POST | `/api/admin/billing/refund` | 환불 처리 |

### 3-7. Support AI

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/admin/support/tickets` | 티켓 목록 (상태/카테고리/우선순위 필터) |
| GET | `/api/admin/support/tickets/:ticketId` | 티켓 상세 + 메시지 히스토리 |
| PATCH | `/api/admin/support/tickets/:ticketId` | 상태 변경, 담당자 할당 |
| POST | `/api/admin/support/tickets/:ticketId/approve` | AI 초안 승인 -> 발송 |
| POST | `/api/admin/support/tickets/:ticketId/edit-send` | 수정 후 발송 |
| POST | `/api/admin/support/tickets/:ticketId/reply` | 관리자 직접 답변 |
| POST | `/api/admin/support/tickets/:ticketId/escalate` | 수동 에스컬레이션 |
| GET | `/api/admin/support/kpi` | KPI 대시보드 (응답률, 평균시간, AI 정확도) |
| GET | `/api/admin/support/kpi/timeline` | 기간별 KPI 추이 |
| GET | `/api/admin/support/faq` | FAQ 목록 |
| POST | `/api/admin/support/faq` | FAQ 추가 (자동 임베딩 생성) |
| PATCH | `/api/admin/support/faq/:faqId` | FAQ 수정 |
| DELETE | `/api/admin/support/faq/:faqId` | FAQ 삭제 |
| GET | `/api/admin/support/escalation-rules` | 에스컬레이션 룰 목록 |
| POST | `/api/admin/support/escalation-rules` | 룰 추가 |
| PATCH | `/api/admin/support/escalation-rules/:ruleId` | 룰 수정 |

### 3-8. Webhook (Public, 서명 검증)

| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/webhook/email/inbound` | Gmail/SendGrid 수신 웹훅 |

### 3-9. 감사 로그

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/admin/audit-log` | 관리자 행동 로그 조회 |

---

## 4. 프론트엔드 페이지/컴포넌트 구조

### 4-1. 라우트 구조 (yua-console 확장)

```
src/app/admin/
  layout.tsx                    -- Admin 전체 레이아웃 (사이드바 + 헤더)
  page.tsx                      -- 대시보드 (요약 카드 + 차트)

  users/
    page.tsx                    -- 사용자 목록 테이블
    [userId]/
      page.tsx                  -- 사용자 상세

  workspaces/
    page.tsx                    -- 워크스페이스 목록
    [wsId]/
      page.tsx                  -- 워크스페이스 상세

  threads/
    page.tsx                    -- 스레드 모니터링 (검색 + 필터)
    [threadId]/
      page.tsx                  -- 스레드 상세 (메시지 뷰어)

  system/
    page.tsx                    -- 시스템 상태 대시보드

  models/
    page.tsx                    -- AI 모델 관리

  billing/
    page.tsx                    -- 결제/구독 관리

  support/
    page.tsx                    -- Support AI 대시보드 (KPI 카드 + 차트)
    tickets/
      page.tsx                  -- 티켓 목록
      [ticketId]/
        page.tsx                -- 티켓 상세 (대화 뷰 + AI 초안 + 승인 버튼)
    faq/
      page.tsx                  -- FAQ 관리
    settings/
      page.tsx                  -- 에스컬레이션 룰 + 자동발송 설정
```

### 4-2. 공통 컴포넌트

```
src/components/admin/
  AdminSidebar.tsx              -- 좌측 네비게이션
  AdminHeader.tsx               -- 상단 바 (검색, 알림 벨, 프로필)
  StatCard.tsx                  -- 숫자 + 트렌드 화살표 카드
  DataTable.tsx                 -- 정렬/필터/페이지네이션 범용 테이블
  StatusBadge.tsx               -- 상태 뱃지 (active/inactive/suspended)
  TimeChart.tsx                 -- D3 시계열 차트 (재사용)
  PieChart.tsx                  -- D3 파이 차트
  ConfirmModal.tsx              -- 위험 액션 확인 모달
  SearchFilter.tsx              -- 검색 + 필터 바
  AuditLogTimeline.tsx          -- 감사 로그 타임라인
```

### 4-3. Support AI 전용 컴포넌트

```
src/components/admin/support/
  TicketList.tsx                -- 티켓 목록 (상태별 탭, 카테고리 필터)
  TicketDetail.tsx              -- 티켓 상세 레이아웃
  ConversationThread.tsx        -- 이메일 대화 타임라인 (인바운드/아웃바운드 버블)
  AIDraftPanel.tsx              -- AI 초안 표시 + 편집 + 승인/거절 버튼
  AIDraftDiff.tsx               -- AI 원본 vs 관리자 수정 diff 뷰
  TicketMetaPanel.tsx           -- 우측 패널 (카테고리, 우선순위, 담당자, 유저 정보)
  FAQEditor.tsx                 -- FAQ CRUD 에디터
  EscalationRuleEditor.tsx      -- 에스컬레이션 룰 설정 UI
  KPICards.tsx                  -- 응답률, 평균시간, AI정확도 카드
  KPIChart.tsx                  -- KPI 추이 차트
  AutoModeToggle.tsx            -- 자동/수동 발송 모드 토글
```

### 4-4. Store (Zustand)

```
src/store/admin/
  useAdminStore.ts              -- 현재 선택된 메뉴, 필터 상태
  useTicketStore.ts             -- 티켓 목록, 선택된 티켓, 실시간 업데이트
  useSystemStore.ts             -- 시스템 메트릭 캐시
```

### 4-5. 데이터 Fetching

- SWR 사용 (yua-console 기존 패턴)
- 실시간 업데이트: 티켓/시스템 상태는 SSE 또는 10초 polling
- Admin API 전용 fetcher: JWT 토큰 + admin role 검증

---

## 5. Support AI 파이프라인 흐름

### 5-1. 이메일 수신 -> 티켓 생성

```
1. Gmail API (Pub/Sub) 또는 SendGrid Inbound Parse
   -> POST /api/webhook/email/inbound

2. Email Ingestion Worker (yua-backend)
   a. 서명 검증 (HMAC / OAuth)
   b. 이메일 파싱 (from, subject, body, attachments)
   c. 중복 체크 (external_email_id)
   d. support_tickets INSERT (status: 'new')
   e. support_messages INSERT (direction: 'inbound')
   f. 유저 매칭 (from_email -> users.email -> linked_user_id)
```

### 5-2. AI 분류 + 초안 생성

```
3. Support AI Engine (비동기 Worker / Bull Queue)
   a. 티켓 상태 -> 'ai_processing'

   b. 분류 (Classification):
      - LLM에 subject + body 전달
      - 출력: category, priority, intent summary
      - 티켓 업데이트

   c. 에스컬레이션 체크:
      - support_escalation_rules 순회
      - 조건 매칭 시 -> status: 'escalated', 관리자 알림
      - 매칭 없으면 계속

   d. FAQ 검색 (RAG):
      - body 임베딩 생성 (OpenAI text-embedding-3-small)
      - pgvector cosine similarity 검색 (TOP 5)
      - 유사도 >= 0.8인 FAQ를 context로 포함

   e. 실시간 데이터 참조 (선택적):
      - linked_user_id가 있으면: 구독 상태, 최근 사용량, 최근 에러 로그
      - 카테고리가 billing이면: 결제 히스토리

   f. 답변 초안 생성:
      - System prompt: "YUA 고객지원 담당자로서 정중하게 답변..."
      - Context: FAQ 결과 + 유저 데이터 + 이메일 원문
      - 출력: 답변 텍스트 + confidence score
      - support_messages INSERT (sender_type: 'ai', ai_confidence)
      - 티켓 상태 -> 'ai_drafted'
```

### 5-3. 승인/발송

```
4-A. 자동 발송 모드 (confidence >= 0.9 AND 에스컬레이션 미해당):
   a. 티켓 상태 -> 'approved' -> 'sent'
   b. 이메일 발송 (SendGrid / Gmail API)
   c. support_messages UPDATE (sent_at, email_message_id)
   d. KPI 업데이트

4-B. 수동 승인 모드 (기본):
   a. Admin UI 알림 (SSE / 웹소켓)
   b. 관리자가 TicketDetail에서:
      - AI 초안 확인
      - 그대로 승인 -> POST /approve
      - 수정 후 발송 -> POST /edit-send
      - 거절 + 직접 작성 -> POST /reply
   c. 이메일 발송
   d. 티켓 상태 -> 'sent' -> (고객 응답 시 재오픈 가능)
```

### 5-4. 후속 대화 처리

```
5. 고객 재응답 수신:
   a. In-Reply-To / References 헤더로 기존 티켓 매칭
   b. 기존 ticket에 새 support_message 추가
   c. 티켓 상태 -> 'new' (재오픈)
   d. 파이프라인 3번부터 재실행 (이전 대화 context 포함)
```

### 5-5. KPI 집계

```
6. Cron Job (매일 00:05 KST):
   a. 전일 티켓 집계 -> support_kpi_daily INSERT
   b. 메트릭: 총 티켓 수, 자동해결, 수동해결, 에스컬레이션, 평균 응답/해결 시간
   c. AI 정확도 = (수정 없이 승인된 수) / (AI 초안 생성 수)
```

---

## 6. 기술 스택 선택 근거

| 항목 | 선택 | 근거 |
|------|------|------|
| **Admin UI 위치** | yua-console 확장 | 이미 JWT 인증, D3, Monaco, 관리형 UI 존재. yua-web (Firebase 인증)과 분리된 관리 체계 유지 |
| **Admin API 위치** | yua-backend 확장 | DB 연결, 인증 미들웨어, 기존 라우터 패턴 재사용. 별도 서비스 분리는 오버엔지니어링 |
| **이메일 수신** | SendGrid Inbound Parse (1순위) / Gmail Pub/Sub (대안) | SendGrid: webhook 한 줄로 수신 가능, 파싱 자동. Gmail Pub/Sub: 이미 Gmail 사용 시 자연스럽지만 설정 복잡 |
| **이메일 발송** | SendGrid API | 템플릿 관리, 발송 추적, 바운스 처리 기본 제공. SMTP 직접 보다 안정적 |
| **FAQ 검색** | pgvector (cosine similarity) | 이미 pgvector 설치/사용 중 (memory 시스템). 별도 벡터DB 불필요 |
| **AI 답변 생성** | Claude API (기본) / GPT-4o (fallback) | 기존 provider-selector.ts 패턴 활용. 고객 응대에는 Claude의 톤이 적합 |
| **비동기 처리** | Bull Queue (Redis) | Redis 이미 운영 중. 이메일 처리는 비동기 필수 (LLM 호출 3-10초) |
| **실시간 알림** | SSE (기존 stream-router 패턴 확장) | WebSocket 추가 없이 기존 SSE 인프라 재사용 |
| **차트/시각화** | D3 (기존) | yua-console에 이미 D3 + Sankey 구현 존재. Recharts 등 추가 의존성 불필요 |
| **인증/권한** | 기존 JWT + role 확장 | yua-console은 JWT 기반 자체 인증. role에 'superadmin' 추가로 충분 |

### Support AI LLM 프롬프트 전략

```
[System]
당신은 YUA ONE (yuaone.com) 고객지원 담당자입니다.
- 정중하고 전문적인 톤을 유지합니다
- 확실하지 않은 정보는 추측하지 않고 "확인 후 안내드리겠습니다"로 답합니다
- 기술적 문제는 구체적인 해결 단계를 제시합니다

[Context]
FAQ 참조: {faq_results}
유저 정보: {user_data}  // 구독, 사용량 등
이전 대화: {thread_history}

[User Email]
제목: {subject}
본문: {body}

[Instructions]
1. 이메일에 적절한 답변을 작성하세요
2. confidence (0~1)를 함께 출력하세요
3. 에스컬레이션이 필요하면 escalate: true를 출력하세요
```

---

## 7. 구현 우선순위

### P0 — 핵심 (즉시, 1-2주)

| # | 항목 | 패키지 | 설명 |
|---|------|--------|------|
| 0-1 | Admin 인증/권한 미들웨어 | yua-backend | `requireAdminRole` 미들웨어, JWT role 'admin'/'superadmin' 검증 |
| 0-2 | Admin 대시보드 레이아웃 | yua-console | `/admin` 라우트, AdminSidebar, AdminHeader, 기본 StatCard |
| 0-3 | 사용자 관리 API + UI | backend + console | 유저 목록/상세/상태변경. 기존 MySQL users 테이블 활용 |
| 0-4 | 스레드 모니터링 API + UI | backend + console | 기존 chat_threads/chat_messages 조회. 읽기 전용 |
| 0-5 | 시스템 상태 API | yua-backend | PM2 API, pg pool stats, Redis ping, 디스크 사용량 |

### P1 — Support AI 기반 (2-4주)

| # | 항목 | 패키지 | 설명 |
|---|------|--------|------|
| 1-1 | Support DB 스키마 | yua-backend | tickets, messages, faq, escalation_rules 테이블 생성 |
| 1-2 | 이메일 수신 웹훅 | yua-backend | SendGrid Inbound Parse -> 티켓 생성 |
| 1-3 | Support AI Engine | yua-backend | 분류 + FAQ RAG + 초안 생성 파이프라인 |
| 1-4 | 티켓 관리 UI | yua-console | TicketList, TicketDetail, AIDraftPanel, 승인/거절 |
| 1-5 | 이메일 발송 | yua-backend | SendGrid API 연동, 발송 + 추적 |
| 1-6 | FAQ 관리 | backend + console | CRUD + 임베딩 자동 생성 |
| 1-7 | Support 타입 SSOT | yua-shared | SupportTicket, SupportMessage, SupportFAQ 등 타입 정의 |

### P2 — 고도화 (4-6주)

| # | 항목 | 패키지 | 설명 |
|---|------|--------|------|
| 2-1 | 에스컬레이션 룰 엔진 | yua-backend | 룰 CRUD + 자동 매칭 + Slack/이메일 알림 |
| 2-2 | KPI 대시보드 | backend + console | 일별 집계 Cron + KPI 차트 UI |
| 2-3 | 자동 발송 모드 | backend + console | confidence 기반 자동/수동 전환 토글 |
| 2-4 | 워크스페이스 관리 UI | yua-console | 워크스페이스 목록/상세/설정 |
| 2-5 | AI 모델 관리 UI | yua-console | 모델 활성/비활성, rate limit 설정 |
| 2-6 | 결제/구독 관리 | backend + console | 구독 조회/조정, 환불 (Toss API 연동) |
| 2-7 | 감사 로그 | backend + console | admin_audit_log 자동 기록 + 조회 UI |
| 2-8 | 실시간 알림 | yua-backend | 새 티켓/에스컬레이션 SSE 알림 |

### P3 — 확장 (6주+)

| # | 항목 | 설명 |
|---|------|------|
| 3-1 | 후속 대화 자동 매칭 | In-Reply-To 헤더 기반 티켓 재오픈 |
| 3-2 | 다국어 지원 | 이메일 언어 감지 + 해당 언어로 답변 |
| 3-3 | 첨부파일 처리 | 스크린샷/로그 파일 분석 후 AI context에 포함 |
| 3-4 | Slack 통합 | 에스컬레이션 시 Slack 채널 알림 + 스레드 연동 |
| 3-5 | 고객 셀프서비스 포탈 | yua-web에 /support 페이지 (티켓 조회, FAQ 검색) |
| 3-6 | AI 학습 피드백 루프 | 관리자 수정 사항을 fine-tuning 데이터로 축적 |

---

## 부록: 보안 고려사항

| 항목 | 방안 |
|------|------|
| Admin 접근 제한 | JWT role 'admin'/'superadmin' 필수 + IP 화이트리스트 (선택) |
| 고객 이메일 데이터 | PII 암호화 저장 (body_text AES-256), 조회 시 복호화 |
| 감사 추적 | 모든 Admin 액션 audit_log 기록 (변경 전/후 값 포함) |
| 이메일 웹훅 | HMAC 서명 검증, IP 화이트리스트 (SendGrid IP 대역) |
| AI 답변 안전장치 | 자동 발송 전 금지어/민감정보 필터, confidence threshold 설정 가능 |
| Rate Limiting | Admin API도 rate limit 적용 (100 req/min) |
