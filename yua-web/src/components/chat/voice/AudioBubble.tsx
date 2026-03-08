"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause, Volume2 } from "lucide-react";

type AudioBubbleProps = {
  url: string;
  duration?: number;
  fileName?: string;
};

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Generate deterministic pseudo-random bar heights from URL string */
function generateBars(seed: string, count: number): number[] {
  let hash = 0;
  for (const ch of seed) {
    hash = ((hash << 5) - hash + (ch.codePointAt(0) ?? 0)) | 0;
  }
  const bars: number[] = [];
  for (let i = 0; i < count; i++) {
    hash = ((hash * 1103515245 + 12345) & 0x7fffffff);
    const norm = (hash % 100) / 100;
    bars.push(0.3 + norm * 0.7); // 0.3 to 1.0 normalized
  }
  return bars;
}

const BAR_COUNT = 32;

export default function AudioBubble({ url, duration: serverDuration, fileName }: AudioBubbleProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(serverDuration ?? 0);
  const [error, setError] = useState(false);
  const rafRef = useRef<number>(0);
  const bars = generateBars(url, BAR_COUNT);

  useEffect(() => {
    const audio = new Audio(url);
    audio.preload = "metadata";
    audioRef.current = audio;

    audio.onloadedmetadata = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };
    audio.onended = () => {
      setPlaying(false);
      setCurrentTime(0);
    };
    audio.onerror = () => setError(true);

    return () => {
      audio.pause();
      audio.src = "";
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [url]);

  useEffect(() => {
    if (!playing) {
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = 0; }
      return;
    }
    const tick = () => {
      const audio = audioRef.current;
      if (audio) setCurrentTime(audio.currentTime);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [playing]);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || error) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play().catch(() => setError(true));
      setPlaying(true);
    }
  }, [playing, error]);

  const progress = duration > 0 ? currentTime / duration : 0;
  const activeBarIndex = Math.floor(progress * BAR_COUNT);

  if (error) {
    return (
      <div
        className="w-[200px] h-[200px] max-lg:w-[160px] max-lg:h-[160px] rounded-2xl border flex items-center justify-center text-[12px]"
        style={{ borderColor: "var(--line)", color: "var(--text-muted)", background: "var(--wash)" }}
      >
        재생할 수 없습니다
      </div>
    );
  }

  return (
    <div
      className="
        w-[200px] h-[200px]
        max-lg:w-[160px] max-lg:h-[160px]
        rounded-2xl border overflow-hidden
        flex flex-col items-center justify-between
        relative cursor-pointer select-none
        transition-shadow hover:shadow-md
      "
      style={{
        borderColor: playing
          ? "rgb(139 92 246 / 0.5)"
          : "var(--line)",
        background: playing
          ? "linear-gradient(135deg, rgb(139 92 246 / 0.08), rgb(124 58 237 / 0.15))"
          : "var(--wash)",
      }}
      onClick={toggle}
    >
      {/* Top: audio icon + label */}
      <div className="w-full px-3 pt-3 flex items-center gap-1.5">
        <Volume2
          size={13}
          className={playing ? "text-violet-500 dark:text-violet-400" : "text-[var(--text-muted)]"}
        />
        <span
          className="text-[11px] font-medium truncate"
          style={{ color: playing ? "rgb(139 92 246)" : "var(--text-muted)" }}
        >
          {fileName || "음성 메시지"}
        </span>
      </div>

      {/* Center: play button */}
      <div className="flex items-center justify-center flex-1">
        <div
          className={`
            h-14 w-14 max-lg:h-12 max-lg:w-12
            rounded-full flex items-center justify-center
            transition-all
            ${playing
              ? "bg-violet-600 text-white shadow-lg shadow-violet-500/30"
              : "bg-gray-900 dark:bg-white text-white dark:text-black hover:scale-105"
            }
          `}
        >
          {playing
            ? <Pause size={22} fill="white" />
            : <Play size={22} fill="currentColor" className="ml-1" />
          }
        </div>
      </div>

      {/* Bottom: waveform + duration */}
      <div className="w-full px-3 pb-3">
        {/* Waveform bars */}
        <div className="flex items-end justify-center gap-[1.5px] h-6 mb-1.5">
          {bars.map((h, i) => (
            <div
              key={i}
              className={`w-[2px] rounded-full transition-colors duration-150 ${
                i <= activeBarIndex
                  ? "bg-violet-500 dark:bg-violet-400"
                  : playing
                  ? "bg-violet-200 dark:bg-violet-700/60"
                  : "bg-gray-300 dark:bg-gray-600"
              }`}
              style={{ height: `${h * 20}px` }}
            />
          ))}
        </div>

        {/* Duration */}
        <div className="flex items-center justify-between">
          <span
            className="text-[11px] font-mono tabular-nums"
            style={{ color: playing ? "rgb(139 92 246)" : "var(--text-muted)" }}
          >
            {playing ? formatTime(currentTime) : "0:00"}
          </span>
          <span
            className="text-[11px] font-mono tabular-nums"
            style={{ color: "var(--text-muted)" }}
          >
            {formatTime(duration)}
          </span>
        </div>
      </div>
    </div>
  );
}
