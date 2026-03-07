"use client";

import React, { useState } from "react";
import type { ToolArtifact } from "yua-shared/tool/tool-artifact.types";

type Props = {
  artifact: ToolArtifact;
};

function ImagePanel({ artifact }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (!artifact.imageUrl) return null;

  return (
    <div className="yua-artifact-image-panel mt-2 mb-2">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="block w-full overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--wash)] transition-all hover:border-[var(--ink-2)]/30"
      >
        <img
          src={artifact.imageUrl}
          alt={artifact.caption ?? "Image analysis"}
          className={`w-full object-contain transition-all ${expanded ? "max-h-[600px]" : "max-h-[240px]"}`}
          loading="lazy"
        />
      </button>
      {artifact.caption && (
        <p className="mt-1 text-[11px] text-[var(--text-muted)] leading-snug">
          {artifact.caption}
        </p>
      )}
    </div>
  );
}

function CsvPreview({ artifact }: Props) {
  if (!artifact.csvPreview) return null;
  const { headers, rows, totalRows } = artifact.csvPreview;

  return (
    <div className="yua-artifact-csv mt-2 mb-2 overflow-x-auto rounded-lg border border-[var(--line)]">
      <table className="w-full text-[11px] leading-tight">
        <thead>
          <tr className="bg-[var(--wash)]">
            {headers.map((h, i) => (
              <th
                key={i}
                className="px-2 py-1.5 text-left font-semibold text-[var(--text-secondary)] whitespace-nowrap border-b border-[var(--line)]"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className="border-b border-[var(--line)] last:border-b-0">
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className="px-2 py-1 text-[var(--text-primary)] whitespace-nowrap"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {totalRows > rows.length && (
        <div className="px-2 py-1 text-[10px] text-[var(--text-muted)] bg-[var(--wash)] border-t border-[var(--line)]">
          {rows.length} / {totalRows} rows
        </div>
      )}
    </div>
  );
}

function CodeOutput({ artifact }: Props) {
  if (!artifact.code && !artifact.imageUrl) return null;

  return (
    <div className="yua-artifact-code mt-2 mb-2 space-y-2">
      {artifact.code && (
        <pre className="overflow-x-auto rounded-lg bg-[#1e1e1e] dark:bg-[#0d1117] p-3 text-[11px] leading-relaxed text-[#d4d4d4]">
          <code>{artifact.code.source}</code>
          {artifact.code.output && (
            <>
              <div className="mt-2 pt-2 border-t border-white/10 text-[#9cdcfe]">
                {artifact.code.output}
              </div>
            </>
          )}
        </pre>
      )}
      {artifact.imageUrl && (
        <div className="overflow-hidden rounded-lg border border-[var(--line)]">
          <img
            src={artifact.imageUrl}
            alt={artifact.caption ?? "Chart output"}
            className="w-full max-h-[360px] object-contain bg-white dark:bg-[#1a1a2e]"
            loading="lazy"
          />
        </div>
      )}
    </div>
  );
}

export default function ToolArtifactRenderer({ artifact }: Props) {
  switch (artifact.kind) {
    case "IMAGE_PANEL":
      return <ImagePanel artifact={artifact} />;
    case "CSV_PREVIEW":
      return <CsvPreview artifact={artifact} />;
    case "CODE_OUTPUT":
      return <CodeOutput artifact={artifact} />;
    case "CODE_ERROR":
      return (
        <div className="mt-2 mb-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 p-3">
          <pre className="text-[11px] text-red-700 dark:text-red-300 whitespace-pre-wrap">
            {artifact.code?.output ?? "Error"}
          </pre>
        </div>
      );
    default:
      return null;
  }
}
