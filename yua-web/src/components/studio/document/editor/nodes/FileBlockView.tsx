"use client";

import {
  FileText,
  File,
  Table,
  Archive,
  Play,
  AudioLines,
  Braces,
  Presentation,
  Download,
} from "lucide-react";
import { lazy, Suspense } from "react";
import type { FileCategory } from "../extensions/file-block";
import { formatFileSize } from "../extensions/file-block";

const SpreadsheetPreview = lazy(() => import("./SpreadsheetPreview"));

type Props = {
  fileName: string;
  extension: string;
  category: FileCategory;
  sizeBytes: number;
  url: string;
  uploadStatus: string;
  uploadProgress: number;
  selected?: boolean;
};

const ICON_CONFIG: Record<
  FileCategory,
  { icon: typeof File; bgLight: string; bgDark: string; iconColor: string; badgeColor: string }
> = {
  pdf: { icon: FileText, bgLight: "bg-red-50", bgDark: "dark:bg-red-950/30", iconColor: "text-red-600", badgeColor: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
  document: { icon: FileText, bgLight: "bg-blue-50", bgDark: "dark:bg-blue-950/30", iconColor: "text-blue-600", badgeColor: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
  spreadsheet: { icon: Table, bgLight: "bg-green-50", bgDark: "dark:bg-green-950/30", iconColor: "text-green-600", badgeColor: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
  csv: { icon: Table, bgLight: "bg-emerald-50", bgDark: "dark:bg-emerald-950/30", iconColor: "text-emerald-600", badgeColor: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" },
  presentation: { icon: Presentation, bgLight: "bg-orange-50", bgDark: "dark:bg-orange-950/30", iconColor: "text-orange-600", badgeColor: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300" },
  archive: { icon: Archive, bgLight: "bg-yellow-50", bgDark: "dark:bg-yellow-950/30", iconColor: "text-yellow-600", badgeColor: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300" },
  text: { icon: FileText, bgLight: "bg-gray-50", bgDark: "dark:bg-gray-800/30", iconColor: "text-gray-500", badgeColor: "bg-gray-100 text-gray-600 dark:bg-gray-800/40 dark:text-gray-300" },
  image: { icon: File, bgLight: "bg-indigo-50", bgDark: "dark:bg-indigo-950/30", iconColor: "text-indigo-500", badgeColor: "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300" },
  video: { icon: Play, bgLight: "bg-purple-50", bgDark: "dark:bg-purple-950/30", iconColor: "text-purple-600", badgeColor: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300" },
  audio: { icon: AudioLines, bgLight: "bg-pink-50", bgDark: "dark:bg-pink-950/30", iconColor: "text-pink-600", badgeColor: "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300" },
  code: { icon: Braces, bgLight: "bg-amber-50", bgDark: "dark:bg-amber-950/30", iconColor: "text-amber-600", badgeColor: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
  unknown: { icon: File, bgLight: "bg-gray-50", bgDark: "dark:bg-gray-800/30", iconColor: "text-gray-400", badgeColor: "bg-gray-100 text-gray-500 dark:bg-gray-800/40 dark:text-gray-400" },
};

export default function FileBlockView({
  fileName,
  extension,
  category,
  sizeBytes,
  url,
  uploadStatus,
  uploadProgress,
  selected,
}: Props) {
  const config = ICON_CONFIG[category] || ICON_CONFIG.unknown;
  const Icon = config.icon;
  const isUploading = uploadStatus === "uploading" || uploadStatus === "pending";
  const isError = uploadStatus === "error";
  const isSpreadsheet = category === "csv" || category === "spreadsheet";
  const showPreview = isSpreadsheet && uploadStatus === "complete" && url;

  return (
    <div
      className={`
        file-block-node group relative cursor-pointer select-none
        w-full ${showPreview ? "max-w-full" : "max-w-[280px]"} max-md:max-w-full
        rounded-xl border bg-white dark:bg-[#1b1b1b]
        border-[var(--line)] overflow-hidden
        ${selected ? "ring-2 ring-blue-500/50" : ""}
        ${isUploading ? "file-block-uploading" : ""}
      `}
      onClick={() => {
        if (url && uploadStatus === "complete") {
          window.open(url, "_blank", "noopener");
        }
      }}
    >
      {/* Icon area */}
      <div className={`flex items-center justify-center h-[100px] ${config.bgLight} ${config.bgDark}`}>
        <Icon size={36} className={config.iconColor} />
      </div>

      {/* Info area */}
      <div className="px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="truncate text-sm font-medium text-[var(--text-primary)]">
            {fileName || "Untitled"}
          </div>
          {extension && (
            <span className={`flex-shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase ${config.badgeColor}`}>
              .{extension}
            </span>
          )}
        </div>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-xs text-[var(--text-muted)]">
            {formatFileSize(sizeBytes)}
          </span>
          {uploadStatus === "complete" && (
            <Download size={12} className="text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </div>

        {/* Upload progress */}
        {isUploading && (
          <div className="mt-2 h-1 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-blue-500 transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        )}

        {/* Error state */}
        {isError && (
          <div className="mt-1.5 text-xs text-red-500">
            업로드 실패 — 클릭하여 재시도
          </div>
        )}
      </div>

      {/* Spreadsheet preview */}
      {showPreview && (
        <div onClick={(e) => e.stopPropagation()}>
          <Suspense
            fallback={
              <div className="h-20 flex items-center justify-center text-xs text-[var(--text-muted)]">
                프리뷰 로딩 중...
              </div>
            }
          >
            <SpreadsheetPreview url={url} extension={extension} />
          </Suspense>
        </div>
      )}
    </div>
  );
}
