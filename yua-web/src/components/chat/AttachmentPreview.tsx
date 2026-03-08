"use client";

import { useState, useCallback } from "react";
import { X, FileSpreadsheet, FileArchive, FileImage, FileText, FileCode, File as FileIcon, Pencil } from "lucide-react";
import ImageEditorModal from "@/components/chat/image/ImageEditorModal";

/* =========================
   Types
========================= */
type Attachment = {
  id: string;
  file: File;
  kind: "image" | "file";
  previewUrl?: string;
  status: "idle" | "uploading" | "done" | "error";
};

type Props = {
  attachments: Attachment[];
  uploadProgress?: Record<string, number>;
  onRemove: (id: string) => void;
  onReplace?: (id: string, newFile: File, newPreviewUrl: string) => void;
};

/* =========================
   Helpers
========================= */
function getExt(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : "";
}

type FileStyle = {
  icon: React.ReactNode;
  bg: string;
  border: string;
  label: string;
  labelColor: string;
};

function getFileStyle(name: string): FileStyle {
  const ext = getExt(name);

  // Spreadsheet
  if (["csv", "xlsx", "xls", "tsv"].includes(ext)) {
    return {
      icon: <FileSpreadsheet size={18} className="text-emerald-600 dark:text-emerald-400" />,
      bg: "bg-emerald-50 dark:bg-emerald-900/30",
      border: "border-emerald-200 dark:border-emerald-700/50",
      label: "\uC2A4\uD504\uB808\uB4DC\uC2DC\uD2B8",
      labelColor: "text-emerald-600 dark:text-emerald-400",
    };
  }

  // PDF
  if (ext === "pdf") {
    return {
      icon: <FileText size={18} className="text-rose-600 dark:text-rose-400" />,
      bg: "bg-rose-50 dark:bg-rose-900/30",
      border: "border-rose-200 dark:border-rose-700/50",
      label: "\uBB38\uC11C",
      labelColor: "text-rose-600 dark:text-rose-400",
    };
  }

  // DOCX / DOC
  if (["docx", "doc"].includes(ext)) {
    return {
      icon: <FileText size={18} className="text-blue-600 dark:text-blue-400" />,
      bg: "bg-blue-50 dark:bg-blue-900/30",
      border: "border-blue-200 dark:border-blue-700/50",
      label: "\uBB38\uC11C",
      labelColor: "text-blue-600 dark:text-blue-400",
    };
  }

  // HWP
  if (ext === "hwp") {
    return {
      icon: <FileText size={18} className="text-orange-600 dark:text-orange-400" />,
      bg: "bg-amber-50 dark:bg-amber-900/30",
      border: "border-amber-200 dark:border-amber-700/50",
      label: "\uBB38\uC11C",
      labelColor: "text-orange-600 dark:text-orange-400",
    };
  }

  // Other document types
  if (["rtf", "md", "txt"].includes(ext)) {
    return {
      icon: <FileText size={18} className="text-gray-600 dark:text-gray-400" />,
      bg: "bg-gray-50 dark:bg-gray-800/40",
      border: "border-gray-200 dark:border-gray-700/50",
      label: "\uBB38\uC11C",
      labelColor: "text-gray-500 dark:text-gray-400",
    };
  }

  // Archive
  if (["zip", "rar", "7z", "tar", "gz", "bz2"].includes(ext)) {
    return {
      icon: <FileArchive size={18} className="text-amber-600 dark:text-amber-400" />,
      bg: "bg-amber-50 dark:bg-amber-900/30",
      border: "border-amber-200 dark:border-amber-700/50",
      label: "\uC555\uCD95",
      labelColor: "text-amber-600 dark:text-amber-400",
    };
  }

  // Image files (when treated as file kind)
  if (["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "ico"].includes(ext)) {
    return {
      icon: <FileImage size={18} className="text-sky-600 dark:text-sky-400" />,
      bg: "bg-sky-50 dark:bg-sky-900/30",
      border: "border-sky-200 dark:border-sky-700/50",
      label: "\uC774\uBBF8\uC9C0",
      labelColor: "text-sky-600 dark:text-sky-400",
    };
  }

  // Code
  if (["ts", "tsx", "js", "jsx", "py", "java", "c", "cpp", "rs", "go", "rb", "php", "swift", "html", "css", "json", "yaml", "yml", "toml", "sh", "bash"].includes(ext)) {
    return {
      icon: <FileCode size={18} className="text-violet-600 dark:text-violet-400" />,
      bg: "bg-violet-50 dark:bg-violet-900/30",
      border: "border-violet-200 dark:border-violet-700/50",
      label: "\uCF54\uB4DC",
      labelColor: "text-violet-600 dark:text-violet-400",
    };
  }

  // Default
  return {
    icon: <FileIcon size={18} className="text-gray-500 dark:text-gray-400" />,
    bg: "bg-gray-50 dark:bg-gray-800/40",
    border: "border-gray-200 dark:border-gray-700/50",
    label: "\uD30C\uC77C",
    labelColor: "text-gray-500 dark:text-gray-400",
  };
}

function truncateName(name: string, maxLen = 20): string {
  if (name.length <= maxLen) return name;
  const ext = getExt(name);
  const base = ext ? name.slice(0, name.length - ext.length - 1) : name;
  const keep = maxLen - (ext ? ext.length + 2 : 1);
  if (keep < 3) return name.slice(0, maxLen - 1) + "\u2026";
  return base.slice(0, keep) + "\u2026" + (ext ? "." + ext : "");
}

/* =========================
   Main Component
========================= */
export default function AttachmentPreview({
  attachments,
  uploadProgress,
  onRemove,
  onReplace,
}: Props) {
  const [editorTarget, setEditorTarget] = useState<Attachment | null>(null);

  const handleEditorConfirm = useCallback(
    (editedFile: File, newPreviewUrl: string) => {
      if (!editorTarget) return;
      onReplace?.(editorTarget.id, editedFile, newPreviewUrl);
      setEditorTarget(null);
    },
    [editorTarget, onReplace]
  );

  if (attachments.length === 0) return null;

  return (
    <>
 <div
   className="
     flex flex-wrap
     gap-2
     max-w-full
     overflow-x-hidden
   "
 >
        <div className="flex flex-wrap gap-2">
          {attachments.map((att) => (
            <AttachmentCard
              key={att.id}
              att={att}
              uploadProgress={uploadProgress}
              onRemove={onRemove}
              onEdit={
                att.kind === "image" &&
                att.previewUrl &&
                att.status === "idle" &&
                att.previewUrl.startsWith("blob:")
                  ? () => setEditorTarget(att)
                  : undefined
              }
            />
          ))}
        </div>
      </div>

      {/* Image Editor Modal */}
      {editorTarget && editorTarget.previewUrl && (
        <ImageEditorModal
          file={editorTarget.file}
          previewUrl={editorTarget.previewUrl}
          onConfirm={handleEditorConfirm}
          onCancel={() => setEditorTarget(null)}
        />
      )}
    </>
  );
}

/* =========================
   AttachmentCard
========================= */
function AttachmentCard({
  att,
  uploadProgress,
  onRemove,
  onEdit,
}: {
  att: Attachment;
  uploadProgress?: Record<string, number>;
  onRemove: (id: string) => void;
  onEdit?: () => void;
}) {
  const [imgError, setImgError] = useState(false);
  const isImage = att.kind === "image" && att.previewUrl && !imgError;
  const style = getFileStyle(att.file.name);

  return (
    <div className="relative group">
      {/* Upload overlay */}
      {att.status === "uploading" && (
        <div className="absolute inset-0 z-10 rounded-lg bg-white/60 dark:bg-black/40 flex items-center justify-center transition-opacity duration-200">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-black dark:border-gray-500 dark:border-t-white" />
        </div>
      )}

      {/* Progress bar */}
      {uploadProgress?.[att.id] != null && uploadProgress[att.id] < 100 && (
        <div className="absolute inset-0 z-10 rounded-lg bg-black/40 flex items-end overflow-hidden">
          <div
            className="h-1 bg-white transition-all"
            style={{ width: `${uploadProgress[att.id]}%` }}
          />
        </div>
      )}

      {isImage ? (
        /* ---- Image preview card: thumbnail only ---- */
        <div
          className="rounded-xl border border-gray-200 dark:border-[var(--line)] bg-white dark:bg-[var(--surface-panel)] p-1 shadow-[0_1px_2px_rgba(0,0,0,0.04)] cursor-pointer"
          onClick={onEdit}
        >
          <img
            src={att.previewUrl}
            alt=""
 className="
   w-[72px] h-[72px]
   sm:w-[80px] sm:h-[80px]
   object-cover rounded-lg
   flex-shrink-0
 "
            onError={() => setImgError(true)}
          />
          {/* Edit indicator on hover */}
          {onEdit && (
            <div className="absolute inset-0 rounded-xl bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
              <Pencil size={18} className="text-white drop-shadow" />
            </div>
          )}
        </div>
      ) : (
        /* ---- File preview card: compact single-line bar ---- */
        <div
          className={`
            flex items-center gap-2
            h-10 rounded-lg border ${style.border} ${style.bg}
            pl-2.5 pr-6
            max-w-[260px]
            shadow-[0_1px_2px_rgba(0,0,0,0.04)]
          `}
        >
          {/* Icon */}
          <div className="shrink-0 flex items-center justify-center w-6 h-6">
            {style.icon}
          </div>

          {/* Filename */}
          <span
            className="text-[13px] font-medium text-[var(--text-primary)] truncate leading-none min-w-0"
            title={att.file.name}
          >
            {truncateName(att.file.name)}
          </span>

          {/* Type label */}
          <span className={`shrink-0 text-[11px] font-medium ${style.labelColor} ml-auto`}>
            {style.label}
          </span>
        </div>
      )}

      {/* Remove button */}
      <button
        onClick={() => onRemove(att.id)}
        className="absolute -top-2 -right-2 z-20 bg-black dark:bg-gray-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-gray-700 transition"
      >
        <X size={12} />
      </button>
    </div>
  );
}
