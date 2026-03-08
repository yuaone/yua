"use client";

import { useState, useMemo } from "react";

interface Column<T> {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
  mono?: boolean;
  width?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  total: number;
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
  onRowClick?: (row: T) => void;
  loading?: boolean;
}

export default function DataTable<T extends Record<string, any>>({
  columns,
  data,
  total,
  page,
  limit,
  onPageChange,
  onRowClick,
  loading,
}: DataTableProps<T>) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const handleSort = (col: Column<T>) => {
    if (!col.sortable) return;
    if (sortKey === col.key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(col.key);
      setSortDir("asc");
    }
  };

  const sortedData = useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = typeof av === "number" ? av - bv : String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir]);

  // Pagination range
  const pageNumbers = useMemo(() => {
    const pages: (number | "ellipsis")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push("ellipsis");
      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (page < totalPages - 2) pages.push("ellipsis");
      pages.push(totalPages);
    }
    return pages;
  }, [page, totalPages]);

  // Skeleton loading
  if (loading) {
    return (
      <div className="admin-card" style={{ overflow: "hidden" }}>
        <table className="admin-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key}>{col.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 8 }).map((_, ri) => (
              <tr key={ri}>
                {columns.map((col) => (
                  <td key={col.key}>
                    <div
                      className="skeleton"
                      style={{
                        height: 14,
                        width: `${50 + Math.random() * 40}%`,
                      }}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div>
      <div className="admin-card" style={{ overflow: "hidden" }}>
        <table className="admin-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={col.sortable ? "sortable" : ""}
                  onClick={() => handleSort(col)}
                  style={{ width: col.width }}
                >
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    {col.label}
                    {col.sortable && sortKey === col.key && (
                      <span style={{ fontSize: 10, opacity: 0.7 }}>
                        {sortDir === "asc" ? "\u25B2" : "\u25BC"}
                      </span>
                    )}
                    {col.sortable && sortKey !== col.key && (
                      <span style={{ fontSize: 10, opacity: 0.25 }}>{"\u25B2"}</span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  style={{
                    textAlign: "center",
                    padding: "48px 16px",
                    color: "var(--text-muted)",
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.3 }}>
                      <circle cx="12" cy="12" r="10" />
                      <line x1="8" y1="12" x2="16" y2="12" />
                    </svg>
                    <span style={{ fontSize: 13 }}>데이터가 없습니다</span>
                  </div>
                </td>
              </tr>
            ) : (
              sortedData.map((row, i) => (
                <tr
                  key={row.id ?? i}
                  className={onRowClick ? "clickable" : ""}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={col.mono ? "data-mono" : ""}
                    >
                      {col.render ? col.render(row) : (row[col.key] ?? "-")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 16,
            fontSize: 12,
            color: "var(--text-muted)",
          }}
        >
          <span className="data-mono">
            {total.toLocaleString()}건 중 {((page - 1) * limit + 1).toLocaleString()}-
            {Math.min(page * limit, total).toLocaleString()}
          </span>
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <button
              className="page-btn"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15,18 9,12 15,6" />
              </svg>
            </button>
            {pageNumbers.map((p, i) =>
              p === "ellipsis" ? (
                <span key={`e${i}`} style={{ padding: "0 4px", color: "var(--text-muted)" }}>
                  ...
                </span>
              ) : (
                <button
                  key={p}
                  className={`page-btn ${p === page ? "active" : ""}`}
                  onClick={() => onPageChange(p)}
                >
                  {p}
                </button>
              )
            )}
            <button
              className="page-btn"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9,18 15,12 9,6" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
