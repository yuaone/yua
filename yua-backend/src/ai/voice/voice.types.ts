export type VoicePcmFormat = {
  codec: "pcm16";
  sampleRateHz: 24000; // Realtime output에서 24kHz PCM이 흔함
  channels: 1;
};

export type VoiceState =
  | "LISTENING"
  | "THINKING"
  | "SPEAKING"
  | "IDLE";

export type VoiceWsClientMessage =
  | {
      type: "session.start";
      threadId: number;
      // optional: UI에서 원하는 캐릭터/말투 힌트
      personaHint?: string;
    }
  | {
      type: "audio.append";
      // base64(PCM16 mono)
      audioB64: string;
      seq?: number;
    }
  | {
      type: "audio.commit"; // push-to-talk 끝
    }
  | {
      type: "response.cancel"; // 사용자가 끼어들기/취소 누름
      reason?: string;
    }
  | {
      type: "session.stop";
      reason?: string;
    };

export type VoiceWsServerMessage =
  | { type: "session.ready"; sessionId: string; traceId: string; format: VoicePcmFormat }
  | { type: "state"; state: VoiceState; at: number }
  | { type: "barge_in"; at: number } // user speech started while speaking
  | { type: "error"; code: string; message: string }
  // transcript
  | { type: "transcript.delta"; delta: string; at: number }
  | { type: "transcript.done"; text: string; at: number }
  // assistant text (optional: UI에 자막)
  | { type: "assistant.text.delta"; delta: string; at: number }
  | { type: "assistant.text.done"; text: string; at: number }
  // realtime audio stream (pcm16 base64)
  | { type: "assistant.audio.delta"; audioB64: string; at: number }
  | { type: "assistant.audio.done"; at: number }
  // mp3 card
  | { type: "assistant.audio.url"; url: string; mimeType: string; at: number };

export type VoiceSessionRecord = {
  sessionId: string;
  traceId: string;
  threadId: number;
  workspaceId: string;
  userId: number;
  createdAt: number;
  status: "ACTIVE" | "CLOSED";
  requestedThinkingProfile?: "FAST" | "NORMAL" | "DEEP";
};