# YUA Admin Frontend-Backend Integration Audit Report

> 감사 일자: 2026-03-08
> 감사 대상: yua-admin (20 pages) + yua-backend admin-router (25 endpoints) + support-router (4 endpoints)
> 작성: Claude Opus 4.6 Audit Agent

---

## 1. 페이지별 API 연동 현황

### 1.1 실제 API 호출이 있는 페이지 (Live)

| 페이지 | 경로 | 호출 API | 백엔드 존재 | 상태 |
|--------|------|----------|:-----------:|:----:|
| 대시보드 | `/` | `GET /admin/stats` | O | LIVE |
| 유저 관리 | `/users` | `GET /admin/users?page&limit&search` | O | LIVE |
| 유저 상세 | `/users/[id]` | `GET /admin/users/:id` | O | LIVE |
| 유저 상세 (수정) | `/users/[id]` | `PATCH /admin/users/:id` | O | LIVE |
| 워크스페이스 | `/workspaces` | `GET /admin/workspaces?page&limit` | O | LIVE |
| 워크스페이스 상세 | `/workspaces/[id]` | `GET /admin/workspaces/:id` | O | LIVE |
| 스레드 브라우저 | `/threads` | `GET /admin/threads?page&limit` | O | LIVE |
| 스레드 메시지 | `/threads` (패널) | `GET /admin/threads/:id/messages` | O | LIVE |
| 티켓 관리 | `/tickets` | `GET /admin/tickets?page&status` | O | LIVE |
| 티켓 메시지 | `/tickets` (패널) | `GET /admin/tickets/:id/messages` | O | LIVE |
| 티켓 답변 | `/tickets` (패널) | `POST /admin/tickets/:id/reply` | O | LIVE |
| 티켓 상태변경 | `/tickets` (패널) | `PATCH /admin/tickets/:id` | O | LIVE |
| AI 초안 생성 | `/tickets` (패널) | `POST /admin/tickets/:id/ai-draft` | O | LIVE |
| AI 초안 승인 | `/tickets` (패널) | `POST /admin/tickets/:id/approve-draft` | O | LIVE |
| AI 분류 | `/tickets` (패널) | `POST /admin/tickets/:id/classify` | O | LIVE |
| 지식 베이스 | `/knowledge` | `GET /admin/knowledge?page&category` | O | LIVE |
| 지식 생성 | `/knowledge` | `POST /admin/knowledge` | O | LIVE |
| 지식 수정 | `/knowledge` | `PATCH /admin/knowledge/:id` | O | LIVE |
| 지식 삭제 | `/knowledge` | `DELETE /admin/knowledge/:id` | O | LIVE |
| 실시간 모니터 | `/monitor` | `SSE /admin/monitor/stream` | O | LIVE |
| 감사 로그 | `/audit` | `GET /admin/audit?page&action` | O | LIVE |
| 매출 대시보드 | `/revenue` | `GET /admin/stats/revenue` | O | LIVE |
| 매출 일별 | `/revenue` | `GET /admin/stats/revenue/daily?days` | O | LIVE |
| 고객 관리 (통계) | `/customers` | `GET /admin/stats/customers` | O | LIVE |
| 고객 관리 (목록) | `/customers` | `GET /admin/customers?page&search&plan&sort&dir` | O | LIVE |

### 1.2 Mock 데이터만 사용하는 페이지 (API 미연동)

| 페이지 | 경로 | 필요 API | 백엔드 존재 | 상태 |
|--------|------|----------|:-----------:|:----:|
| 설정 | `/settings` | 없음 (하드코딩) | X | MOCK |
| Support AI 대시보드 | `/support` | `GET /admin/support/stats` | X | MOCK |
| Support AI 설정 | `/support/settings` | `GET/POST/PATCH/DELETE /admin/support/escalation-rules` | X | MOCK |
| Support AI 설정 | `/support/settings` | `GET/PATCH /admin/support/auto-send-config` | X | MOCK |
| Support AI 설정 | `/support/settings` | `GET /admin/support/faq-stats` | X | MOCK |
| IAM 멤버 관리 | `/iam/members` | `GET /admin/iam/members` | X | MOCK |
| IAM 멤버 관리 | `/iam/members` | `POST /admin/iam/members/invite` | X | MOCK |
| IAM 멤버 관리 | `/iam/members` | `PATCH /admin/iam/members/:id/role` | X | MOCK |
| IAM 멤버 관리 | `/iam/members` | `DELETE /admin/iam/members/:id` | X | MOCK |
| IAM 역할/권한 | `/iam/roles` | 없음 (정적 매트릭스) | - | STATIC |
| 구독 매출 상세 | `/revenue/subscription` | `GET /admin/stats/revenue/subscription` | X | MOCK |
| API 매출 상세 | `/revenue/api` | `GET /admin/stats/revenue/api` | X | MOCK |

---

## 2. 미구현 API 목록 (프론트에서 필요하나 백엔드에 없음)

| 우선순위 | Endpoint | 사용처 | 설명 |
|:--------:|----------|--------|------|
| P0 | `GET /admin/iam/members` | `/iam/members` | IAM 멤버 목록 조회 |
| P0 | `POST /admin/iam/members/invite` | `/iam/members` | 직원 초대 |
| P0 | `PATCH /admin/iam/members/:id/role` | `/iam/members` | 역할 변경 |
| P0 | `DELETE /admin/iam/members/:id` | `/iam/members` | 멤버 삭제 |
| P1 | `GET /admin/support/stats` | `/support` | Support AI 통계 대시보드 |
| P1 | `CRUD /admin/support/escalation-rules` | `/support/settings` | 에스컬레이션 규칙 관리 |
| P1 | `GET/PATCH /admin/support/auto-send-config` | `/support/settings` | 자동 전송 설정 |
| P1 | `GET /admin/support/faq-stats` | `/support/settings` | FAQ 사용 통계 |
| P2 | `GET /admin/stats/revenue/subscription` | `/revenue/subscription` | 구독 상세 (MRR, churn, ARPU, 인보이스) |
| P2 | `GET /admin/stats/revenue/api` | `/revenue/api` | API 매출 상세 (모델별, 상위 유저, 거래) |
| P2 | `GET/PATCH /admin/settings` | `/settings` | 시스템 설정 (유지보수 모드, rate limit 등) |

**총 미구현: 14개 endpoint (4 P0, 4 P1, 6 P2)**

---

## 3. 미사용 API 목록 (백엔드에 있지만 프론트에서 사용하지 않음)

| Endpoint | 백엔드 위치 | 상태 |
|----------|-------------|------|
| (없음) | - | 모든 백엔드 endpoint가 프론트에서 사용됨 |

**참고**: admin-router의 25개 endpoint 전부 yua-admin 프론트에서 호출하고 있음. support-router (4개)는 유저향이므로 yua-admin 대상이 아님.

---

## 4. 타입 정합성

### 4.1 yua-shared 정의 타입 (admin-types.ts)

| 타입 | 정의 위치 | 프론트 사용 | 백엔드 사용 |
|------|-----------|:-----------:|:-----------:|
| `AdminRole` | admin-types.ts | `/iam/members`, `/iam/roles` | admin-router (requireRole) |
| `AdminMemberStatus` | admin-types.ts | `/iam/members` | 미사용 (IAM 미구현) |
| `AdminUser` | admin-types.ts | 미사용 (로컬 interface 정의) | 미사용 |
| `AdminMember` | admin-types.ts | 미사용 (로컬 Member interface) | 미사용 (IAM 미구현) |
| `PermissionLevel` | admin-types.ts | `/iam/roles` | 미사용 |
| `PermissionMatrixRow` | admin-types.ts | 미사용 (로컬 MatrixRow) | 미사용 |
| `AdminSession` | admin-types.ts | 미사용 | admin-session.ts |
| `AdminAuditLog` | admin-types.ts | 미사용 (로컬 AuditLog) | 미사용 |

### 4.2 yua-shared 정의 타입 (support-types.ts)

| 타입 | 정의 위치 | 프론트 사용 | 백엔드 사용 |
|------|-----------|:-----------:|:-----------:|
| `TicketCategory` | support-types.ts | 미사용 (string 사용) | 미사용 (string 리터럴) |
| `TicketPriority` | support-types.ts | 미사용 (string 사용) | 미사용 (string 리터럴) |
| `TicketStatus` | support-types.ts | 미사용 (string 사용) | 미사용 (string 리터럴) |
| `SupportTicket` | support-types.ts | 미사용 (로컬 Ticket) | 미사용 |
| `TicketMessage` | support-types.ts | 미사용 (로컬 TicketMsg) | 미사용 |
| `SupportKnowledgeEntry` | support-types.ts | 미사용 (로컬 KnowledgeEntry) | support-knowledge-repo |
| `TicketClassification` | support-types.ts | 미사용 | support-ai-engine |
| `AIDraftResult` | support-types.ts | 미사용 | support-ai-engine |

### 4.3 타입 정합성 결론

**심각도: MEDIUM**

- yua-shared에 타입이 정의되어 있으나, 프론트엔드 페이지에서 대부분 로컬 interface를 재정의하고 있음
- `AdminRole`, `AdminMemberStatus`, `PermissionLevel`만 import해서 사용 중 (`/iam/members`, `/iam/roles`)
- 나머지 18개 페이지는 전부 로컬 interface 사용 → yua-shared SSOT 원칙 위반
- 백엔드도 support-types의 enum 타입(`TicketCategory` 등)을 import하지 않고 string 리터럴로 validation

---

## 5. Support AI 파이프라인 체크

### 5.1 백엔드 구성 요소

| 구성 요소 | 파일 | 상태 |
|-----------|------|:----:|
| SupportAIEngine | `support-ai/support-ai-engine.ts` | 존재 |
| SupportKnowledgeRepo | `support-ai/support-knowledge-repo.ts` | 존재 |
| AI Draft 생성 | `POST /admin/tickets/:id/ai-draft` | 구현 완료 |
| AI Draft 승인 | `POST /admin/tickets/:id/approve-draft` | 구현 완료 |
| AI 분류 | `POST /admin/tickets/:id/classify` | 구현 완료 |
| Knowledge CRUD | `GET/POST/PATCH/DELETE /admin/knowledge` | 구현 완료 |
| Ticket Messages | `GET /admin/tickets/:id/messages` | 구현 완료 |
| pgvector RAG | SupportKnowledgeRepo 내 | 구현 완료 |

### 5.2 프론트엔드 파이프라인

| 기능 | 구현 상태 | 연동 상태 |
|------|:---------:|:---------:|
| 티켓 목록 + 필터 | 완료 | LIVE |
| 티켓 메시지 스레드 (user/admin/ai 구분) | 완료 | LIVE |
| AI 초안 생성 버튼 | 완료 | LIVE |
| AI 초안 textarea 자동 채움 | 완료 | LIVE |
| AI 소스 표시 (similarity %) | 완료 | LIVE |
| AI 초안 승인 버튼 | 완료 | LIVE |
| AI 자동 분류 버튼 | 완료 | LIVE |
| 관리자 답변 전송 | 완료 | LIVE |
| 상태 변경 (5가지) | 완료 | LIVE |
| Knowledge Base CRUD | 완료 | LIVE |
| 카테고리 필터 | 완료 | LIVE |

### 5.3 미구현 파이프라인 (설계 문서 대비)

| 기능 | 설계 문서 섹션 | 상태 |
|------|---------------|:----:|
| Support AI 통계 대시보드 | Section 3 `/support` | MOCK (API 없음) |
| 에스컬레이션 규칙 관리 | Section 3 `/support/settings` | MOCK (API 없음) |
| 자동 전송 모드 설정 | Section 3 `/support/settings` | MOCK (API 없음) |
| FAQ 사용 통계 (hitCount) | Section 3 `/support/settings` | MOCK (API 없음) |

### 5.4 결론

핵심 파이프라인 (AI Draft -> 승인 -> 전송, 분류, Knowledge CRUD)은 **완전히 동작**. Support 대시보드/설정 페이지의 통계/에스컬레이션 기능은 UI만 있고 API 미구현.

---

## 6. 디자인 정합성 (설계 문서 Section 3 대비)

### 6.1 라우트별 구현 완성도

| 설계 문서 라우트 | 구현 상태 | API 연동 | 완성도 |
|-----------------|:---------:|:--------:|:------:|
| `/` (대시보드) | O | LIVE | 100% |
| `/users` | O | LIVE | 95% (role/plan/status 필터 프론트만, 백엔드 search만) |
| `/users/[id]` | O | LIVE | 90% (recentThreads 백엔드 미반환) |
| `/workspaces` | O | LIVE | 90% (search 파라미터 프론트에서 전송하나 백엔드 미처리) |
| `/iam` | O (redirect) | - | 100% |
| `/iam/members` | O | MOCK | 40% (UI 완성, API 0%) |
| `/iam/roles` | O | STATIC | 80% (정적 매트릭스, 동적 관리 없음) |
| `/revenue` | O | LIVE | 100% |
| `/revenue/api` | O | MOCK | 50% (UI 완성, API 0%) |
| `/revenue/subscription` | O | MOCK | 50% (UI 완성, API 0%) |
| `/revenue/invoices` | X | - | 0% (미구현) |
| `/support` | O | MOCK | 50% (UI 완성, API 0%) |
| `/support/tickets` | 통합→`/tickets` | LIVE | 100% |
| `/support/tickets/[id]` | 통합→`/tickets` 패널 | LIVE | 100% |
| `/support/settings` | O | MOCK | 40% (UI 완성, API 0%) |
| `/system` | 통합→`/monitor` | LIVE | 85% (CPU, req/min 미반환) |
| `/models` | X | - | 0% (미구현) |
| `/logs` | 통합→`/audit` | LIVE | 100% |

### 6.2 설계 문서에 없지만 구현된 페이지

| 페이지 | 경로 | 상태 |
|--------|------|:----:|
| 티켓 관리 (독립) | `/tickets` | LIVE |
| 지식 베이스 | `/knowledge` | LIVE |
| 고객 관리 | `/customers` | LIVE |
| 설정 | `/settings` | MOCK |

### 6.3 종합 구현 완성도

| 영역 | 설계 항목 수 | 구현 완료 | 완성도 |
|------|:-----------:|:---------:|:------:|
| 라우트 구조 | 18 | 15 | 83% |
| API Live 연동 | 25 endpoint | 25 | 100% |
| 전체 페이지 API 연동 | 20 pages | 12 | 60% |
| IAM 시스템 | 4 endpoint | 0 | 0% |
| Support AI 부가 기능 | 5 endpoint | 0 | 0% |
| 매출 상세 | 2 endpoint | 0 | 0% |

**전체 구현 완성도: ~68%**

---

## 7. 권장 수정 사항

### P0 (즉시 수정 필요)

| # | 항목 | 상세 | 파일 |
|---|------|------|------|
| P0-1 | **IAM 백엔드 API 구현** | admin-router에 IAM CRUD 4개 endpoint 추가 필요 (admin_users 테이블 기반). 현재 IAM/members 페이지 완전 Mock | `admin-router.ts` |
| P0-2 | **유저 상세 recentThreads 미반환** | 프론트가 `res.data.recentThreads`를 기대하나 백엔드 `GET /admin/users/:id`에서 반환하지 않음 | `admin-router.ts` L72-113, `users/[id]/page.tsx` L75 |
| P0-3 | **워크스페이스 검색 미지원** | 프론트가 `search` 쿼리 전송하나 백엔드 `GET /admin/workspaces`에서 search 처리 없음 | `admin-router.ts` L265-288 |
| P0-4 | **유저 목록 role/plan/status 필터 미지원** | 프론트 UI에 role, plan, status 필터 셀렉트가 있으나, 백엔드는 search만 처리. 필터 값이 전송되지 않음 (프론트도 전송 안 함) | `users/page.tsx` L80-93, `admin-router.ts` L36-67 |

### P1 (1-2주 내 수정)

| # | 항목 | 상세 | 파일 |
|---|------|------|------|
| P1-1 | **yua-shared 타입 import 통일** | 18개 페이지에서 로컬 interface 재정의 대신 yua-shared의 SupportTicket, TicketMessage, AdminAuditLog 등을 import해야 함 | 전체 page.tsx |
| P1-2 | **Support AI 통계 API 구현** | `/support` 대시보드에 필요한 통계 endpoint. support_tickets + ticket_messages 집계 쿼리 | `admin-router.ts` |
| P1-3 | **모니터 CPU/req-per-min 미반환** | 프론트가 `metrics.cpu`, `metrics.reqPerMin`을 렌더하나 백엔드 SSE에서 이 필드를 보내지 않음 (항상 undefined) | `admin-router.ts` L634-700, `monitor/page.tsx` L17-18 |
| P1-4 | **워크스페이스 상세 usage 미반환** | 프론트가 `res.data.usage` (threadCount, messageCount, storageUsedMB) 기대하나 백엔드 미반환 | `admin-router.ts` L293-340, `workspaces/[id]/page.tsx` L58-60 |
| P1-5 | **감사 로그 admin 필터 파라미터 불일치** | 프론트가 `admin` 쿼리 파라미터 전송, 백엔드는 `admin_id` (숫자) 기대 | `audit/page.tsx` L77, `admin-router.ts` L588 |

### P2 (추후 개선)

| # | 항목 | 상세 |
|---|------|------|
| P2-1 | **구독 매출 상세 API** | `/revenue/subscription` 페이지용 MRR, churn, ARPU, 인보이스 endpoint |
| P2-2 | **API 매출 상세 API** | `/revenue/api` 페이지용 모델별 사용량, 상위 유저, 크레딧 거래 endpoint |
| P2-3 | **에스컬레이션 규칙 테이블 + API** | DB 스키마 + CRUD endpoint for `/support/settings` |
| P2-4 | **설정 페이지 API 연동** | 유지보수 모드 토글, rate limit 설정 등 동적 관리 |
| P2-5 | **인보이스 관리 페이지** | 설계 문서 `/revenue/invoices` 미구현 |
| P2-6 | **AI 모델 설정 페이지** | 설계 문서 `/models` 미구현 |
| P2-7 | **Support ticket 개별 상세 페이지** | 설계 문서 `/support/tickets/[id]` — 현재 `/tickets` 사이드패널로 통합 |
| P2-8 | **백엔드 support-types enum 활용** | admin-router에서 `TicketCategory`, `TicketPriority` 등 yua-shared 타입 import하여 validation에 사용 |

---

## 부록: 전체 매핑 요약

```
yua-admin 페이지 (20개)
  LIVE API 연동: 12개 (60%)
  MOCK/STATIC:   8개 (40%)

admin-router endpoint (25개)
  프론트 사용:   25개 (100%)
  프론트 미사용: 0개

미구현 endpoint (프론트 필요): 14개
  P0: 4개 (IAM CRUD)
  P1: 4개 (Support stats, escalation, auto-send, FAQ stats)
  P2: 6개 (revenue detail, settings, etc.)

타입 SSOT 준수율: ~10% (2/20 페이지만 yua-shared import)
```
