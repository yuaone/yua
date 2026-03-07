# File Attachment Block System -- Design Specification

**Package:** `yua-web`
**Path:** `src/components/studio/document/editor/`
**Date:** 2026-03-06
**Status:** Design (not yet implemented)

---

## 1. Component Structure

### New Files to Create

```
yua-web/src/components/studio/document/editor/
  extensions/
    file-block.ts              # Tiptap Node extension definition
    file-block-drop-plugin.ts  # ProseMirror plugin for drag-drop & paste
  nodes/
    FileBlockView.tsx          # NodeView React component (main block)
    FileBlockIcon.tsx          # File type icon renderer
    SpreadsheetPreview.tsx     # CSV/XLSX inline table preview
    ImageLightbox.tsx          # Full-screen image viewer overlay
  lib/
    file-utils.ts              # Extension detection, size formatting, type mapping
    csv-parser.ts              # CSV parsing with encoding detection
    xlsx-parser.ts             # XLSX parsing via SheetJS
    upload.ts                  # Upload flow (client -> API -> storage -> URL)

yua-shared/src/types/
  file-block.ts                # Shared types/contracts for file block data
```

### Modified Files

| File | Change |
|------|--------|
| `BlockEditor.tsx` | Register `FileBlock` extension and `FileBlockDropPlugin`; pass upload handler |
| `SlashCommandMenu.tsx` | Add "파일" command item with `Paperclip` icon |
| `globals.css` | Add CSS classes for file-block theming, shimmer animation, drop indicator |

---

## 2. Shared Types (yua-shared)

**File:** `yua-shared/src/types/file-block.ts`

```ts
export type FileCategory =
  | "pdf"
  | "document"      // doc, docx
  | "spreadsheet"   // xls, xlsx
  | "csv"
  | "presentation"  // ppt, pptx
  | "archive"       // zip, rar, 7z
  | "text"          // txt, md
  | "image"         // jpg, png, gif, webp, svg
  | "video"         // mp4, webm, mov
  | "audio"         // mp3, wav, ogg, flac
  | "code"          // js, ts, py, go, rs, java, etc.
  | "unknown";

export type FileBlockAttrs = {
  id: string;
  fileName: string;
  extension: string;
  category: FileCategory;
  sizeBytes: number;
  url: string;
  thumbnailUrl?: string;
  previewData?: string;       // JSON: { headers: string[], rows: string[][] }
  totalRows?: number;
  mimeType?: string;
  uploadStatus: "pending" | "uploading" | "complete" | "error";
  uploadProgress?: number;    // 0-100
};
```

---

## 3. Tiptap Node Extension Spec

**File:** `extensions/file-block.ts`

### Node Schema

- `name: "fileBlock"`
- `group: "block"`
- `atom: true` (non-editable, treated as single unit)
- `draggable: true`, `selectable: true`, `inline: false`
- All `FileBlockAttrs` fields as node attributes with sensible defaults
- `parseHTML`: `[{ tag: 'div[data-type="file-block"]' }]`
- `renderHTML`: wraps in `<div data-type="file-block">`
- `addNodeView`: `ReactNodeViewRenderer(FileBlockView)`

### Commands

```ts
insertFileBlock(attrs: Partial<FileBlockAttrs>)
updateFileBlock(id: string, newAttrs: Partial<FileBlockAttrs>)
```

---

## 4. File Type Icon/Color Mapping

| Extension(s) | Category | Lucide Icon | BG Light | BG Dark | Icon Color | Badge Color |
|---|---|---|---|---|---|---|
| `pdf` | pdf | `FileText` | `bg-red-50` | `bg-red-950/30` | `text-red-600` | `bg-red-100 text-red-700` / `bg-red-900/40 text-red-300` |
| `doc`, `docx` | document | `FileText` | `bg-blue-50` | `bg-blue-950/30` | `text-blue-600` | `bg-blue-100 text-blue-700` / `bg-blue-900/40 text-blue-300` |
| `xls`, `xlsx` | spreadsheet | `Sheet` | `bg-green-50` | `bg-green-950/30` | `text-green-600` | `bg-green-100 text-green-700` / `bg-green-900/40 text-green-300` |
| `csv` | csv | `Table` | `bg-emerald-50` | `bg-emerald-950/30` | `text-emerald-600` | `bg-emerald-100 text-emerald-700` / `bg-emerald-900/40 text-emerald-300` |
| `ppt`, `pptx` | presentation | `Presentation` | `bg-orange-50` | `bg-orange-950/30` | `text-orange-600` | `bg-orange-100 text-orange-700` / `bg-orange-900/40 text-orange-300` |
| `zip`, `rar`, `7z` | archive | `Archive` | `bg-yellow-50` | `bg-yellow-950/30` | `text-yellow-600` | `bg-yellow-100 text-yellow-700` / `bg-yellow-900/40 text-yellow-300` |
| `txt`, `md` | text | `FileText` | `bg-gray-50` | `bg-gray-800/30` | `text-gray-500` | `bg-gray-100 text-gray-600` / `bg-gray-800/40 text-gray-300` |
| `jpg/png/gif/webp/svg` | image | N/A (thumbnail) | N/A | N/A | N/A | N/A |
| `mp4`, `webm`, `mov` | video | `Play` (overlay) | `bg-purple-50` | `bg-purple-950/30` | `text-purple-600` | `bg-purple-100 text-purple-700` / `bg-purple-900/40 text-purple-300` |
| `mp3`, `wav`, `ogg` | audio | `AudioLines` | `bg-pink-50` | `bg-pink-950/30` | `text-pink-600` | `bg-pink-100 text-pink-700` / `bg-pink-900/40 text-pink-300` |
| `js`, `ts` | code | `Braces` | `bg-amber-50` | `bg-amber-950/30` | `text-amber-600` | `bg-amber-100 text-amber-700` / `bg-amber-900/40 text-amber-300` |
| `py` | code | `Braces` | `bg-sky-50` | `bg-sky-950/30` | `text-sky-600` | `bg-sky-100 text-sky-700` / `bg-sky-900/40 text-sky-300` |
| `go`, `rs` | code | `Braces` | `bg-cyan-50` | `bg-cyan-950/30` | `text-cyan-600` | `bg-cyan-100 text-cyan-700` / `bg-cyan-900/40 text-cyan-300` |
| Other | unknown | `File` | `bg-gray-50` | `bg-gray-800/30` | `text-gray-400` | `bg-gray-100 text-gray-500` / `bg-gray-800/40 text-gray-400` |

---

## 5. FileBlockView Layout

### Generic File Block
```
+--------------------------------------------------+
|  [Icon area: centered, h-[120px], category bg]   |
|  [FileBlockIcon size="lg"]                        |
|---------------------------------------------------|
|  filename.pdf                          [.PDF]     |
|  2.4 MB                                          |
|  [progress bar if uploading]                      |
+--------------------------------------------------+
```

Container: `w-full sm:max-w-[240px] lg:max-w-[280px] rounded-xl border bg-white dark:bg-[#1b1b1b] border-[var(--line)] shadow-sm`

### Spreadsheet/CSV: Uses SpreadsheetPreview instead

---

## 6. SpreadsheetPreview Layout

```
+----------------------------------------------------------+
|  filename.xlsx    [123 rows]                   [.XLSX]    |
|-----------------------------------------------------------|
|  | Col A  | Col B  | Col C  | Col D  | ...  |            |
|  |--------|--------|--------|--------|------|  scrollable |
|  | data   | data   | data   | data   | ...  |  max-h-320 |
|-----------------------------------------------------------|
|  2.4 MB                                                   |
+----------------------------------------------------------+
```

Container: `w-full sm:max-w-[480px] lg:max-w-[520px]`
Table scroll: `overflow-auto max-h-[320px] overscroll-contain`

---

## 7. CSV/XLSX Parsing Strategy

### CSV
- Encoding: Try UTF-8 -> BOM detect -> `euc-kr` / `shift_jis` / `gb18030` / `big5`
- Parser: Custom RFC 4180, auto-detect delimiter (comma/tab)
- Limits: 200 rows, 50 columns for preview

### XLSX
- Library: `xlsx` (SheetJS) -- `pnpm --filter yua-web add xlsx`
- `XLSX.read(buffer, { type: "array", codepage: 65001 })`
- `XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: "" })`
- Limits: 200 rows, 50 columns

---

## 8. Drag-and-Drop & Paste

### ProseMirror Plugin
- `handleDrop`: Position at drop coords, process each file
- `handlePaste`: Check `clipboardData.items` for files
- Visual: `file-drag-over` CSS class on editor (dashed blue outline)

---

## 9. Upload Flow

```
Browser: File -> FormData -> POST /api/studio/document/upload
Backend: Validate -> Cloud storage -> Return { url, fileId }
Browser: updateFileBlock(id, { url, uploadStatus: "complete" })
```

Use `XMLHttpRequest` for progress tracking.

### Size Limits
| Tier | Max Single File | Max Total Per Document |
|------|----------------|----------------------|
| Free | 10 MB | 100 MB |
| Pro | 50 MB | 1 GB |

---

## 10. CSS Additions (globals.css)

```css
.file-block-node { user-select: none; transition: box-shadow 150ms ease; }
.file-block-node:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.08); }
html.dark .file-block-node:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.3); }

@keyframes file-block-shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
.file-block-uploading {
  background: linear-gradient(90deg, transparent, rgba(59,130,246,0.08), transparent);
  background-size: 200% 100%;
  animation: file-block-shimmer 1.5s infinite;
}

.ProseMirror.file-drag-over {
  outline: 2px dashed #3b82f6;
  outline-offset: -2px;
  border-radius: 12px;
}
html.dark .ProseMirror.file-drag-over { outline-color: #60a5fa; }
```

---

## 11. Mobile Responsive

| Breakpoint | File Block | Spreadsheet | Table Font |
|---|---|---|---|
| `< 640px` | `w-full` | `w-full` | `text-[10px]` |
| `640-1023px` | `max-w-[240px]` | `max-w-[480px]` | `text-xs` |
| `>= 1024px` | `max-w-[280px]` | `max-w-[520px]` | `text-xs` |

Mobile: no drag-and-drop (slash command + paste only).

---

## 12. Implementation Phases

| Phase | Scope |
|---|---|
| 1 | Types + `file-utils.ts` + extension skeleton + basic `FileBlockView` + `FileBlockIcon` |
| 2 | Upload flow + progress tracking + error states |
| 3 | Drag-and-drop plugin + paste support + drop indicator CSS |
| 4 | Slash command "파일" entry |
| 5 | CSV parser + `SpreadsheetPreview` |
| 6 | XLSX parser (SheetJS) |
| 7 | Image lightbox + blob URL swap |
| 8 | Mobile responsive + dark mode QA + accessibility audit |
