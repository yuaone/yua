import { useState, useRef, useCallback, useEffect } from "react";

export type UseVoiceInputOptions = {
  authFetch: (url: string, init?: RequestInit) => Promise<Response>;
  onTranscribed: (text: string) => void;
  onError?: (error: string) => void;
};

export type UseVoiceInputReturn = {
  permissionState: "prompt" | "granted" | "denied";
  isRecording: boolean;
  isTranscribing: boolean;
  recordingDuration: number;
  audioLevel: number;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  cancelRecording: () => void;
};

const MAX_DURATION_SEC = 120;

function getPreferredMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "audio/webm";
  if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) return "audio/webm;codecs=opus";
  if (MediaRecorder.isTypeSupported("audio/webm")) return "audio/webm";
  if (MediaRecorder.isTypeSupported("audio/mp4")) return "audio/mp4";
  return "audio/webm";
}

function mimeToExt(mime: string): string {
  if (mime.includes("mp4")) return "mp4";
  return "webm";
}

export function useVoiceInput({
  authFetch,
  onTranscribed,
  onError,
}: UseVoiceInputOptions): UseVoiceInputReturn {
  const [permissionState, setPermissionState] = useState<"prompt" | "granted" | "denied">("prompt");
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rafRef = useRef<number>(0);
  const abortRef = useRef<AbortController | null>(null);
  const cancelledRef = useRef(false);
  const startTimeRef = useRef(0);

  // Check permission on mount
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.permissions) return;
    navigator.permissions
      .query({ name: "microphone" as PermissionName })
      .then((status) => {
        setPermissionState(status.state as "prompt" | "granted" | "denied");
        status.onchange = () => {
          setPermissionState(status.state as "prompt" | "granted" | "denied");
        };
      })
      .catch(() => {});
  }, []);

  // Audio level animation loop (throttled to ~15fps)
  const lastLevelUpdateRef = useRef(0);
  const updateAudioLevel = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;
    const now = performance.now();
    if (now - lastLevelUpdateRef.current > 66) {
      const data = new Uint8Array(analyser.fftSize);
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / data.length);
      setAudioLevel(Math.min(1, rms * 3));
      lastLevelUpdateRef.current = now;
    }
    rafRef.current = requestAnimationFrame(updateAudioLevel);
  }, []);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
    chunksRef.current = [];
    setAudioLevel(0);
    setRecordingDuration(0);
  }, []);

  const sendForTranscription = useCallback(
    async (blob: Blob, mimeType: string) => {
      setIsTranscribing(true);
      const ac = new AbortController();
      abortRef.current = ac;
      try {
        const ext = mimeToExt(mimeType);
        const formData = new FormData();
        formData.append("audio", blob, `recording.${ext}`);

        const res = await authFetch("/api/voice/transcribe", {
          method: "POST",
          body: formData,
          signal: ac.signal,
        });

        if (!res.ok) throw new Error("transcription_failed");
        const data = await res.json();
        if (data.ok && data.text) {
          onTranscribed(data.text);
        } else {
          onError?.(data.error || "transcription_failed");
        }
      } catch (e: any) {
        if (e.name !== "AbortError") {
          onError?.(e.message || "transcription_failed");
        }
      } finally {
        setIsTranscribing(false);
        abortRef.current = null;
      }
    },
    [authFetch, onTranscribed, onError]
  );

  const startRecording = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices) {
      onError?.("microphone_not_supported");
      return;
    }

    cancelledRef.current = false;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setPermissionState("granted");

      const ctx = new AudioContext();
      if (ctx.state === "suspended") await ctx.resume();
      audioContextRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const mimeType = getPreferredMimeType();
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const cancelled = cancelledRef.current;
        const chunks = [...chunksRef.current];
        cleanup();
        setIsRecording(false);

        if (!cancelled && chunks.length > 0) {
          const blob = new Blob(chunks, { type: mimeType });
          sendForTranscription(blob, mimeType);
        }
      };

      recorder.start(250);
      setIsRecording(true);
      startTimeRef.current = Date.now();

      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setRecordingDuration(elapsed);
        if (elapsed >= MAX_DURATION_SEC) {
          mediaRecorderRef.current?.stop();
        }
      }, 100);

      rafRef.current = requestAnimationFrame(updateAudioLevel);
    } catch (e: any) {
      cleanup();
      if (e.name === "NotAllowedError" || e.name === "PermissionDeniedError") {
        setPermissionState("denied");
        onError?.("microphone_permission_denied");
      } else {
        onError?.(e.message || "microphone_error");
      }
    }
  }, [cleanup, updateAudioLevel, sendForTranscription, onError]);

  const stopRecording = useCallback(() => {
    cancelledRef.current = false;
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const cancelRecording = useCallback(() => {
    cancelledRef.current = true;
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    } else {
      cleanup();
      setIsRecording(false);
    }
  }, [cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      cleanup();
      abortRef.current?.abort();
    };
  }, [cleanup]);

  return {
    permissionState,
    isRecording,
    isTranscribing,
    recordingDuration,
    audioLevel,
    startRecording,
    stopRecording,
    cancelRecording,
  };
}
