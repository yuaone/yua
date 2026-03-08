import { useEffect, useState, useMemo } from "react";
import type { AttachmentMeta } from "yua-shared/chat/attachment-types";
import {
  FileText,
  FileJson,
  FileCode,
  FileSpreadsheet,
  File,
  FileArchive,
  Download,
  AlertCircle,
} from "lucide-react";

type Props = {
  attachments?: AttachmentMeta[];
};

/* ==============================
   Helpers
============================== */

function getExt(name?: string): string {
  if (!name) return "";
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : "";
}

function isSpreadsheet(mime?: string, name?: string): boolean {
  const ext = getExt(name);
  return (
    ext === "csv" ||
    ext === "tsv" ||
    ext === "xlsx" ||
    ext === "xls" ||
    !!mime?.includes("csv") ||
    !!mime?.includes("spreadsheet")
  );
}

function isArchive(name?: string): boolean {
  return ["zip", "rar", "7z", "tar", "gz", "bz2"].includes(getExt(name));
}

function isDocument(name?: string): boolean {
  return ["pdf", "doc", "docx", "hwp", "hwpx", "rtf", "md", "txt"].includes(getExt(name));
}

function isPdf(name?: string): boolean {
  return getExt(name) === "pdf";
}

function isDocx(name?: string): boolean {
  return ["doc", "docx"].includes(getExt(name));
}

function isHwp(name?: string): boolean {
  return ["hwp", "hwpx"].includes(getExt(name));
}

function formatSize(bytes?: number): string {
  if (bytes == null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(mime?: string, name?: string) {
  const ext = getExt(name);

  if (isSpreadsheet(mime, name)) {
    return <FileSpreadsheet size={18} className="text-emerald-600 dark:text-emerald-400" />;
  }

  if (isArchive(name)) {
    return <FileArchive size={18} className="text-amber-600 dark:text-amber-400" />;
  }

  if (isPdf(name)) {
    return <FileText size={18} className="text-rose-600 dark:text-rose-400" />;
  }

  if (isHwp(name)) {
    return <FileText size={18} className="text-orange-600 dark:text-orange-400" />;
  }

  if (isDocx(name)) {
    return <FileText size={18} className="text-blue-600 dark:text-blue-400" />;
  }

  if (mime?.includes("json") || ext === "json") {
    return <FileJson size={18} />;
  }

  if (
    mime?.includes("typescript") ||
    mime?.includes("javascript") ||
    ["ts", "tsx", "js", "jsx"].includes(ext)
  ) {
    return <FileCode size={18} />;
  }

  if (ext === "md" || mime?.includes("markdown")) {
    return <FileText size={18} />;
  }

  return <File size={18} />;
}

/* ==============================
   Sanitize: remove control chars only
   (H-04: keep emoji, CJK, Korean, etc.)
============================== */
function sanitizeCell(raw: string): string {
  // Strip BOM (H-03)
  let s = raw;
  if (s.charCodeAt(0) === 0xfeff) s = s.slice(1);
  // Remove C0 control chars except tab/newline/CR
  let out = "";
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i);
    if (code < 0x20 && code !== 0x09 && code !== 0x0a && code !== 0x0d) continue;
    // DEL
    if (code === 0x7f) continue;
    // C1 control chars (0x80-0x9F)
    if (code >= 0x80 && code <= 0x9f) continue;
    out += s[i];
  }
  return out;
}

/* ==============================
   SpreadsheetPreview
   Supports CSV, TSV, XLSX, XLS
   Uses xlsx package for all formats
============================== */

const MAX_ROWS = 50;

type SheetData = {
  name: string;
  headers: string[];
  rows: string[][];
  totalRows: number;
  totalCols: number;
};

function SpreadsheetPreview({ fileUrl, fileName }: { fileUrl: string; fileName: string }) {
  const [sheets, setSheets] = useState<SheetData[]>([]);
  const [activeSheet, setActiveSheet] = useState(0);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  const ext = useMemo(() => getExt(fileName), [fileName]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(fileUrl);
        if (!res.ok) throw new Error("fetch failed");

        const XLSX = await import("xlsx");
        const buffer = await res.arrayBuffer();
        // H-08: limit rows to prevent browser freeze on large files
        // codepage auto-detect: xlsx=UTF-8 always, xls=embedded codepage, csv=try UTF-8 then CP949
        const isCsv = ["csv", "tsv"].includes(ext);
        let wb = XLSX.read(buffer, {
          type: "array",
          sheetRows: MAX_ROWS + 1,
        });

        // CSV/TSV fallback: if UTF-8 decode produces replacement chars, retry with CP949 (Korean)
        if (isCsv) {
          const firstSheet = wb.Sheets[wb.SheetNames[0]];
          const sample: string[][] = firstSheet
            ? XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: "" })
            : [];
          const hasGarbled = sample.some((row) =>
            row.some((cell) => String(cell).includes("\uFFFD"))
          );
          if (hasGarbled) {
            wb = XLSX.read(buffer, {
              type: "array",
              codepage: 949,
              sheetRows: MAX_ROWS + 1,
            });
          }
        }

        const parsed: SheetData[] = [];

        for (const sheetName of wb.SheetNames) {
          const ws = wb.Sheets[sheetName];
          if (!ws) continue;

          // Get full range info from !fullref if available (before sheetRows truncation)
          const fullRef = (ws as any)["!fullref"] || ws["!ref"];
          let totalRows = 0;
          let totalCols = 0;
          if (fullRef) {
            const range = XLSX.utils.decode_range(fullRef);
            totalRows = range.e.r - range.s.r; // exclude header
            totalCols = range.e.c - range.s.c + 1;
          }

          const raw: string[][] = XLSX.utils.sheet_to_json(ws, {
            header: 1,
            defval: "",
            blankrows: false,
          });

          if (raw.length === 0) {
            // L-02: empty sheet
            parsed.push({ name: sheetName, headers: [], rows: [], totalRows: 0, totalCols: 0 });
            continue;
          }

          const headers = raw[0].map((h) => sanitizeCell(String(h)));
          const dataRows = raw.slice(1).map((row) =>
            row.map((cell) => sanitizeCell(String(cell)))
          );

          // If sheetRows truncated, use fullRef for total count
          if (totalRows === 0) totalRows = dataRows.length;
          if (totalCols === 0) totalCols = headers.length;

          parsed.push({
            name: sheetName,
            headers,
            rows: dataRows,
            totalRows,
            totalCols,
          });
        }

        if (!cancelled && parsed.length > 0) {
          setSheets(parsed);
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [fileUrl, ext]);

  if (loading) {
    return (
      <div
        className="p-3 text-center text-[11px] border-t"
        style={{ borderColor: "var(--line)", color: "var(--text-muted)" }}
      >
        Loading...
      </div>
    );
  }

  // M-05: Show error UI instead of silent null
  if (error) {
    return (
      <div
        className="p-2.5 flex items-center gap-2 text-[11px] border-t"
        style={{ borderColor: "var(--line)", color: "var(--text-muted)" }}
      >
        <AlertCircle size={13} className="shrink-0 opacity-60" />
         <span>{"\uBBF8\uB9AC\uBCF4\uAE30\uB97C \uBD88\uB7EC\uC62C \uC218 \uC5C6\uC2B5\uB2C8\uB2E4"}</span>
      </div>
    );
  }

  if (sheets.length === 0) return null;

  const current = sheets[activeSheet];
  if (!current) return null;

  // L-02: empty data
  if (current.headers.length === 0) {
    return (
      <div
        className="p-2.5 text-center text-[11px] border-t"
        style={{ borderColor: "var(--line)", color: "var(--text-muted)" }}
      >
        {"\uB370\uC774\uD130\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4"}
      </div>
    );
  }

  const remaining = current.totalRows - current.rows.length;

  return (
    <div className="overflow-hidden border-t" style={{ borderColor: "var(--line)" }}>
      {/* Sheet tabs (multi-sheet) */}
      {sheets.length > 1 && (
        <div
          className="flex gap-0 overflow-x-auto border-b"
          style={{ borderColor: "var(--line)", background: "var(--wash)" }}
        >
          {sheets.map((s, i) => (
            <button
              key={s.name}
              onClick={() => setActiveSheet(i)}
              className={`
                px-3 py-1.5 text-[11px] font-medium whitespace-nowrap transition-colors
                border-b-2
                ${i === activeSheet
                  ? "border-emerald-500 text-emerald-700 dark:text-emerald-300 bg-white/50 dark:bg-white/5"
                  : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                }
              `}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}

      {/* Table with scrollbar */}
      <div
        className="spreadsheet-scroll overflow-auto"
        style={{
          maxHeight: 280,
          scrollbarWidth: "thin",
          scrollbarColor: "var(--text-muted) transparent",
        }}
      >
        <style>{`
          .spreadsheet-scroll::-webkit-scrollbar { width: 4px; height: 4px; }
          .spreadsheet-scroll::-webkit-scrollbar-track { background: transparent; }
          .spreadsheet-scroll::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.15); border-radius: 2px; }
          .dark .spreadsheet-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); }
        `}</style>
        <table className="w-full text-[13px] border-collapse">
          <thead>
            <tr className="sticky top-0 z-10" style={{ background: "var(--wash)" }}>
              {/* Row number header */}
              <th
                className="px-2 py-2 text-center font-medium whitespace-nowrap border-b border-r"
                style={{
                  color: "var(--text-muted)",
                  borderColor: "var(--line)",
                  minWidth: 36,
                  background: "var(--wash)",
                  position: "sticky",
                  left: 0,
                  zIndex: 11,
                }}
              >
                #
              </th>
              {current.headers.map((h, i) => (
                <th
                  key={i}
                  className="px-3 py-2 text-left font-semibold whitespace-nowrap border-b"
                  style={{
                    color: "var(--text-primary)",
                    borderColor: "var(--line)",
                    minWidth: 80,
                  }}
                >
                  {h || `col${i + 1}`}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {current.rows.map((row, ri) => (
              <tr
                key={ri}
                className="hover:opacity-80 transition-opacity"
                style={{
                  background: ri % 2 === 0 ? "transparent" : "var(--wash)",
                }}
              >
                {/* Row number */}
                <td
                  className="px-2 py-1.5 text-center border-b border-r"
                  style={{
                    color: "var(--text-muted)",
                    borderColor: "var(--line)",
                    fontSize: 11,
                    background: ri % 2 === 0 ? "var(--surface-panel)" : "var(--wash)",
                    position: "sticky",
                    left: 0,
                  }}
                >
                  {ri + 1}
                </td>
                {current.headers.map((_, ci) => (
                  <td
                    key={ci}
                    className="px-3 py-1.5 whitespace-nowrap border-b"
                    style={{
                      color: "var(--text-secondary)",
                      borderColor: "var(--line)",
                      minWidth: 80,
                    }}
                  >
                    {row[ci] ?? ""}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer info bar */}
      <div
        className="flex items-center justify-between px-3 py-2 text-[11px] border-t"
        style={{ color: "var(--text-muted)", background: "var(--wash)", borderColor: "var(--line)" }}
      >
        <span>
          {current.totalRows}
          {"\uD589"} x {current.totalCols}
          {"\uC5F4"}
        </span>
        {remaining > 0 && (
          <span>+{remaining}행 더</span>
        )}
      </div>
    </div>
  );
}

/* ==============================
   FilePanel
============================== */

export default function FilePanel({ attachments }: Props) {
  const files = attachments?.filter((a) => a.kind === "file") ?? [];

  if (files.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 items-end">
      {files.map((f) => {
        const ext = getExt(f.fileName);
        const spreadsheet = isSpreadsheet(f.mimeType, f.fileName);
        const archive = isArchive(f.fileName);
        const pdf = isPdf(f.fileName);
        const docx = isDocx(f.fileName);
        const hwp = isHwp(f.fileName);
        // H-10 / M-09: fallback url -> fileUrl
        const fileUrl = f.fileUrl ?? f.url ?? "";

        return (
          <div
            key={f.id ?? fileUrl}
            className={`
              w-full max-w-[320px] rounded-xl border overflow-hidden
              ${
                spreadsheet
                  ? "border-emerald-200 dark:border-emerald-700/50"
                  : archive
                  ? "border-amber-200 dark:border-amber-700/50"
                  : pdf
                  ? "border-rose-200 dark:border-rose-700/50"
                  : docx
                  ? "border-blue-200 dark:border-blue-700/50"
                  : hwp
                  ? "border-orange-200 dark:border-orange-700/50"
                  : "border-gray-200 dark:border-[var(--line)]"
              }
            `}
          >
            {/* File header bar */}
            <div
              className={`
                flex items-center gap-2.5 px-3 py-2 text-sm
                ${
                  spreadsheet
                    ? "bg-emerald-50 text-emerald-900 dark:bg-emerald-900/20 dark:text-emerald-100"
                    : archive
                    ? "bg-amber-50 text-amber-900 dark:bg-amber-900/20 dark:text-amber-100"
                    : pdf
                    ? "bg-rose-50 text-rose-900 dark:bg-rose-900/20 dark:text-rose-100"
                    : docx
                    ? "bg-blue-50 text-blue-900 dark:bg-blue-900/20 dark:text-blue-100"
                    : hwp
                    ? "bg-orange-50 text-orange-900 dark:bg-orange-900/20 dark:text-orange-100"
                    : "bg-gray-50 text-gray-800 dark:bg-[var(--wash)] dark:text-[var(--text-primary)]"
                }
              `}
            >
              {getFileIcon(f.mimeType, f.fileName)}

              <div className="flex flex-col min-w-0 flex-1">
                <span className="truncate font-medium text-[12px] leading-tight">
                  {f.fileName}
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {f.sizeBytes != null && (
                    <span className="text-[10px] opacity-60">
                      {formatSize(f.sizeBytes)}
                    </span>
                  )}
                  {ext && (
                    <span
                      className={`text-[9px] font-medium px-1 py-0.5 rounded uppercase leading-none ${
                        spreadsheet
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-800/40 dark:text-emerald-300"
                          : archive
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-800/40 dark:text-amber-300"
                          : pdf
                          ? "bg-rose-100 text-rose-700 dark:bg-rose-800/40 dark:text-rose-300"
                          : docx
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-800/40 dark:text-blue-300"
                          : hwp
                          ? "bg-orange-100 text-orange-700 dark:bg-orange-800/40 dark:text-orange-300"
                          : "bg-gray-100 text-gray-600 dark:bg-gray-700/40 dark:text-gray-300"
                      }`}
                    >
                      {ext}
                    </span>
                  )}
                </div>
              </div>

              <a
                href={fileUrl}
                download={f.fileName}
                target="_blank"
                rel="noopener noreferrer"
                className="
                  flex items-center justify-center
                  rounded-md p-1
                  hover:bg-black/5 dark:hover:bg-white/10
                  transition shrink-0
                "
                title={"\uD30C\uC77C \uC800\uC7A5"}
              >
                <Download size={14} className="opacity-70" />
              </a>
            </div>

            {/* Spreadsheet inline preview -- integrated inside the card */}
            {spreadsheet && fileUrl && (
              <SpreadsheetPreview fileUrl={fileUrl} fileName={f.fileName ?? ""} />
            )}
          </div>
        );
      })}
    </div>
  );
}
