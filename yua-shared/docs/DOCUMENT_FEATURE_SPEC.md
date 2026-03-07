# YUA Document -- 기능 명세 (Notion-level)

> **작성일:** 2026-03-06
> **대상 패키지:** yua-web (에디터 UI), yua-backend (API/WS/DB), yua-shared (계약/타입)
> **참조:** Notion 전수조사 결과 (본 문서 하단)

---

## Phase 1: MVP (필수)

### 1.1 블록 에디터 코어

| 기능 | 설명 | 우선순위 |
|------|------|----------|
| **텍스트 블록 (Paragraph)** | 기본 텍스트 입력. Enter로 새 블록 생성 | P0 |
| **헤딩 (H1/H2/H3)** | 3단계 헤딩. 마크다운 단축키 `#`, `##`, `###` 지원 | P0 |
| **순서 없는 리스트 (Bulleted List)** | `-` 또는 `*` 단축키. 중첩(indent) 지원 | P0 |
| **순서 있는 리스트 (Numbered List)** | `1.` 단축키. 자동 번호 매기기 | P0 |
| **할 일 목록 (To-do / Checkbox)** | `[]` 단축키. 체크/언체크 토글 | P0 |
| **토글 리스트 (Toggle)** | 접기/펼치기. 하위 블록 포함 가능 | P0 |
| **코드 블록** | 언어 선택(syntax highlighting), 복사 버튼, 줄 번호 | P0 |
| **인용 (Quote)** | 왼쪽 보더 + 들여쓰기 스타일 | P0 |
| **콜아웃 (Callout)** | 아이콘 + 배경색 + 텍스트. 정보/경고/위험 등 | P1 |
| **구분선 (Divider)** | `---` 단축키 | P0 |
| **이미지** | 업로드(GCS), URL 삽입, 리사이즈, 캡션, 정렬 | P0 |
| **테이블 (Simple Table)** | 행/열 추가/삭제, 셀 병합(Phase2), 헤더 행 | P1 |
| **북마크 (Bookmark/Link Preview)** | URL 입력 시 OG 메타 프리뷰 (제목, 설명, 이미지) | P2 |

### 1.2 인라인 서식

| 서식 | 단축키 | 마크다운 |
|------|--------|----------|
| **볼드** | Ctrl/Cmd+B | `**text**` |
| **이탤릭** | Ctrl/Cmd+I | `*text*` |
| **밑줄** | Ctrl/Cmd+U | -- |
| **취소선** | Ctrl/Cmd+Shift+S | `~~text~~` |
| **인라인 코드** | Ctrl/Cmd+E | `` `code` `` |
| **링크** | Ctrl/Cmd+K | `[text](url)` |
| **텍스트 색상** | 컬러 팔레트 (10색) | -- |
| **하이라이트 (배경색)** | 컬러 팔레트 (10색) | -- |
| **수학 수식 (인라인)** | `$...$` | KaTeX 렌더링 |

### 1.3 슬래시 커맨드 (`/`)

빈 블록 또는 텍스트 중간에 `/`를 입력하면 커맨드 팔레트 표시.

**기본 블록:**
- `/text` -- 텍스트 블록
- `/h1`, `/h2`, `/h3` -- 헤딩
- `/bullet` -- 순서 없는 리스트
- `/numbered` -- 순서 있는 리스트
- `/todo` -- 할 일 목록
- `/toggle` -- 토글 리스트
- `/code` -- 코드 블록
- `/quote` -- 인용
- `/callout` -- 콜아웃
- `/divider` -- 구분선

**미디어:**
- `/image` -- 이미지 업로드/링크
- `/video` -- 비디오 임베드 (YouTube, Vimeo 등)
- `/file` -- 파일 첨부
- `/bookmark` -- URL 북마크
- `/embed` -- 범용 임베드 (iframe)

**고급:**
- `/table` -- 심플 테이블
- `/database` -- 데이터베이스 (인라인/풀페이지)
- `/math` -- 수학 수식 블록 (KaTeX)
- `/mermaid` -- Mermaid 다이어그램
- `/toc` -- 목차 (Table of Contents)
- `/breadcrumb` -- 브레드크럼
- `/columns` -- 다단 레이아웃 (2단/3단)

**페이지/링크:**
- `/page` -- 서브페이지 생성
- `/link-to-page` -- 기존 페이지 링크
- `/mention` -- 사람/페이지/날짜 멘션

**AI (Phase 4에서 활성화):**
- `/ai` -- AI 어시스턴트 호출
- `/summarize` -- AI 요약
- `/translate` -- AI 번역

### 1.4 드래그 앤 드롭

| 기능 | 설명 |
|------|------|
| **블록 핸들 (grip)** | 블록 왼쪽에 `::` (6점) 아이콘. 호버 시 표시 |
| **드래그 리오더** | 블록을 잡고 위/아래로 이동 |
| **크로스 컨테이너** | 토글/콜아웃 안팎으로 블록 이동 |
| **다중 블록 선택** | Shift+클릭 또는 드래그로 범위 선택 후 일괄 이동 |
| **들여쓰기** | Tab / Shift+Tab으로 블록 들여쓰기/내어쓰기 |

### 1.5 블록 변환

- 텍스트 <-> 헤딩(H1/H2/H3)
- 텍스트 <-> 리스트(순서/비순서/할일)
- 텍스트 <-> 토글
- 텍스트 <-> 인용/콜아웃
- 블록 핸들 메뉴에서 "변환" 서브메뉴 제공

---

## Phase 2: 고급 블록 + 페이지 구조

### 2.1 데이터베이스 (인라인/풀페이지)

| 기능 | 설명 |
|------|------|
| **DB 속성 타입** | Text, Number, Select, Multi-select, Date, Person, Checkbox, URL, Email, Phone, Files, Relation, Formula, Rollup, Created time, Last edited time, Created by, Last edited by |
| **뷰 타입** | Table, Board (칸반), List, Calendar, Gallery, Timeline (간트) |
| **필터** | 속성별 필터 (is, is_not, contains, starts_with, is_empty, 날짜 범위 등) |
| **정렬** | 다중 속성 정렬 |
| **그룹** | Select/Multi-select/Person/Date 기준 그룹핑 |
| **서브아이템** | 데이터베이스 행 = 하위 페이지 (블록 에디터) |

### 2.2 페이지 계층 구조

| 기능 | 설명 |
|------|------|
| **서브페이지** | 페이지 안에 `/page`로 하위 페이지 생성 |
| **브레드크럼** | 상위 페이지 경로 표시 |
| **사이드바 트리** | 접기/펼치기 가능한 페이지 트리 |
| **즐겨찾기** | 자주 쓰는 페이지 상단 고정 |
| **최근 방문** | 최근 열어본 페이지 목록 |
| **페이지 이동** | 드래그 또는 "Move to"로 부모 변경 |

### 2.3 공유 및 권한

| 기능 | 설명 |
|------|------|
| **워크스페이스 공유** | 전체 팀 접근 |
| **개별 초대** | 이메일/유저별 권한 부여 |
| **권한 수준** | Full access / Can edit / Can comment / Can view |
| **공개 링크** | 웹 퍼블리싱 (누구나 접근 가능) |
| **비밀번호 보호** | 공개 링크에 비밀번호 설정 |
| **만료일** | 공유 링크 만료 |
| **복제 허용** | 외부 사용자 복제 가능/불가능 설정 |

### 2.4 코멘트

| 기능 | 설명 |
|------|------|
| **블록 코멘트** | 블록 선택 후 코멘트 추가 |
| **텍스트 코멘트** | 텍스트 범위 선택 후 코멘트 추가 |
| **스레드 답글** | 코멘트에 대한 답글 체인 |
| **해결** | 코멘트 resolved/unresolved 토글 |
| **멘션** | @멘션으로 팀원 알림 |

---

## Phase 3: 협업 + 고급 기능

### 3.1 실시간 협업

| 기능 | 설명 |
|------|------|
| **동시 편집** | 여러 명이 동시에 같은 문서 편집 (Y.js CRDT) |
| **커서 공유** | 다른 유저 커서 위치 실시간 표시 (이름/색상) |
| **선택 영역 공유** | 텍스트 선택 범위 실시간 표시 |
| **Presence** | 현재 문서 열람 중인 유저 아바타 표시 |
| **충돌 해소** | CRDT 기반 자동 merge (수동 해소 불필요) |

### 3.2 변경 이력

| 기능 | 설명 |
|------|------|
| **자동 스냅샷** | 일정 간격/편집 수 기준 자동 저장 |
| **수동 스냅샷** | "Save version" 수동 저장 |
| **이력 열람** | 타임라인 UI로 과거 버전 열람 |
| **복원** | 특정 버전으로 롤백 |
| **블록 단위 diff** | 변경 블록 하이라이트 |

### 3.3 임포트/익스포트

| 형식 | 임포트 | 익스포트 |
|------|--------|----------|
| **Markdown** | O | O |
| **HTML** | O | O |
| **PDF** | - | O |
| **Notion** | O (API 기반) | - |
| **CSV** | O (DB용) | O |

### 3.4 템플릿

| 기능 | 설명 |
|------|------|
| **시스템 템플릿** | 회의록, TODO, 프로젝트 브리프, 일일 노트 등 |
| **커스텀 템플릿** | 내 페이지를 템플릿으로 저장 |
| **DB 템플릿** | 데이터베이스 행 생성 시 기본 구조 |

---

## Phase 4: AI 통합

### 4.1 AI 기능 목록

| 기능 | 트리거 | 설명 |
|------|--------|------|
| **AI 블록 생성** | `/ai` 슬래시 커맨드 | 프롬프트 입력 -> AI가 블록 생성 |
| **텍스트 요약** | `/summarize` 또는 블록 선택 | 선택 텍스트/전체 문서 요약 |
| **번역** | `/translate` 또는 블록 선택 | 다국어 번역 |
| **글쓰기 보조** | 블록 선택 -> "Improve writing" | 문법/스타일 개선 |
| **확장** | 블록 선택 -> "Make longer" | 내용 확장/상세화 |
| **축약** | 블록 선택 -> "Make shorter" | 내용 축약 |
| **톤 변경** | 블록 선택 -> "Change tone" | Professional/Casual/Academic 등 |
| **코드 생성** | `/ai-code` | 코드 블록 AI 생성 |
| **표 생성** | `/ai-table` | 데이터 기반 표 AI 생성 |
| **다이어그램** | `/ai-mermaid` | Mermaid 다이어그램 AI 생성 |
| **수학 수식** | `/ai-math` | 수학 수식 AI 생성 |
| **문서 Q&A** | AI 사이드바 | 문서 내용 기반 질문/답변 |

### 4.2 AI UX 패턴

1. **인라인 AI**: 블록 내부에서 AI 결과 미리보기 -> Accept/Reject
2. **AI 블록**: 독립 블록으로 AI 결과 생성 -> "적용" 시 일반 블록 변환
3. **사이드바 AI**: 문서 맥락 기반 대화형 AI 어시스턴트
4. **SSE 스트리밍**: AI 결과를 실시간 타이핑 효과로 표시

---

## Notion 기능 전수조사 참조

### 블록 타입 48종
paragraph, heading_1, heading_2, heading_3, bulleted_list_item, numbered_list_item, to_do, toggle, code, quote, callout, divider, image, video, file, bookmark, embed, equation (math), table, table_row, column_list, column, synced_block, template, link_to_page, child_page, child_database, breadcrumb, table_of_contents, audio, link_preview, pdf

### 인라인 서식 12종
bold, italic, underline, strikethrough, code, color (text), color (background), link, mention (user/page/date/database), equation (inline), comment

### 데이터베이스 속성 18종
Title, Text, Number, Select, Multi-select, Status, Date, Person, Files & media, Checkbox, URL, Email, Phone number, Formula, Relation, Rollup, Created time, Last edited time, Created by, Last edited by

### 데이터베이스 뷰 6종
Table, Board, Timeline, Calendar, List, Gallery