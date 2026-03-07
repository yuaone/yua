"use client";

import { useEffect, useState } from "react";

type Props = {
  url: string;
  extension: string;
};

type ParsedTable = {
  headers: string[];
  rows: string[][];
  truncated: boolean;
};

const MAX_PREVIEW_ROWS = 50;

async function parseCSV(text: string): Promise<ParsedTable> {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return { headers: [], rows: [], truncated: false };

  // Simple CSV parse (handles quoted fields)
  function splitRow(line: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"' && !inQuote) {
        inQuote = true;
      } else if (ch === '"' && inQuote) {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuote = false;
        }
      } else if (ch === "," && !inQuote) {
        result.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  }

  const headers = splitRow(lines[0]);
  const dataLines = lines.slice(1);
  const truncated = dataLines.length > MAX_PREVIEW_ROWS;
  const rows = dataLines.slice(0, MAX_PREVIEW_ROWS).map(splitRow);

  return { headers, rows, truncated };
}

export default function SpreadsheetPreview({ url, extension }: Props) {
  const [table, setTable] = useState<ParsedTable | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!url) return;

    const isCSV = extension === "csv" || extension === "tsv";

    (async () => {
      setLoading(true);
      setError(null);
      try {
        if (isCSV) {
          const res = await fetch(url);
          if (!res.ok) throw new Error("FETCH_FAILED");
          const buf = await res.arrayBuffer();

          // Try UTF-8 first, fallback to EUC-KR for Korean files
          let text: string;
          try {
            const decoder = new TextDecoder("utf-8", { fatal: true });
            text = decoder.decode(buf);
          } catch {
            const decoder = new TextDecoder("euc-kr");
            text = decoder.decode(buf);
          }

          setTable(await parseCSV(text));
        } else {
          // XLSX — dynamic import SheetJS
          try {
            const XLSX = await import("xlsx");
            const res = await fetch(url);
            if (!res.ok) throw new Error("FETCH_FAILED");
            const buf = await res.arrayBuffer();
            const wb = XLSX.read(buf, { type: "array" });
            const ws = wb.Sheets[wb.SheetNames[0]];
            if (!ws) throw new Error("EMPTY_SHEET");

            const jsonRows = XLSX.utils.sheet_to_json<string[]>(ws, {
              header: 1,
              defval: "",
            });
            if (jsonRows.length === 0) {
              setTable({ headers: [], rows: [], truncated: false });
            } else {
              const headers = (jsonRows[0] || []).map(String);
              const dataRows = jsonRows.slice(1, MAX_PREVIEW_ROWS + 1).map((r) =>
                (r || []).map(String)
              );
              setTable({
                headers,
                rows: dataRows,
                truncated: jsonRows.length - 1 > MAX_PREVIEW_ROWS,
              });
            }
          } catch {
            setError("XLSX 프리뷰를 로드할 수 없습니다. 파일을 다운로드하세요.");
          }
        }
      } catch {
        setError("파일을 불러올 수 없습니다.");
      } finally {
        setLoading(false);
      }
    })();
  }, [url, extension]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-20 text-xs text-[var(--text-muted)]">
        프리뷰 로딩 중...
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-3 py-2 text-xs text-red-500">{error}</div>
    );
  }

  if (!table || (table.headers.length === 0 && table.rows.length === 0)) {
    return (
      <div className="px-3 py-2 text-xs text-[var(--text-muted)]">빈 파일</div>
    );
  }

  return (
    <div className="file-block-table max-h-[240px] overflow-auto border-t border-[var(--line)]">
      <table className="w-full text-xs border-collapse">
        <thead className="sticky top-0 bg-gray-50 dark:bg-white/5">
          <tr>
            {table.headers.map((h, i) => (
              <th
                key={i}
                className="px-2.5 py-1.5 text-left font-semibold text-[var(--text-primary)] border-b border-[var(--line)] whitespace-nowrap"
              >
                {h || `열 ${i + 1}`}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, ri) => (
            <tr
              key={ri}
              className="hover:bg-gray-50/50 dark:hover:bg-white/3"
            >
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className="px-2.5 py-1 text-[var(--text-secondary)] border-b border-[var(--line)]/50 whitespace-nowrap max-w-[200px] truncate"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {table.truncated && (
        <div className="px-3 py-1.5 text-[10px] text-[var(--text-muted)] text-center border-t border-[var(--line)]">
          {MAX_PREVIEW_ROWS}행까지만 표시 — 전체 보기는 파일을 다운로드하세요
        </div>
      )}
    </div>
  );
}
