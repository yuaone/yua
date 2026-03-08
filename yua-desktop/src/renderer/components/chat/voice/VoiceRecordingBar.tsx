import { X, Check, Loader2 } from "lucide-react";

type Props = {
  isRecording: boolean;
  isTranscribing: boolean;
  recordingDuration: number;
  audioLevel: number;
  onStopRecording: () => void;
  onCancelRecording: () => void;
};

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const DOT_COUNT = 40;

export default function VoiceRecordingBar({
  isRecording,
  isTranscribing,
  recordingDuration,
  audioLevel,
  onStopRecording,
  onCancelRecording,
}: Props) {
  if (isTranscribing) {
    return (
      <div className="flex items-center justify-center gap-2 w-full px-4 py-5 min-h-[72px] max-lg:min-h-[60px]">
        <Loader2 size={18} className="animate-spin text-gray-400 dark:text-gray-500" />
        <span className="text-[13px]" style={{ color: "var(--text-muted)" }}>
          변환 중...
        </span>
      </div>
    );
  }

  if (!isRecording) return null;

  // Wave scale based on audio level
  const waveScale = 1 + audioLevel * 2.5;

  return (
    <div className="flex items-center gap-3 w-full px-4 py-5 min-h-[72px] max-lg:min-h-[60px] max-lg:py-4">
      {/* Duration */}
      <span
        className="text-[13px] font-mono tabular-nums min-w-[40px] text-gray-500 dark:text-gray-400 select-none shrink-0"
        role="timer"
        aria-live="polite"
      >
        {formatDuration(recordingDuration)}
      </span>

      {/* Waveform dots */}
      <div
        className="flex-1 flex items-center justify-center gap-[3px] overflow-hidden px-2"
        aria-hidden="true"
      >
        {Array.from({ length: DOT_COUNT }, (_, i) => {
          const center = DOT_COUNT / 2;
          const dist = Math.abs(i - center) / center;
          const centerWeight = 1 - dist * 0.6;

          return (
            <span
              key={i}
              className="w-[3px] rounded-full bg-gray-400 dark:bg-gray-500"
              style={{
                height: 3,
                animation: "voice-dot-wave 1.2s ease-in-out infinite",
                animationDelay: `${i * 30}ms`,
                // @ts-expect-error CSS custom property
                "--wave-scale": waveScale * centerWeight,
                willChange: "transform, opacity",
              }}
            />
          );
        })}
      </div>

      {/* Cancel (X) */}
      <button
        type="button"
        onClick={onCancelRecording}
        className="
          h-8 w-8 shrink-0
          rounded-full flex items-center justify-center
          text-gray-500 dark:text-gray-400
          hover:bg-gray-100 dark:hover:bg-white/10
          transition-colors
        "
        aria-label="녹음 취소"
      >
        <X size={18} />
      </button>

      {/* Confirm (Check) */}
      <button
        type="button"
        onClick={onStopRecording}
        className="
          h-9 w-9 max-lg:h-10 max-lg:w-10 shrink-0
          rounded-full flex items-center justify-center
          bg-gray-900 text-white
          dark:bg-white dark:text-black
          hover:opacity-80
          transition-opacity
        "
        aria-label="녹음 완료"
      >
        <Check size={18} />
      </button>
    </div>
  );
}
