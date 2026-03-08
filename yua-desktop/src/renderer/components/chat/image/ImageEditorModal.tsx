import {
  useRef,
  useState,
  useCallback,
  useEffect,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { X, Undo2, Trash2, Check, Minus } from "lucide-react";

/* =========================
   Types
========================= */
type Stroke = {
  color: string;
  width: number;
  points: { x: number; y: number }[];
};

type Props = {
  file: File;
  previewUrl: string;
  onConfirm: (editedFile: File, newPreviewUrl: string) => void;
  onCancel: () => void;
};

/* =========================
   Constants
========================= */
const COLORS = [
  { value: "#EF4444", label: "red" },
  { value: "#3B82F6", label: "blue" },
  { value: "#22C55E", label: "green" },
  { value: "#EAB308", label: "yellow" },
  { value: "#000000", label: "black" },
  { value: "#FFFFFF", label: "white" },
];

const LINE_WIDTHS = [2, 4, 8] as const;

// Cap canvas to safe size
const MAX_CANVAS_DIM = 2048;

/* =========================
   Component
========================= */
export default function ImageEditorModal({
  file,
  previewUrl,
  onConfirm,
  onCancel,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [imgLoaded, setImgLoaded] = useState(false);
  const [naturalW, setNaturalW] = useState(0);
  const [naturalH, setNaturalH] = useState(0);
  const [displayW, setDisplayW] = useState(0);
  const [displayH, setDisplayH] = useState(0);

  const [color, setColor] = useState(COLORS[0].value);
  const [lineWidth, setLineWidth] = useState<number>(4);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const activeStrokeRef = useRef<Stroke | null>(null);
  const isDrawingRef = useRef(false);

  /* ---- Fit image to viewport ---- */
  const computeDisplay = useCallback(() => {
    if (!naturalW || !naturalH) return;
    const maxW = window.innerWidth * 0.92;
    const maxH = window.innerHeight * 0.72;

    let w = naturalW;
    let h = naturalH;

    if (w > maxW) {
      h = h * (maxW / w);
      w = maxW;
    }
    if (h > maxH) {
      w = w * (maxH / h);
      h = maxH;
    }

    setDisplayW(Math.round(w));
    setDisplayH(Math.round(h));
  }, [naturalW, naturalH]);

  useEffect(() => {
    computeDisplay();
    window.addEventListener("resize", computeDisplay);
    return () => window.removeEventListener("resize", computeDisplay);
  }, [computeDisplay]);

  const handleImgLoad = useCallback(() => {
    const img = imgRef.current;
    if (!img) return;
    let w = img.naturalWidth;
    let h = img.naturalHeight;
    // Cap to MAX_CANVAS_DIM (H-05)
    if (w > MAX_CANVAS_DIM || h > MAX_CANVAS_DIM) {
      const ratio = Math.min(MAX_CANVAS_DIM / w, MAX_CANVAS_DIM / h);
      w = Math.round(w * ratio);
      h = Math.round(h * ratio);
    }
    setNaturalW(w);
    setNaturalH(h);
    setImgLoaded(true);
  }, []);

  /* ---- Redraw canvas ---- */
  const redraw = useCallback(
    (strokesList: Stroke[], active?: Stroke | null) => {
      const canvas = canvasRef.current;
      if (!canvas || !naturalW) return;

      canvas.width = naturalW;
      canvas.height = naturalH;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.clearRect(0, 0, naturalW, naturalH);

      const scale = naturalW / displayW;

      const drawStroke = (s: Stroke) => {
        if (s.points.length < 2) return;
        ctx.strokeStyle = s.color;
        ctx.lineWidth = s.width * scale;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(s.points[0].x * scale, s.points[0].y * scale);
        for (let i = 1; i < s.points.length; i++) {
          ctx.lineTo(s.points[i].x * scale, s.points[i].y * scale);
        }
        ctx.stroke();
      };

      strokesList.forEach(drawStroke);
      if (active) drawStroke(active);
    },
    [naturalW, naturalH, displayW]
  );

  useEffect(() => {
    if (imgLoaded && displayW > 0) {
      redraw(strokes);
    }
  }, [imgLoaded, displayW, strokes, redraw]);

  /* ---- Coordinate helper ---- */
  const getPos = useCallback(
    (e: ReactPointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    },
    []
  );

  /* ---- Drawing handlers (pointer events for unified mouse+touch) ---- */
  const handlePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      const canvas = canvasRef.current;
      if (canvas) {
        (canvas as HTMLElement).setPointerCapture(e.pointerId);
      }
      isDrawingRef.current = true;
      const pos = getPos(e);
      activeStrokeRef.current = {
        color,
        width: lineWidth,
        points: [pos],
      };
    },
    [color, lineWidth, getPos]
  );

  const handlePointerMove = useCallback(
    (e: ReactPointerEvent<HTMLCanvasElement>) => {
      if (!isDrawingRef.current || !activeStrokeRef.current) return;
      e.preventDefault();
      const pos = getPos(e);
      activeStrokeRef.current.points.push(pos);
      redraw(strokes, activeStrokeRef.current);
    },
    [getPos, strokes, redraw]
  );

  const handlePointerUp = useCallback(
    (e: ReactPointerEvent<HTMLCanvasElement>) => {
      if (!isDrawingRef.current || !activeStrokeRef.current) return;
      e.preventDefault();
      isDrawingRef.current = false;
      const finished = activeStrokeRef.current;
      activeStrokeRef.current = null;
      if (finished.points.length >= 2) {
        setStrokes((prev) => [...prev, finished]);
      }
    },
    []
  );

  /* ---- Undo / Clear ---- */
  const handleUndo = useCallback(() => {
    setStrokes((prev) => prev.slice(0, -1));
  }, []);

  const handleClear = useCallback(() => {
    setStrokes([]);
  }, []);

  /* ---- Confirm: merge image + canvas ---- */
  const handleConfirm = useCallback(async () => {
    // Final redraw to ensure canvas is current
    redraw(strokes);

    const mergeCanvas = document.createElement("canvas");
    mergeCanvas.width = naturalW;
    mergeCanvas.height = naturalH;
    const ctx = mergeCanvas.getContext("2d");
    if (!ctx) return;

    // Draw original image
    const img = imgRef.current;
    if (img) {
      ctx.drawImage(img, 0, 0, naturalW, naturalH);
    }

    // Draw strokes on top
    const strokeCanvas = canvasRef.current;
    if (strokeCanvas) {
      ctx.drawImage(strokeCanvas, 0, 0);
    }

    // Export
    mergeCanvas.toBlob(
      (blob) => {
        if (!blob) return;
        const ext = file.name.match(/\.\w+$/)?.[0] ?? ".png";
        const newName = file.name.replace(/\.\w+$/, "") + "_edited" + ext;
        const newFile = new File([blob], newName, {
          type: blob.type,
          lastModified: Date.now(),
        });
        const newUrl = URL.createObjectURL(newFile);
        onConfirm(newFile, newUrl);
      },
      file.type.startsWith("image/png") ? "image/png" : "image/jpeg",
      0.92
    );
  }, [strokes, naturalW, naturalH, file, onConfirm, redraw]);

  /* ---- Prevent body scroll when modal is open ---- */
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/90">
      {/* ===== Top bar ===== */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/60">
        <div className="flex items-center gap-3">
          {/* Colors */}
          <div className="flex items-center gap-1.5">
            {COLORS.map((c) => (
              <button
                key={c.value}
                onClick={() => setColor(c.value)}
                className={`
                  w-7 h-7 rounded-full border-2 transition-all
                  ${color === c.value ? "border-white scale-110" : "border-transparent opacity-70 hover:opacity-100"}
                `}
                style={{ backgroundColor: c.value }}
                title={c.label}
              />
            ))}
          </div>

          <div className="w-px h-6 bg-white/20" />

          {/* Line widths */}
          <div className="flex items-center gap-1.5">
            {LINE_WIDTHS.map((w) => (
              <button
                key={w}
                onClick={() => setLineWidth(w)}
                className={`
                  flex items-center justify-center
                  w-8 h-8 rounded-lg transition-all
                  ${lineWidth === w ? "bg-white/20" : "hover:bg-white/10"}
                `}
                title={`${w}px`}
              >
                <Minus
                  size={16}
                  className="text-white"
                  strokeWidth={w}
                />
              </button>
            ))}
          </div>

          <div className="w-px h-6 bg-white/20" />

          {/* Undo / Clear */}
          <button
            onClick={handleUndo}
            disabled={strokes.length === 0}
            className="p-2 rounded-lg text-white hover:bg-white/10 disabled:opacity-30 transition"
            title="Undo"
          >
            <Undo2 size={18} />
          </button>
          <button
            onClick={handleClear}
            disabled={strokes.length === 0}
            className="p-2 rounded-lg text-white hover:bg-white/10 disabled:opacity-30 transition"
            title="Clear all"
          >
            <Trash2 size={18} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-white/80 hover:bg-white/10 text-sm transition"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 rounded-lg bg-white text-black text-sm font-medium hover:bg-white/90 transition"
          >
            Apply
          </button>
        </div>
      </div>

      {/* ===== Canvas area ===== */}
      <div
        ref={containerRef}
        className="flex-1 flex items-center justify-center overflow-hidden"
      >
        {/* Hidden image for natural size detection */}
        <img
          ref={imgRef}
          src={previewUrl}
          alt="edit"
          onLoad={handleImgLoad}
          className="hidden"
          crossOrigin="anonymous"
        />

        {imgLoaded && displayW > 0 && (
          <div
            className="relative"
            style={{ width: displayW, height: displayH }}
          >
            {/* Visible image */}
            <img
              src={previewUrl}
              alt="edit"
              className="absolute inset-0 w-full h-full object-contain rounded-lg pointer-events-none select-none"
              draggable={false}
            />

            {/* Drawing canvas */}
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full rounded-lg cursor-crosshair"
              style={{ touchAction: "none" }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            />
          </div>
        )}
      </div>
    </div>
  );
}
