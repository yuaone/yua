// NOTE: expo-av is required but not yet in package.json.
// Install with: pnpm --filter yua-mobile add expo-av

import { useCallback, useEffect, useRef, useState } from "react";
import { Audio } from "expo-av";

export interface UseVoiceInputReturn {
  isRecording: boolean;
  duration: number;
  waveformData: number[];
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<string | null>;
  cancelRecording: () => Promise<void>;
  permissionGranted: boolean;
  requestPermission: () => Promise<boolean>;
}

const WAVEFORM_SIZE = 40;
const WAVEFORM_POLL_MS = 100;
const DURATION_TICK_MS = 1000;

function normalizeMetering(db: number): number {
  // metering is typically -160 to 0 dB; map -60..0 to 0..1
  return Math.min(1, Math.max(0, (db + 60) / 60));
}

export function useVoiceInput(): UseVoiceInputReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [waveformData, setWaveformData] = useState<number[]>(
    () => new Array(WAVEFORM_SIZE).fill(0),
  );
  const [permissionGranted, setPermissionGranted] = useState(false);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const waveformTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Check permission on mount
  useEffect(() => {
    Audio.getPermissionsAsync()
      .then((res) => {
        setPermissionGranted(res.granted);
      })
      .catch(() => {
        // silently ignore
      });
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const res = await Audio.requestPermissionsAsync();
      setPermissionGranted(res.granted);
      return res.granted;
    } catch {
      return false;
    }
  }, []);

  const clearTimers = useCallback(() => {
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
    if (waveformTimerRef.current) {
      clearInterval(waveformTimerRef.current);
      waveformTimerRef.current = null;
    }
  }, []);

  const resetState = useCallback(() => {
    clearTimers();
    setIsRecording(false);
    setDuration(0);
    setWaveformData(new Array(WAVEFORM_SIZE).fill(0));
    recordingRef.current = null;
  }, [clearTimers]);

  const startRecording = useCallback(async () => {
    try {
      if (recordingRef.current) return;

      const granted = permissionGranted || (await requestPermission());
      if (!granted) return;

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        {
          ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
          isMeteringEnabled: true,
        },
      );

      recordingRef.current = recording;
      setIsRecording(true);
      setDuration(0);
      setWaveformData(new Array(WAVEFORM_SIZE).fill(0));

      // Duration timer
      durationTimerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, DURATION_TICK_MS);

      // Waveform polling
      waveformTimerRef.current = setInterval(async () => {
        try {
          if (!recordingRef.current) return;
          const status = await recordingRef.current.getStatusAsync();
          if (status.isRecording && status.metering != null) {
            const normalized = normalizeMetering(status.metering);
            setWaveformData((prev) => {
              const next = prev.slice(1);
              next.push(normalized);
              return next;
            });
          }
        } catch {
          // ignore polling errors
        }
      }, WAVEFORM_POLL_MS);
    } catch (err) {
      console.warn("[useVoiceInput] startRecording failed:", err);
      resetState();
    }
  }, [permissionGranted, requestPermission, resetState]);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    try {
      const rec = recordingRef.current;
      if (!rec) return null;

      clearTimers();
      await rec.stopAndUnloadAsync();

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      const uri = rec.getURI();
      recordingRef.current = null;
      setIsRecording(false);
      setDuration(0);
      setWaveformData(new Array(WAVEFORM_SIZE).fill(0));

      return uri ?? null;
    } catch (err) {
      console.warn("[useVoiceInput] stopRecording failed:", err);
      resetState();
      return null;
    }
  }, [clearTimers, resetState]);

  const cancelRecording = useCallback(async () => {
    try {
      const rec = recordingRef.current;
      if (!rec) return;

      clearTimers();
      await rec.stopAndUnloadAsync();

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });
    } catch (err) {
      console.warn("[useVoiceInput] cancelRecording failed:", err);
    } finally {
      resetState();
    }
  }, [clearTimers, resetState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimers();
      const rec = recordingRef.current;
      if (rec) {
        rec.stopAndUnloadAsync().catch(() => {});
        recordingRef.current = null;
      }
    };
  }, [clearTimers]);

  return {
    isRecording,
    duration,
    waveformData,
    startRecording,
    stopRecording,
    cancelRecording,
    permissionGranted,
    requestPermission,
  };
}
