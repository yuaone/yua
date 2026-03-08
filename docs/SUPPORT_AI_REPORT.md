# Support AI 시스템 QA 리포트

**작성일:** 2026-03-08
**검증 범위:** 백엔드 엔진, 라우터, DB 스키마, 공유 타입, 어드민 프론트엔드

---

## 1. 파이프라인 흐름 검증

| 단계 | 구현 | 파일 | 비고 |
|------|------|------|------|
| 1. 티켓 생성 | OK | `support-router.ts` POST /support/tickets | 트랜잭션 내에서 ticket + 첫 message 동시 삽입 |
| 2. 티켓 목록/상세 조회 | OK | `support-router.ts` GET /support/tickets, GET /support/tickets/:id | 유저 본인 티켓만 조회 가능 |
| 3. 유저 메시지 추가 | OK | `support-router.ts` POST /support/tickets/:id/messages | closed 티켓 차단, waiting_user -> open 자동 전환 |
| 4. AI 자동 분류 | OK | `admin-router.ts` POST /admin/tickets/:id/classify -> SupportAIEngine.classifyTicket | JSON 파싱 + 유효성 검증 포함 |
| 5. FAQ RAG 검색 | OK | `support-knowledge-repo.ts` search() | pgvector 코사인 유사도, threshold 0.7 |
| 6. AI 초안 생성 | OK | `admin-router.ts` POST /admin/tickets/:id/ai-draft -> SupportAIEngine.generateDraft | 임베딩 생성 -> RAG 검색 -> LLM 호출 -> 초안 저장 |
| 7. 초안 승인 | OK | `admin-router.ts` POST /admin/tickets/:id/approve-draft -> SupportAIEngine.approveDraft | approved_by 업데이트 |
| 8. 관리자 답변 발송 | OK | `admin-router.ts` POST /admin/tickets/:id/reply | open -> in_progress 자동 전환 |

**결론:** 전체 파이프라인 8단계 모두 구현 완료. 흐름 일관성 확인됨.

---

## 2. 백엔드 엔드포인트 검증

### 유저 대상 (support-router.ts)

| # | Method | Path | 핸들러 요약 | 검증 |
|---|--------|------|------------|------|
| 1 | POST | /support/tickets | 티켓 생성 (subject/content 필수, 길이 제한, 트랜잭션) | OK |
| 2 | GET | /support/tickets | 본인 티켓 목록 (페이지네이션) | OK |
| 3 | GET | /support/tickets/:id | 티켓 상세 + 메시지 (AI draft 필터링) | OK |
| 4 | POST | /support/tickets/:id/messages | 메시지 추가 (closed 차단) | OK |

### 관리자 대상 (admin-router.ts, endpoint #10~#22)

| # | Method | Path | 핸들러 요약 | Role | 검증 |
|---|--------|------|------------|------|------|
| 10 | GET | /admin/tickets | 전체 티켓 목록 (status/priority 필터) | support | OK |
| 11 | POST | /admin/tickets/:id/reply | 관리자 답변 (50K 제한) | support | OK |
| 12 | PATCH | /admin/tickets/:id | 티켓 상태/우선순위 변경 | support | OK |
| 15 | POST | /admin/tickets/:id/ai-draft | AI 초안 생성 | support | OK |
| 16 | POST | /admin/tickets/:id/approve-draft | 초안 승인 | support | OK |
| 17 | POST | /admin/tickets/:id/classify | AI 자동 분류 | support | OK |
| 18 | GET | /admin/tickets/:id/messages | 메시지 스레드 (is_ai_draft, approved_by 포함) | support | OK |
| 19 | GET | /admin/knowledge | 지식 베이스 목록 | support | OK |
| 20 | POST | /admin/knowledge | 지식 항목 생성 (question/answer 길이 제한, category allowlist) | admin | OK |
| 21 | PATCH | /admin/knowledge/:id | 지식 항목 수정 (변경 시 re-embedding) | admin | OK |
| 22 | DELETE | /admin/knowledge/:id | 지식 항목 soft-delete | admin | OK |

**라우트 마운트 확인:**
- `/support` -> `requireFirebaseAuth` + `withWorkspace` + `supportRouter` (index.ts:251)
- `/admin` -> `adminRouter` (admin-session 내부 인증) (index.ts:126)

---

## 3. DB 스키마 검증

### support_tickets (admin-tables.sql)

| 컬럼 | 타입 | 확인 |
|------|------|------|
| id | SERIAL PK | OK |
| workspace_id | INTEGER NOT NULL | OK |
| user_id | INTEGER NOT NULL | OK |
| subject | VARCHAR(500) NOT NULL | OK |
| category | VARCHAR(50) DEFAULT 'general' | OK |
| priority | VARCHAR(20) DEFAULT 'medium' | OK |
| status | VARCHAR(20) DEFAULT 'open' | OK |
| assigned_admin_id | INTEGER FK -> admin_users(id) | OK |
| created_at | TIMESTAMPTZ | OK |
| updated_at | TIMESTAMPTZ | OK |
| resolved_at | TIMESTAMPTZ | OK |

인덱스: `idx_tickets_status`, `idx_tickets_workspace`

### ticket_messages (admin-tables.sql)

| 컬럼 | 타입 | 확인 |
|------|------|------|
| id | SERIAL PK | OK |
| ticket_id | INTEGER FK -> support_tickets(id) | OK |
| sender_type | VARCHAR(10) NOT NULL | OK |
| sender_id | INTEGER NOT NULL | OK |
| content | TEXT NOT NULL | OK |
| is_ai_draft | BOOLEAN DEFAULT false | OK |
| approved_by | INTEGER | OK |
| created_at | TIMESTAMPTZ | OK |

인덱스: `idx_ticket_msgs_ticket`

### support_knowledge (support-ai-tables.sql)

| 컬럼 | 타입 | 확인 |
|------|------|------|
| id | SERIAL PK | OK |
| category | VARCHAR(50) DEFAULT 'general' | OK |
| question | TEXT NOT NULL | OK |
| answer | TEXT NOT NULL | OK |
| embedding | vector(1536) | OK (text-embedding-3-small 차원) |
| is_active | BOOLEAN DEFAULT true | OK |
| created_by | INTEGER | OK |
| created_at | TIMESTAMPTZ | OK |
| updated_at | TIMESTAMPTZ | OK |

인덱스: `idx_support_knowledge_embedding` (ivfflat, lists=20), `idx_support_knowledge_category`

### ticket_classifications (support-ai-tables.sql)

| 컬럼 | 타입 | 확인 |
|------|------|------|
| id | SERIAL PK | OK |
| ticket_id | INTEGER FK -> support_tickets(id) | OK |
| suggested_category | VARCHAR(50) | OK |
| suggested_priority | VARCHAR(20) | OK |
| confidence | REAL | OK |
| applied | BOOLEAN DEFAULT false | OK |
| created_at | TIMESTAMPTZ | OK |

---

## 4. AI 엔진 검증 (support-ai-engine.ts)

### SupportAIEngine.generateDraft(ticketId)

| 단계 | 구현 | 비고 |
|------|------|------|
| 티켓 로드 | OK | subject, category, priority 조회 |
| 전체 메시지 로드 | OK | ASC 정렬 |
| 마지막 유저 메시지 추출 | OK | reverse + find(sender_type=user) |
| 임베딩 생성 | OK | subject + lastUserMsg |
| RAG 검색 | OK | top 5, threshold 0.7 |
| 프롬프트 구성 | OK | ticket info + FAQ + history |
| LLM 호출 | OK | gpt-4o-mini, max_tokens 1024 |
| 초안 DB 저장 | OK | is_ai_draft=true, sender_type='ai' |
| 소스 반환 | OK | id, question, similarity |

### SupportAIEngine.classifyTicket(ticketId)

| 단계 | 구현 | 비고 |
|------|------|------|
| 티켓 subject 로드 | OK | |
| 첫 유저 메시지 로드 | OK | ASC LIMIT 1 |
| LLM 호출 | OK | JSON 형식 요청 |
| JSON 파싱 | OK | regex match + JSON.parse |
| 유효성 검증 | OK | validCategories, validPriorities allowlist |
| DB 저장 | OK | ticket_classifications 테이블 |

### SupportAIEngine.approveDraft(ticketId, messageId, adminId)

| 단계 | 구현 | 비고 |
|------|------|------|
| 조건부 UPDATE | OK | is_ai_draft=true AND approved_by IS NULL |
| rowCount 검증 | OK | 0이면 실패 반환 |

---

## 5. RAG 파이프라인 검증

| 단계 | 구현 | 파일 | 비고 |
|------|------|------|------|
| 임베딩 모델 | OK | support-knowledge-repo.ts | OpenAI text-embedding-3-small (1536차원) |
| 지식 생성 시 임베딩 | OK | create() | 비동기 (응답 블로킹 안 함) |
| 지식 수정 시 재임베딩 | OK | update() | question/answer 변경 시만 |
| 코사인 유사도 검색 | OK | search() | `1 - (embedding <=> query::vector)` |
| 임계치 필터링 | OK | search() | 코드에서 threshold >= 0.7 필터 |
| IVFFlat 인덱스 | OK | SQL | lists=20, vector_cosine_ops |
| 소프트 삭제 | OK | softDelete() | is_active=false |
| 비활성 항목 제외 | OK | search() | `WHERE is_active = true AND embedding IS NOT NULL` |

---

## 6. 프론트-백 연동 검증

### tickets/page.tsx

| 프론트 호출 | 백엔드 매칭 | 검증 |
|------------|------------|------|
| GET /admin/tickets?page=&limit=&status= | admin-router #10 | OK |
| GET /admin/tickets/:id/messages | admin-router #18 | OK |
| POST /admin/tickets/:id/reply {content} | admin-router #11 | OK |
| POST /admin/tickets/:id/ai-draft | admin-router #15 | OK |
| POST /admin/tickets/:id/approve-draft {messageId} | admin-router #16 | OK |
| POST /admin/tickets/:id/classify | admin-router #17 | OK |
| PATCH /admin/tickets/:id {status} | admin-router #12 | OK |
| PATCH /admin/tickets/:id {priority} | admin-router #12 | OK |

### knowledge/page.tsx

| 프론트 호출 | 백엔드 매칭 | 검증 |
|------------|------------|------|
| GET /admin/knowledge?page=&limit=&category= | admin-router #19 | OK |
| POST /admin/knowledge {category, question, answer} | admin-router #20 | OK |
| PATCH /admin/knowledge/:id {category, question, answer} | admin-router #21 | OK |
| DELETE /admin/knowledge/:id | admin-router #22 | OK |

### support/page.tsx (대시보드)

| 상태 | 비고 |
|------|------|
| Mock 데이터 사용 중 | `// TODO: Replace with real API calls` 주석 존재 |
| 백엔드 /admin/support/stats 미구현 | 대시보드용 통계 API 없음 |

---

## 7. 발견된 이슈

### P0 (Critical) -- 없음

현재 시스템에 런타임 크래시나 데이터 무결성 위반 이슈는 발견되지 않음.

### P1 (High)

| # | 이슈 | 위치 | 상세 |
|---|------|------|------|
| P1-1 | **코드 주석과 실제 호출 불일치: "Call Claude" vs OpenAI** | support-ai-engine.ts:128, 178 | 주석에 "Call Claude"라고 되어 있으나 실제로는 `callLLM()`이 OpenAI gpt-4o-mini를 호출함. 혼동 유발. |
| P1-2 | **분류 결과가 ticket_classifications에만 저장되고 support_tickets에 자동 반영 안 됨** | support-ai-engine.ts classifyTicket + tickets/page.tsx handleClassify | classifyTicket()은 ticket_classifications 테이블에만 INSERT하고 support_tickets.category는 갱신하지 않음. 프론트에서 별도 PATCH로 priority만 반영하고 category는 PATCH하지 않음 (로컬 state만 변경). |
| P1-3 | **CATEGORY_COLORS에 "question" 존재하나 유효 카테고리에 없음** | tickets/page.tsx:54 | CATEGORY_COLORS에 `question: "#3b82f6"` 정의되어 있으나, 백엔드의 validCategories는 ["bug", "billing", "account", "feature", "general"]이므로 "question"은 매칭 불가. 반면 "feature", "bug"의 색상은 정의되어 있어 기능에는 문제 없으나 불일치. |
| P1-4 | **priority ORDER BY에 'critical' 존재하나 VALID_PRIORITIES에 없음** | admin-router.ts:447 vs 539 | 티켓 목록 쿼리의 ORDER BY에 `'critical'`이 최우선이지만, VALID_PRIORITIES에는 "critical"이 포함되지 않아 실제로 critical 우선순위를 가진 티켓이 생성될 수 없음. 죽은 코드. |

### P2 (Medium)

| # | 이슈 | 위치 | 상세 |
|---|------|------|------|
| P2-1 | **Support 대시보드(/support)가 전부 Mock 데이터** | support/page.tsx:73-94 | TODO 주석만 있고 실제 API 호출 없음. 배포 시 의미 없는 더미 통계가 노출됨. |
| P2-2 | **임베딩 생성 실패 시 사일런트 실패** | support-knowledge-repo.ts:115-120 | create()에서 임베딩 생성은 fire-and-forget. 실패해도 knowledge 항목은 생성되나 embedding=NULL이 되어 RAG 검색에 포함 안 됨. 관리자에게 실패 알림 없음. |
| P2-3 | **handleClassify에서 category가 백엔드에 PATCH되지 않음** | tickets/page.tsx:177-182 | PATCH body에 priority만 포함, category 누락. setSelected로 로컬 state만 갱신하므로 새로고침 시 분류 결과 사라짐. |
| P2-4 | **ticket_classifications.applied 컬럼 미활용** | support-ai-tables.sql:25 + support-ai-engine.ts | classifyTicket()에서 INSERT 시 applied=false(default)만 저장하고, 분류가 적용되었을 때 applied=true로 업데이트하는 로직이 어디에도 없음. |
| P2-5 | **support_tickets에 유저/워크스페이스 기반 인덱스 부재** | admin-tables.sql | `idx_tickets_status`, `idx_tickets_workspace`는 있으나 `user_id` 인덱스가 없음. 유저별 티켓 조회(GET /support/tickets)에서 풀 스캔 가능. |
| P2-6 | **yua-shared 타입이 백엔드에서 사용되지 않음** | support-ai-engine.ts, support-knowledge-repo.ts | SupportKnowledgeEntry, TicketClassification, AIDraftResult 등의 타입이 yua-shared에 정의되어 있으나, 백엔드 코드에서는 전부 `any` 타입으로 반환. SSOT 원칙 위반. |
| P2-7 | **IVFFlat 인덱스 lists=20은 소규모에 최적화** | support-ai-tables.sql:15 | 지식 베이스 항목이 수천 건 이상으로 늘어나면 lists 값 재조정 필요. 현재는 적정. |
| P2-8 | **Support dashboard에서 "bug"/"feature" 카테고리 미표시** | support/page.tsx:31-36 | CATEGORY_COLORS에 billing/technical/account/general만 정의. 실제 시스템 카테고리인 bug/feature가 누락. "technical"은 유효 카테고리가 아님. |

---

## 요약

| 등급 | 건수 | 핵심 |
|------|------|------|
| P0 | 0 | -- |
| P1 | 4 | 주석 불일치, 분류 결과 미반영, 카테고리 맵 불일치, 죽은 코드 |
| P2 | 8 | Mock 대시보드, 사일런트 임베딩 실패, PATCH 누락, 타입 미활용 등 |

**전체 판정:** 핵심 파이프라인(티켓 생성 -> RAG -> 초안 생성 -> 승인)은 정상 작동 가능. P1-2/P2-3의 분류 결과 미반영 이슈가 가장 실질적인 버그이며, 우선 수정 권장.
