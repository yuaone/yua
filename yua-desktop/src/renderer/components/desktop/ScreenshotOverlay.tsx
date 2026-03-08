import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Check, Monitor } from 'lucide-react';
import { isDesktop } from '@/lib/desktop-bridge';

interface ScreenSource {
  id: string;
  name: string;
  thumbnail: string;
  appIcon: string | null;
}

interface CaptureResult {
  dataUrl: string;
  width: number;
  height: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onCapture: (dataUrl: string) => void;
}

export default function ScreenshotOverlay({ open, onClose, onCapture }: Props) {
  const [sources, setSources] = useState<ScreenSource[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [preview, setPreview] = useState<CaptureResult | null>(null);
  const [loading, setLoading] = useState(false);

  // Crop state
  const [cropping, setCropping] = useState(false);
  const [cropStart, setCropStart] = useState({ x: 0, y: 0 });
  const [cropEnd, setCropEnd] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!open || !isDesktop) return;
    // Reset state on open
    setSources([]);
    setSelectedId(null);
    setPreview(null);
    setCropping(false);
    setCropStart({ x: 0, y: 0 });
    setCropEnd({ x: 0, y: 0 });
    setIsDragging(false);

    setLoading(true);
    window.yuaDesktop
      ?.screenshotGetSources?.()
      .then((srcs: ScreenSource[]) => {
        setSources(srcs ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [open]);

  const handleSelectSource = useCallback(async (sourceId: string) => {
    setSelectedId(sourceId);
    setLoading(true);
    const result = await window.yuaDesktop?.screenshotCapture?.(sourceId);
    if (result) {
      setPreview(result);
      setCropping(true);
    }
    setLoading(false);
  }, []);

  const handleCropMouseDown = useCallback((e: React.MouseEvent) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setCropStart({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setCropEnd({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setIsDragging(true);
  }, []);

  const handleCropMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      setCropEnd({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    },
    [isDragging],
  );

  const handleCropMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleConfirm = useCallback(() => {
    if (!preview) return;

    if (
      cropping &&
      Math.abs(cropEnd.x - cropStart.x) > 10 &&
      Math.abs(cropEnd.y - cropStart.y) > 10
    ) {
      // Crop the image
      const canvas = canvasRef.current;
      if (!canvas) return;
      const img = new Image();
      img.onload = () => {
        const scaleX =
          img.width / (imgRef.current?.clientWidth ?? img.width);
        const scaleY =
          img.height / (imgRef.current?.clientHeight ?? img.height);

        const x = Math.min(cropStart.x, cropEnd.x) * scaleX;
        const y = Math.min(cropStart.y, cropEnd.y) * scaleY;
        const w = Math.abs(cropEnd.x - cropStart.x) * scaleX;
        const h = Math.abs(cropEnd.y - cropStart.y) * scaleY;

        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, x, y, w, h, 0, 0, w, h);
        onCapture(canvas.toDataURL('image/png'));
        onClose();
      };
      img.src = preview.dataUrl;
    } else {
      // Full screenshot
      onCapture(preview.dataUrl);
      onClose();
    }
  }, [preview, cropping, cropStart, cropEnd, onCapture, onClose]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Enter' && preview) handleConfirm();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, preview, handleConfirm, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <canvas ref={canvasRef} className="hidden" />

      <div className="relative w-[90vw] max-w-4xl max-h-[85vh] rounded-2xl bg-white dark:bg-[#1e1e1e] shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-[var(--line)]">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            Screenshot Capture
          </h2>
          <div className="flex items-center gap-2">
            {preview && (
              <button
                onClick={handleConfirm}
                className="flex items-center gap-1.5 rounded-lg bg-blue-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-600 transition"
              >
                <Check size={14} />
                Attach
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-full p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 transition"
            >
              <X size={16} className="text-[var(--text-muted)]" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading && (
            <div className="flex items-center justify-center py-20">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!loading && !preview && (
            <div className="grid grid-cols-2 gap-4">
              {sources.map((source) => (
                <button
                  key={source.id}
                  onClick={() => handleSelectSource(source.id)}
                  className="group rounded-xl border-2 border-gray-200 dark:border-[var(--line)] overflow-hidden hover:border-blue-500 transition"
                >
                  <img
                    src={source.thumbnail}
                    alt={source.name}
                    className="w-full aspect-video object-cover"
                  />
                  <div className="flex items-center gap-2 px-3 py-2 text-xs text-[var(--text-secondary)] group-hover:text-blue-500">
                    <Monitor size={12} />
                    {source.name}
                  </div>
                </button>
              ))}
            </div>
          )}

          {!loading && preview && (
            <div className="relative select-none">
              <img
                ref={imgRef}
                src={preview.dataUrl}
                alt="Screenshot"
                className="w-full rounded-lg"
                onMouseDown={handleCropMouseDown}
                onMouseMove={handleCropMouseMove}
                onMouseUp={handleCropMouseUp}
                draggable={false}
              />
              {isDragging && (
                <div
                  className="absolute border-2 border-blue-500 bg-blue-500/10 pointer-events-none"
                  style={{
                    left: Math.min(cropStart.x, cropEnd.x),
                    top: Math.min(cropStart.y, cropEnd.y),
                    width: Math.abs(cropEnd.x - cropStart.x),
                    height: Math.abs(cropEnd.y - cropStart.y),
                  }}
                />
              )}
              <div className="mt-3 text-center text-xs text-[var(--text-muted)]">
                Drag to select region &middot; Enter: Confirm &middot; Esc:
                Cancel
              </div>
            </div>
          )}
        </div>

        {/* Footer hints */}
        <div className="px-5 py-2 border-t border-gray-100 dark:border-[var(--line)] text-[10px] text-[var(--text-muted)] flex gap-4">
          <span>Esc: Cancel</span>
          {preview && <span>Enter: Attach</span>}
          {preview && <span>Drag: Select region</span>}
        </div>
      </div>
    </div>
  );
}
