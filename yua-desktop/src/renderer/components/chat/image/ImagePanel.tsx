import { useMemo, useState, useCallback } from "react";
import type { AttachmentMeta } from "yua-shared/chat/attachment-types";
import { motion, AnimatePresence } from "framer-motion";
import { FileImage, ChevronLeft, ChevronRight, X } from "lucide-react";

type Props = {
  attachments?: AttachmentMeta[];
};

/* ==============================
   Helpers
============================== */
function formatSize(bytes?: number): string {
  if (bytes == null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/* ==============================
   ImagePanel
============================== */
export default function ImagePanel({ attachments }: Props) {
  const images = useMemo(
    () =>
      (attachments ?? [])
        .filter((a) => a.kind === "image")
        .map((a) => ({
          id: a.id ?? `${a.fileName ?? "image"}-${a.fileUrl ?? a.url ?? a.previewUrl ?? ""}`,
          url: a.fileUrl ?? a.url ?? a.previewUrl ?? "",
          fileName: a.fileName ?? "image",
          sizeBytes: a.sizeBytes,
        }))
        .filter((a) => a.url),
    [attachments]
  );

  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [errorIds, setErrorIds] = useState<Set<string>>(new Set());

  const openPreview = useCallback((idx: number) => setPreviewIndex(idx), []);
  const closePreview = useCallback(() => setPreviewIndex(null), []);

  const goLeft = useCallback(() => {
    setPreviewIndex((prev) => {
      if (prev == null || prev <= 0) return prev;
      return prev - 1;
    });
  }, []);

  const goRight = useCallback(() => {
    setPreviewIndex((prev) => {
      if (prev == null || prev >= images.length - 1) return prev;
      return prev + 1;
    });
  }, [images.length]);

  const handleImgError = useCallback((id: string) => {
    setErrorIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  // Keyboard navigation in fullscreen
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowLeft") goLeft();
      else if (e.key === "ArrowRight") goRight();
      else if (e.key === "Escape") closePreview();
    },
    [goLeft, goRight, closePreview]
  );

  if (images.length === 0) return null;

  const isSingle = images.length === 1;

  return (
    <>
      {/* ---- Grid: 1 image = single, 2+ = grid-cols-2 ---- */}
      <div
        className={
          isSingle
            ? "mt-2"
            : "mt-2 grid grid-cols-2 gap-2 max-w-[480px]"
        }
      >
        {images.map((img, idx) => {
          const hasError = errorIds.has(img.id);

          return (
            <div
              key={img.id}
              className={`
                relative overflow-hidden rounded-xl group
                ${isSingle ? "max-w-[240px]" : ""}
              `}
            >
              {hasError ? (
                /* Fallback placeholder */
                <div
                  className="
                    flex flex-col items-center justify-center gap-2
                    w-full min-h-[120px]
                    rounded-xl border
                    px-4 py-6
                  "
                  style={{
                    background: "var(--wash)",
                    borderColor: "var(--line)",
                    color: "var(--text-muted)",
                  }}
                >
                  <FileImage size={28} />
                  <span className="text-[12px]">Failed to load</span>
                </div>
              ) : (
                <div
                  className="cursor-zoom-in relative"
                  onClick={() => openPreview(idx)}
                >
                  <img
                    src={img.url}
                    alt=""
                    className={`
                      w-full h-auto object-cover rounded-xl
                      ${!isSingle ? "aspect-square object-cover" : ""}
                    `}
                    onError={() => handleImgError(img.id)}
                  />
                  {/* Hover overlay: file size only (no filename) */}
                  {img.sizeBytes != null && (
                    <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-b-xl">
                      <span className="text-[11px] text-white/90 font-medium">
                        {formatSize(img.sizeBytes)}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ---- Fullscreen modal with left/right nav ---- */}
      <AnimatePresence>
        {previewIndex != null && images[previewIndex] && (
          <motion.div
            key="preview-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center"
            onClick={closePreview}
            onKeyDown={handleKeyDown}
            tabIndex={0}
            role="dialog"
          >
            {/* Close button */}
            <button
              onClick={closePreview}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition"
            >
              <X size={20} />
            </button>

            {/* Left arrow */}
            {images.length > 1 && previewIndex > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); goLeft(); }}
                className="absolute left-3 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition"
              >
                <ChevronLeft size={24} />
              </button>
            )}

            {/* Right arrow */}
            {images.length > 1 && previewIndex < images.length - 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); goRight(); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition"
              >
                <ChevronRight size={24} />
              </button>
            )}

            {/* Image */}
            <motion.img
              key={images[previewIndex].url}
              src={images[previewIndex].url}
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="max-h-[90vh] max-w-[90vw] rounded-xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />

            {/* Counter */}
            {images.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/50 text-white text-[13px] font-medium">
                {previewIndex + 1} / {images.length}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
