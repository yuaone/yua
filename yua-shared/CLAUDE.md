# yua-shared — CLAUDE SSOT (Contracts/Types)

## 절대 규칙
- 이 패키지가 타입/계약의 **단일 SSOT**
- 다른 패키지에서 타입/계약을 복제/재정의 금지
- 의존성 추가: `pnpm --filter yua-shared add <dep>`

## 역할
- 공통 타입, 계약(contracts), enums, shared utils 제공
- 소비자: yua-web, yua-backend, yua-mobile, yua-console (`workspace:*`)

## 빌드/Export
- CommonJS + ESM 양쪽 export
- 진입점: `src/index.ts`
- Sub-path exports: `./chat/*`, `./stream/*`, `./types/*`

## 소스 구조 (33 파일)

### `/types/` — 공통 타입
| 파일 | 주요 export |
|------|------------|
| `common.ts` | `Tier` ("free"/"pro"/"business"/"enterprise"), `WorkspaceRole`, `ID` |
| `thinkingProfile.ts` | `ThinkingProfile` ("FAST"/"NORMAL"/"DEEP"), `ThinkingContract`, `getThinkingProfile()`, `computeDisplayElapsed()` |
| `execution-thinking.ts` | `ExecutionThinking` |
| `yuaMax.ts` | `YuaMaxV1Input`, `YuaMaxV1Hint` |
| `suggestion.ts` | `SuggestionItem`, `SuggestionPayload` |
| `ui-block.ts` | `UIBlock` (markdown/section/divider/suggestions) |
| `action-preview.ts` | `ActionPreview` (kind, source, lifecycle, frames) |

### `/auth/` — 인증
| 파일 | 주요 export |
|------|------------|
| `auth-types.ts` | `AuthUser`, `AuthProfile` |
| `auth-context.interface.ts` | `AuthStatus`, `AuthContextContract` (ensureGuestSession, signInWithGoogle, loginWithEmail, signupWithEmail, signOut, getToken, authFetch) |

### `/chat/` — 채팅
| 파일 | 주요 export |
|------|------------|
| `chat-types.ts` | `ChatRole`, `ChatMessage`, `ChatThread`, `CreateThreadResponse`, `ListThreadsResponse`, `ListMessagesResponse` |
| `attachment-types.ts` | `AttachmentMeta` |
| `studio-types.ts` | `StudioAssetType`, `StudioSystemRef` |

### `/stream/` — 스트리밍 (핵심)
| 파일 | 주요 export |
|------|------------|
| `types.ts` | `StreamEventKind`, `StreamPayload`, `StreamClientHandlers`, `StreamClientOptions` |
| `stream-reducer.ts` | `StreamUIStateKind` (IDLE/CONNECTING/READY/STREAMING/FINALIZED/DONE/ERROR), `StreamUIState`, `reduceStreamState()` |
| `stream-client.ts` | `StreamClient` 클래스 (start/stop, SSE 파싱, delta coercion, LaTeX 추적) |
| `activity.ts` | `SourceChip`, `ActivitySection`, `ActivityKind`, `ActivityStatus`, `ActivityOp`, `ActivityItem`, `ActivityEventPayload` |
| `stream-stage.ts` | `StreamStage` enum (THINKING/ANSWER/ANSWER_UNLOCKED/SYSTEM/ANALYZING_IMAGE/PREPARING_STUDIO/STUDIO_READY/SUGGESTION) |
| `thinking-fsm.ts` | `ThinkingFSM` (IDLE/THINKING/ANSWER_STREAMING/DONE) |
| `sentence.ts` | `isSentenceBoundary()` |
| `latex-utils.ts` | `containsLatex()` |

### `/workspace/`
- `workspace-types.ts` → `Workspace` (id, name, plan: Tier)

### `/api/`
- `me-response.ts` → `MeResponse` (= AuthProfile)

### `/memory/`
- `types.ts` → `MemoryScope` (6가지), `MemoryIndicatorState`, `MemoryAckPayload`
- `ui-events.ts` → `MemoryUIEvent`

### `/plan/`
- `plan.types.ts` → `Plan` ("FREE"/"PRO"/"BUSINESS"/"ENTERPRISE"), `PlanLimits`, `PLAN_LIMITS`
- `plan.policy.ts` → `canCreateProject()`, `canAccessProjects()`
- `plan.errors.ts` → `PLAN_ERROR` 상수
- `plan.mapper.ts` → `tierToPlan()`

### `/tool/`
- `yua-tool.types.ts` → `YuaToolType` (14종), `YuaExecutionTask`
- `yua-tool-result.types.ts` → `YuaToolResult<T>` (provenance 포함)
- `yua-execution-plan.types.ts` → `YuaExecutionPlan`

## 변경 가이드
- 계약 변경은 사용처(yua-web/backend/mobile/console) 영향 범위를 함께 추적
- Breaking change 절차:
  1. 타입/계약 변경
  2. 사용처 컴파일 에러 정리
  3. 런타임 영향 점검
- `index.ts` export 목록 동기화 필수
