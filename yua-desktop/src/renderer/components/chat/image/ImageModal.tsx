import { useEffect, useRef, useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  images: { src: string; alt?: string }[];
  initialIndex?: number;
  onClose: () => void;
};

export default function ImageModal({
  images,
  initialIndex = 0,
  onClose,
}: Props) {
  const [index, setIndex] = useState(initialIndex);
  const touchStartX = useRef<number | null>(null);

  const hasMultiple = images.length > 1;
  const current = images[index];

  /* =========================
     Keyboard (ESC / <- ->)
  ========================= */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (!hasMultiple) return;

      if (e.key === "ArrowLeft") {
        setIndex((i) => (i > 0 ? i - 1 : i));
      }
      if (e.key === "ArrowRight") {
        setIndex((i) =>
          i < images.length - 1 ? i + 1 : i
        );
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, hasMultiple, images.length]);

  /* =========================
     Swipe (Touch)
  ========================= */
  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current == null) return;

    const delta =
      e.changedTouches[0].clientX - touchStartX.current;

    const THRESHOLD = 50; // SSOT: 과민 반응 방지

    if (Math.abs(delta) > THRESHOLD && hasMultiple) {
      if (delta > 0 && index > 0) {
        setIndex(index - 1);
      }
      if (delta < 0 && index < images.length - 1) {
        setIndex(index + 1);
      }
    }

    touchStartX.current = null;
  }

  return (
    <div
      className="
        fixed inset-0 z-[9999]
        bg-black/80
        backdrop-blur-sm
        flex items-center justify-center
      "
      onClick={onClose}
    >
      <div
        className="relative max-w-[92vw] max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="
            absolute -top-12 right-0
            text-white/80 hover:text-white
            transition
          "
          aria-label="Close image"
        >
          <X size={28} />
        </button>

        {/* Left */}
        {hasMultiple && index > 0 && (
          <button
            onClick={() => setIndex(index - 1)}
            className="
              absolute left-2 lg:left-[-56px] top-1/2 -translate-y-1/2
              bg-black/40 lg:bg-transparent rounded-full
              text-white/70 hover:text-white
              transition
            "
            aria-label="Previous image"
          >
            <ChevronLeft size={36} />
          </button>
        )}

        {/* Right */}
        {hasMultiple && index < images.length - 1 && (
          <button
            onClick={() => setIndex(index + 1)}
            className="
              absolute right-2 lg:right-[-56px] top-1/2 -translate-y-1/2
              bg-black/40 lg:bg-transparent rounded-full
              text-white/70 hover:text-white
              transition
            "
            aria-label="Next image"
          >
            <ChevronRight size={36} />
          </button>
        )}

        {/* Image */}
        <img
          src={current.src}
          alt={current.alt ?? ""}
          className="
            max-w-[92vw]
            max-h-[92vh]
            rounded-xl
            bg-black
            shadow-2xl
            select-none
          "
          draggable={false}
          onContextMenu={(e) => e.stopPropagation()}
        />

        {/* Counter */}
        {hasMultiple && (
          <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 text-white/70 text-sm">
            {index + 1} / {images.length}
          </div>
        )}
      </div>
    </div>
  );
}
