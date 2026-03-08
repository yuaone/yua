/**
 * SSOT:
 * - Markdown table이 있으면 → Markdown에서 자동승격
 * - meta.compareTable은 fallback 전용
 * - CompareTableBlock은 "문서 블록"이며 inline 요소 아님
 */
import { useEffect, useRef, useState } from "react";

type CompareTableColumn = {
  key: string;
  title: string;
};

type CompareTableRow = {
  label: string;
  values: Record<string, string>;
};

type Props = {
  data: {
    caption?: string;
    columns: CompareTableColumn[];
    rows: CompareTableRow[];
  };
};

export default function CompareTableBlock({ data }: Props) {
  const { caption, columns, rows } = data;
    // DEBUG (dev only)
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.log("[COMPARE_BLOCK][MOUNT]", {
        cols: columns.length,
        rows: rows.length,
      });
    }
  }, [columns.length, rows.length]);

    const [collapsed, setCollapsed] = useState(false);
    const [copied, setCopied] = useState(false);
    const copyTimerRef = useRef<number | null>(null);

  /* =========================
     Entrance animation (SSOT)
  ========================= */
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect(); // 🔒 1회만
        }
      },
     { threshold: 0 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  function renderCell(value: string) {
  const v = value.trim();

  // ⭐ 별점 (★★★★★ / ★★★☆☆)
  if (/^[★☆]+$/.test(v)) {
    return <span className="tracking-wider text-yellow-500">{v}</span>;
  }

  // ✔️ / ❌
  if (v === "✔️" || v === "✓") {
    return <span className="text-green-600 font-semibold">✔️</span>;
  }
  if (v === "❌" || v === "✗") {
    return <span className="text-red-500 font-semibold">❌</span>;
  }

  // 강조 키워드
  if (["매우 강함", "강함"].includes(v)) {
    return <span className="font-semibold text-[var(--text-primary)]">{v}</span>;
  }

  return v;
}

    function serializeTable() {
    const header = ["구분", ...columns.map((c) => c.title)].join("\t");
    const body = rows.map((row) =>
      [row.label, ...columns.map((c) => row.values[c.key] ?? "—")].join("\t")
    );
    return [header, ...body].join("\n");
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(serializeTable());
      setCopied(false); // 🔥 상태 리셋 보장
      requestAnimationFrame(() => {
        setCopied(true);
        if (copyTimerRef.current) {
          clearTimeout(copyTimerRef.current);
        }
        copyTimerRef.current = window.setTimeout(() => {
          setCopied(false);
        }, 1200);
      });

    } catch {}
  };

  return (
    <section
      ref={ref}
      className={`
        my-16 space-y-6
        transition-all duration-700 ease-out
        ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}
      `}
    >
      {/* Caption */}
      {(caption || true) && (
        <div className="flex items-center justify-between gap-4 text-[15px] text-[var(--text-secondary)]">
          <div className="font-medium">{caption}</div>
          <div className="flex items-center gap-3 text-sm">
            <button
              onClick={() => setCollapsed((v) => !v)}
              className="hover:text-[var(--text-primary)] transition pointer-events-auto"
            >
              {collapsed ? "표 펼치기" : "표 접기"}
            </button>
            <button
              onClick={handleCopy}
              className={`transition pointer-events-auto ${
                copied ? "text-emerald-600" : "hover:text-[var(--text-primary)]"
                }`}
            >
              {copied ? "✓ 복사됨" : "표 복사"}
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      {!collapsed && (
        <div className="overflow-x-auto rounded-2xl border border-[var(--line)] bg-[var(--card-bg)] shadow-sm">
          <table className="min-w-full text-[16.5px] leading-[1.85]">
          <thead className="bg-white/5">
            <tr>
              <th className="px-7 py-5 text-left text-sm font-medium text-[var(--text-secondary)]">
                구분
              </th>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-7 py-5 text-left text-sm font-semibold text-[var(--text-primary)]"
                >
                  {col.title}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-[var(--line)]">
            {rows.map((row, idx) => (
              <tr
                key={idx}
                className="odd:bg-transparent even:bg-white/5"
              >
                <td className="px-7 py-6 font-medium text-[var(--text-secondary)] whitespace-pre-wrap">
                  {row.label}
                </td>

                {columns.map((col) => (
                  <td
                    key={col.key}
                    className="px-7 py-6 whitespace-pre-wrap text-[var(--text-secondary)]"
                  >
                    {renderCell(row.values[col.key] ?? "—")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}
    </section>
  );
}
