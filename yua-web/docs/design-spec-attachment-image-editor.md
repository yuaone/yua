# YUA Attachment System + Image Editor Design Spec

> Version: 1.0
> Date: 2026-03-06
> Target: yua-web (Next.js 14 / Tailwind / Framer Motion / Lucide)

---

## Table of Contents

1. [Input Image Preview Card (AttachmentPreview)](#1-input-image-preview-card)
2. [ImageEditorModal](#2-imageeditormodal)
3. [Spreadsheet Viewer (FilePanel CSV/XLSX)](#3-spreadsheet-viewer)
4. [Sent Image Preview (ImagePanel)](#4-sent-image-preview)
5. [Mobile Responsive](#5-mobile-responsive)
6. [Animation Tokens](#6-animation-tokens)
7. [Component Tree](#7-component-tree)

---

## 1. Input Image Preview Card

입력창(ChatInput) 하단에 표시되는 이미지 첨부 프리뷰 카드.

### Layout

| Property      | Desktop (md+)        | Mobile (< 640px)    |
|---------------|----------------------|---------------------|
| Width         | 120px                | 100px               |
| Height        | 80px                 | 68px                |
| Border Radius | rounded-xl (12px)    | rounded-xl (12px)   |
| Object Fit    | object-cover         | object-cover        |

- **파일명 표시하지 않음.** 썸네일 이미지만 표시한다.
- 카드 간 간격: `gap-3` (12px)
- flex-wrap으로 줄바꿈 허용

### Styles

```
Container:
  border: 1px solid var(--line)
  background: transparent
  overflow: hidden
  position: relative
  cursor: pointer
```

### States

| State       | Visual                                                                 |
|-------------|------------------------------------------------------------------------|
| Default     | 썸네일만, 테두리 1px var(--line)                                        |
| Hover       | brightness(1.05), 편집 오버레이 fade-in                                  |
| Uploading   | 반투명 오버레이 + spinner                                                |
| Error       | placeholder (FileImage 아이콘 + wash 배경)                              |

### Hover Overlay (편집 아이콘)

```
Position: absolute inset-0
Background: bg-black/30 (backdrop, transition opacity 150ms)
Center: Pencil icon (Lucide) size={18} text-white
Cursor: pointer
```

- hover 시에만 보이며, `opacity-0 -> opacity-100` transition (150ms ease)
- 클릭 시 `ImageEditorModal` 오픈

### Remove Button

```
Position: absolute -top-2 -right-2
Size: 20x20px (w-5 h-5)
Background: bg-black dark:bg-gray-600
Icon: X size={12} text-white
Border-radius: full
z-index: 20
Hover: bg-gray-700
```

---

## 2. ImageEditorModal

이미지 위에 그림(드로잉)을 그릴 수 있는 모달 에디터.

### 2.1 Overlay

```
Position: fixed inset-0 z-50
Background: bg-black/90
Display: flex items-center justify-center flex-col
```

- ESC 키로 닫기
- 배경 클릭으로 닫기 (확인 다이얼로그 없이 취소 처리)

### 2.2 Image + Canvas

| Property       | Desktop                          | Mobile (< 640px)        |
|----------------|----------------------------------|-------------------------|
| max-width      | 90vw                             | 95vw                    |
| max-height     | 70vh                             | 60vh                    |
| border-radius  | rounded-xl (12px)                | rounded-lg (8px)        |

```
Image Container:
  position: relative
  display: inline-block

Image (img):
  max-w-[90vw] max-h-[70vh] md:max-h-[70vh] max-h-[60vh]
  object-contain
  rounded-xl
  user-select: none
  pointer-events: none  (canvas가 위에 겹침)

Canvas (overlay):
  position: absolute
  inset: 0
  width: 100%
  height: 100%
  cursor: crosshair
  touch-action: none  (모바일 스크롤 방지)
```

- Canvas는 img와 동일 크기로 absolute 배치
- Canvas의 실제 해상도는 이미지 naturalWidth/naturalHeight에 맞춰 설정 (CSS 크기와 별개)
- 드로잉은 Canvas 2D context의 `lineTo` / `stroke` 사용

### 2.3 Toolbar (Desktop)

이미지 **상단 중앙**에 가로 배치.

```
Position: absolute top-[-56px] left-1/2 -translate-x-1/2
  (이미지 컨테이너 기준, 이미지 바로 위에 떠있는 형태)
Background: var(--surface-panel)
Border: 1px solid var(--line)
Border-radius: rounded-xl (12px)
Shadow: shadow-lg (0 10px 15px -3px rgba(0,0,0,0.1))
Height: 44px
Padding: px-3
Display: flex items-center gap-2
```

#### Toolbar Items (좌 -> 우)

```
[Color Palette] | [Line Width] | [Undo] [Clear All] || [Cancel] [Apply]
```

구분선: `div.w-px h-6 bg-[var(--line)]`

### 2.4 Toolbar (Mobile)

화면 **하단 fixed**.

```
Position: fixed bottom-0 left-0 right-0
Padding-bottom: env(safe-area-inset-bottom)
Background: var(--surface-panel)
Border-top: 1px solid var(--line)
Height: 56px + safe-area
Padding: px-4
Display: flex items-center justify-between
z-index: 60
```

2줄 레이아웃이 아닌, 한 줄에 모든 요소 배치.
공간 부족 시 Color Palette는 토글 버튼으로 열리는 팝오버로 전환.

### 2.5 Color Palette

6가지 고정 색상:

| Color   | Hex       | Light Default | Dark Default |
|---------|-----------|---------------|--------------|
| Red     | #EF4444   |               |              |
| Blue    | #3B82F6   |               |              |
| Green   | #22C55E   |               |              |
| Yellow  | #EAB308   |               |              |
| Black   | #000000   | Default       |              |
| White   | #FFFFFF   |               | Default      |

- 다크모드에서는 Black(#000000) 대신 White(#FFFFFF)가 기본 선택
- 라이트모드에서는 Black(#000000)이 기본 선택

```
Each swatch:
  Size: 24x24px (w-6 h-6)
  Border-radius: full
  Border: 1.5px solid rgba(0,0,0,0.1) dark:rgba(255,255,255,0.15)
  Gap between: 6px (gap-1.5)

Selected state:
  ring-2 ring-offset-2
  ring-color: 해당 색상 (단, black/white는 ring-gray-400)
  ring-offset-color: var(--surface-panel)

White swatch (라이트모드에서 구분용):
  border: 1.5px solid rgba(0,0,0,0.2)
```

### 2.6 Line Width

3단계:

| Label | Value | Icon Visual              |
|-------|-------|--------------------------|
| Thin  | 2px   | 얇은 가로선 (1px height) |
| Medium| 4px   | 중간 가로선 (2px height) |
| Thick | 8px   | 굵은 가로선 (4px height) |

```
Each button:
  Size: 32x32px (w-8 h-8)
  Border-radius: rounded-lg (8px)
  Display: flex items-center justify-center
  Background (default): transparent
  Background (selected): bg-black/10 dark:bg-white/10
  Transition: background 150ms

  Inner line indicator:
    Width: 16px
    Height: 1px / 2px / 4px (각 단계별)
    Background: var(--text-primary)
    Border-radius: full
```

### 2.7 Action Buttons

#### Undo

```
Size: 32x32px
Icon: Undo2 (Lucide) size={16}
Background: transparent
Hover: bg-black/5 dark:bg-white/10
Border-radius: rounded-lg
Disabled (히스토리 없음): opacity-30 pointer-events-none
```

#### Clear All (전체 지우기)

```
Size: 32x32px
Icon: Trash2 (Lucide) size={16}
Background: transparent
Hover: bg-red-50 dark:bg-red-900/20, text-red-500
Border-radius: rounded-lg
Disabled (그린 것 없음): opacity-30 pointer-events-none
```

#### Cancel (취소)

```
Type: ghost button
Text: "취소"
Font: text-[13px] font-medium
Color: var(--text-secondary)
Padding: px-3 py-1.5
Border-radius: rounded-lg
Hover: bg-black/5 dark:bg-white/10
```

#### Apply (적용)

```
Type: primary button
Text: "적용"
Font: text-[13px] font-medium text-white
Background: bg-blue-500
Padding: px-4 py-1.5
Border-radius: rounded-lg
Hover: bg-blue-600
Active: bg-blue-700
Shadow: shadow-sm
```

### 2.8 Drawing Behavior

- `pointerdown` -> start stroke
- `pointermove` -> extend stroke (requestAnimationFrame throttle)
- `pointerup` / `pointerleave` -> end stroke, push to history
- 각 stroke는 `{ points: {x,y}[], color, width }` 로 히스토리 저장
- Undo: 마지막 stroke 제거 후 전체 재드로잉
- Clear: 히스토리 전체 비우기
- Apply: Canvas를 이미지에 합성 (`canvas.toBlob`) -> 새 File 객체로 교체

---

## 3. Spreadsheet Viewer

전송 후 메시지 내 CSV/XLSX 파일의 인라인 테이블 프리뷰.

### 3.1 Container

```
Border: 1px solid var(--line)
Border-radius: rounded-lg (8px)
Overflow: hidden
Max-height: 280px (desktop), 200px (mobile < 640px)
Overflow-y: auto
```

#### Custom Scrollbar

```
scrollbar-width: thin (Firefox)
::-webkit-scrollbar { width: 4px; height: 4px; }
::-webkit-scrollbar-thumb {
  background: rgba(0,0,0,0.15);
  dark: rgba(255,255,255,0.15);
  border-radius: 2px;
}
::-webkit-scrollbar-track { background: transparent; }
```

### 3.2 Sheet Tabs (XLSX Multi-sheet)

테이블 **상단**에 배치. CSV는 단일 시트이므로 탭 숨김.

```
Container:
  Display: flex
  Overflow-x: auto (가로 스크롤)
  Border-bottom: 1px solid var(--line)
  Background: var(--wash)
  scrollbar-width: none (탭 영역은 스크롤바 숨김)

Each tab:
  Font: text-[11px]
  Padding: px-3 py-1.5
  White-space: nowrap
  Cursor: pointer
  Transition: all 150ms

Active tab:
  Background: bg-white dark:bg-[var(--surface-panel)]
  Font-weight: font-medium (500)
  Color: var(--text-primary)
  Border-bottom: 2px solid bg-blue-500
  Margin-bottom: -1px (border overlap)

Inactive tab:
  Opacity: 0.6
  Hover: opacity-0.8
```

### 3.3 Table

```
Width: w-full
Border-collapse: collapse
Font: text-[12px] (data), text-[13px] (header)
```

#### Header Row

```
Position: sticky top-0 z-10
Background: var(--wash)
Font: font-semibold text-[13px]
Color: var(--text-primary)
Padding: px-3 py-2
Text-align: left
White-space: nowrap
Border-bottom: 1px solid var(--line)
```

#### Data Rows

```
Font: text-[12px]
Color: var(--text-secondary)
Padding: px-3 py-1.5
White-space: nowrap
Border-bottom: 1px solid var(--line)

Alternating rows:
  Even (0, 2, 4...): background transparent
  Odd (1, 3, 5...): background var(--wash)
```

#### Row Numbers (optional, 첫 번째 열)

```
Font: text-[10px]
Color: var(--text-muted) opacity-40
Text-align: right
Padding-right: 8px
Border-right: 1px solid var(--line)
Width: 36px (fixed)
```

### 3.4 Bottom Info Bar

```
Background: var(--wash)
Font: text-[11px]
Color: var(--text-muted)
Padding: px-3 py-1.5
Display: flex justify-between
Border-top: 1px solid var(--line)
Position: sticky bottom-0

Left: "42행 x 5열"
Right: "+32행 더"  (totalRows - displayedRows > 0 일 때만)
```

---

## 4. Sent Image Preview (ImagePanel)

전송된 메시지 내 이미지 프리뷰.

### 4.1 Layout

| Condition  | Layout                        |
|------------|-------------------------------|
| 1 image    | max-w-[300px], block          |
| 2+ images  | grid grid-cols-2 gap-2        |

```
Each image container:
  Border-radius: rounded-xl (12px)
  Overflow: hidden
  Position: relative
  Cursor: zoom-in
```

### 4.2 Hover Overlay

**파일명은 표시하지 않는다.** 파일 크기만 오버레이.

```
Position: absolute inset-0
Opacity: 0 -> 1 (hover, transition 200ms)
Pointer-events: none (이미지 클릭은 통과)

Gradient:
  background: linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 50%)

Size text:
  Position: absolute bottom-2 left-3
  Font: text-[12px] font-medium text-white
  Text-shadow: 0 1px 2px rgba(0,0,0,0.3)
  Content: "1.2 MB" (formatSize 함수 사용)
```

### 4.3 Error Placeholder

```
Background: var(--wash)
Border: 1px solid var(--line)
Border-radius: rounded-xl
Min-height: 120px
Display: flex flex-col items-center justify-center gap-2
Icon: FileImage size={28} color var(--text-muted)
Text: 파일명, text-[12px], var(--text-muted), truncate
```

### 4.4 Fullscreen Modal

클릭 시 풀스크린 이미지 뷰어.

```
Overlay:
  Position: fixed inset-0 z-50
  Background: bg-black/90
  Display: flex items-center justify-center

Image:
  max-w-[90vw] max-h-[90vh]
  Border-radius: rounded-xl
  Shadow: shadow-2xl
  Animation: scale 0.92->1, opacity 0->1 (Framer Motion, 250ms)
```

#### Close Button

```
Position: absolute top-4 right-4
Size: 40x40px
Background: bg-white/10 backdrop-blur-sm
Border-radius: full
Icon: X size={20} text-white
Hover: bg-white/20
Transition: 150ms
```

#### Multi-image Navigation

2개 이상 이미지일 때 좌/우 화살표 표시.

```
Arrow buttons:
  Position: absolute top-1/2 -translate-y-1/2
  Left arrow: left-4
  Right arrow: right-4
  Size: 44x44px
  Background: bg-white/10 backdrop-blur-sm
  Border-radius: full
  Icon: ChevronLeft / ChevronRight size={24} text-white
  Hover: bg-white/20
  Transition: 150ms

  Disabled (첫/마지막 이미지): opacity-30 pointer-events-none

Image counter:
  Position: absolute bottom-4 left-1/2 -translate-x-1/2
  Font: text-[13px] text-white/70
  Content: "2 / 5"
```

키보드: ArrowLeft / ArrowRight로 네비게이션

---

## 5. Mobile Responsive

### Breakpoints

| Token | Range          | Notes                    |
|-------|----------------|--------------------------|
| sm    | < 640px        | 모바일                    |
| md    | 641px - 1024px | 태블릿                    |
| lg    | > 1024px       | 데스크톱                  |

### Per-component Mobile Overrides

#### 5.1 Input Image Preview Card (sm)

```
Size: 100x68px (w-[100px] h-[68px])
Gap: gap-2 (8px)
```

#### 5.2 ImageEditorModal (sm)

```
Image:
  max-w: 95vw
  max-h: 60vh

Toolbar:
  Position: fixed bottom-0 (하단)
  Height: 56px + safe-area
  Color palette: 팝오버로 전환 (화면 공간 부족)

Canvas:
  touch-action: none (필수 - 드로잉 중 스크롤 방지)
```

#### 5.3 Spreadsheet Viewer (sm)

```
Max-height: 200px
Font: header 12px, data 11px
Cell padding: px-2 py-1
```

#### 5.4 Fullscreen Image Modal (sm)

```
Navigation:
  화살표 버튼 숨김 (hidden)
  좌/우 스와이프로 전환 (touch gesture)
  Swipe threshold: 50px

Close:
  배경 탭 또는 아래로 스와이프 (drag-to-dismiss)
  Drag threshold: 100px (아래로)

Image counter:
  항상 표시
```

---

## 6. Animation Tokens

모든 애니메이션은 Framer Motion 사용.

| Element                  | Animation                                      | Duration |
|--------------------------|-------------------------------------------------|----------|
| Hover edit overlay       | opacity 0 -> 1                                  | 150ms    |
| ImageEditorModal open    | overlay: opacity 0->1, image: scale 0.95->1     | 250ms    |
| ImageEditorModal close   | reverse of open                                 | 200ms    |
| Fullscreen image open    | scale 0.92->1, opacity 0->1                     | 250ms    |
| Fullscreen swipe         | x translate, spring(stiffness:300, damping:30)   | spring   |
| Fullscreen drag dismiss  | y translate + opacity fade                       | 200ms    |
| Toolbar popover (mobile) | y: 8->0, opacity 0->1                           | 150ms    |
| Sheet tab switch         | opacity crossfade                                | 150ms    |

---

## 7. Component Tree

```
ChatInput
  └─ AttachmentPreview
       └─ AttachmentCard (per item)
            ├─ [kind=image] ImagePreviewThumbnail
            │    ├─ img (thumbnail)
            │    ├─ HoverEditOverlay (Pencil icon)
            │    └─ RemoveButton (X)
            └─ [kind=file] FilePreviewCard (existing)

ImageEditorModal (portal, z-50)
  ├─ Overlay (bg-black/90)
  ├─ ImageCanvas
  │    ├─ img (base image)
  │    └─ canvas (drawing layer)
  └─ EditorToolbar
       ├─ ColorPalette
       ├─ LineWidthPicker
       ├─ Divider
       ├─ UndoButton
       ├─ ClearButton
       ├─ Divider
       ├─ CancelButton
       └─ ApplyButton

ChatMessage (sent)
  ├─ ImagePanel
  │    ├─ ImageCard (per image)
  │    │    ├─ img
  │    │    └─ HoverSizeOverlay ("1.2 MB")
  │    └─ FullscreenImageModal (portal, z-50)
  │         ├─ CloseButton
  │         ├─ NavArrows (desktop) / Swipe (mobile)
  │         ├─ motion.img
  │         └─ ImageCounter ("2 / 5")
  └─ FilePanel
       └─ FileCard (per file)
            ├─ Icon + Name + Size + Badge
            ├─ DownloadButton
            └─ CSVTablePreview (conditional)
                 ├─ SheetTabs (XLSX only)
                 ├─ Table (header + data rows)
                 └─ BottomInfoBar ("42행 x 5열")
```

---

## Appendix: Lucide Icons Used

| Component            | Icon            | Size |
|----------------------|-----------------|------|
| Edit overlay         | Pencil          | 18   |
| Remove attachment    | X               | 12   |
| Undo                 | Undo2           | 16   |
| Clear all            | Trash2          | 16   |
| Close fullscreen     | X               | 20   |
| Nav left             | ChevronLeft     | 24   |
| Nav right            | ChevronRight    | 24   |
| File fallback        | FileImage       | 28   |
| Download             | Download        | 16   |
| Spreadsheet          | FileSpreadsheet | 18-20|
| Archive              | FileArchive     | 18-20|
| Code file            | FileCode        | 18-20|
| Text file            | FileText        | 18-20|
| Generic file         | File            | 18-20|
