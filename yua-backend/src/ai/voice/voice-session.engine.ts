import WebSocket from "ws";
import { OpenAIRealtimeClient } from "./openai-realtime.client";
import type {
  VoiceSessionRecord,
  VoiceWsClientMessage,
  VoiceWsServerMessage,
} from "./voice.types";
import { TTSService } from "./tts";
import { VoiceSessionRepo } from "./voice-session.repo";
import crypto from "crypto";
import type { VoiceState } from "./voice.types";
import axios from "axios";
import { EventSource } from "eventsource";

function requireApiKey() {
  if (!process.env.OPENAI_API_KEY)
    throw new Error("OPENAI_API_KEY_NOT_SET");
  return process.env.OPENAI_API_KEY!;
}

const PCM_FORMAT = {
  codec: "pcm16" as const,
  sampleRateHz: 24000 as const,
  channels: 1 as const,
};

const PCM_BYTES_PER_SEC =
  PCM_FORMAT.sampleRateHz * PCM_FORMAT.channels * 2;
const PCM_CHUNK_MS = 200;
const PCM_CHUNK_BYTES =
  Math.floor((PCM_BYTES_PER_SEC * PCM_CHUNK_MS) / 1000);

function splitPcm(buf: Buffer) {
  const chunks: Buffer[] = [];
  for (let i = 0; i < buf.length; i += PCM_CHUNK_BYTES) {
    chunks.push(buf.subarray(i, Math.min(i + PCM_CHUNK_BYTES, buf.length)));
  }
  return chunks;
}

export class VoiceSessionEngine {
  private tts = new TTSService();

  async handleConnection(args: {
    ws: WebSocket;
    session: VoiceSessionRecord;
    personaHint?: string;
  }) {
    const { ws, session } = args;

    const model =
      process.env.OPENAI_REALTIME_MODEL ?? "gpt-realtime-mini";

    const rt = new OpenAIRealtimeClient({
      apiKey: requireApiKey(),
      model,
    });

    let state: VoiceState = "IDLE";
    let assistantSpeaking = false;
    let transcript = "";
    let assistantText = "";
    let currentStream: EventSource | null = null;

    let audioSeq = 0;

    let ttsAbort = new AbortController();
    let ttsRunning = false;
    const ttsQueue: string[] = [];
    const MAX_TTS_QUEUE = 5;

    const send = (m: VoiceWsServerMessage) => {
      if (ws.readyState !== ws.OPEN) return;
      ws.send(JSON.stringify(m));
    };

    const setState = (s: VoiceState) => {
      state = s;
      send({ type: "state", state, at: Date.now() });
    };

    const waitUntilTtsDrained = async () => {
      while (ttsRunning || ttsQueue.length > 0) {
        await new Promise((r) => setTimeout(r, 20));
      }
    };

    const drainTtsQueue = async () => {
      if (ttsRunning) return;
      ttsRunning = true;

      try {
        while (ttsQueue.length > 0) {
          if (ttsAbort.signal.aborted) break;

          const text = ttsQueue.shift()!;
          const ttsRes = await this.tts.synthesize(text, {
            voice: process.env.OPENAI_TTS_VOICE ?? "alloy",
            responseFormat: "pcm",
            signal: ttsAbort.signal,
          });

          for (const pcmChunk of splitPcm(ttsRes.buffer)) {
            if (ttsAbort.signal.aborted) break;

            assistantSpeaking = true;

            send({
              type: "assistant.audio.delta",
              audioB64: pcmChunk.toString("base64"),
              at: Date.now(),
              seq: audioSeq++,
            } as any);
          }
        }
      } catch {
        // swallow
      } finally {
        ttsRunning = false;
      }
    };

    const enqueueTts = (text: string) => {
      const clean = text.trim();
      if (!clean) return;

      if (ttsQueue.length >= MAX_TTS_QUEUE) {
        ttsQueue.shift();
      }

      ttsQueue.push(clean);
      void drainTtsQueue();
    };

    const cancelAssistant = async () => {
      assistantSpeaking = false;

      rt.send({ type: "response.cancel" });

      if (currentStream) {
        currentStream.close();
        currentStream = null;
      }

      try {
        await axios.post(
          `${process.env.INTERNAL_API_BASE}/api/chat/stop`,
          { threadId: session.threadId },
          {
            headers: {
              Authorization: `Bearer ${process.env.INTERNAL_SERVICE_TOKEN}`,
            },
          }
        );
      } catch {}

      ttsAbort.abort();
      ttsAbort = new AbortController();
      ttsQueue.length = 0;
      ttsRunning = false;

      send({ type: "barge_in", at: Date.now() });
      setState("LISTENING");
    };

    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(
          raw.toString("utf8")
        ) as VoiceWsClientMessage;

        if (msg.type === "audio.append") {
          if (assistantSpeaking) cancelAssistant();

          setState("LISTENING");
          rt.send({
            type: "input_audio_buffer.append",
            audio: msg.audioB64,
          });
          return;
        }

        if (msg.type === "audio.commit") {
          setState("THINKING");
          rt.send({ type: "input_audio_buffer.commit" });
          return;
        }

        if (msg.type === "response.cancel") {
          cancelAssistant();
          return;
        }

        if (msg.type === "session.stop") {
          rt.close();
          ws.close();
        }
      } catch (e: any) {
        send({
          type: "error",
          code: "BAD_CLIENT_MESSAGE",
          message: String(e?.message ?? e),
        });
      }
    });

    rt.on("open", async () => {
      rt.send({
        type: "session.update",
        session: {
          instructions:
            (args.personaHint?.trim()
              ? `${args.personaHint.trim()}\n\n`
              : "") +
            "Korean-first. Bright, energetic idol vibe. Cute, confident. Short responses.",
          voice: process.env.OPENAI_REALTIME_VOICE ?? "alloy",
          turn_detection: { type: "server_vad" },
          input_audio_transcription: {
            model: "gpt-4o-mini-transcribe",
          },
          input_audio_format: "pcm16",
          output_audio_format: "pcm16",
          modalities: ["text"], // 🔥 Realtime audio OFF
        },
      });

      await VoiceSessionRepo.put(session);

      send({
        type: "session.ready",
        sessionId: session.sessionId,
        traceId: session.traceId,
        format: PCM_FORMAT,
      });

      setState("LISTENING");
    });

    rt.on("event", async (ev: any) => {
      const t = String(ev?.type ?? "");

      if (t === "input_audio_buffer.speech_started") {
        if (assistantSpeaking) await cancelAssistant();
        return;
      }

      if (t === "conversation.item.input_audio_transcription.delta") {
        const delta = String(ev?.delta ?? "");
        transcript += delta;
        send({ type: "transcript.delta", delta, at: Date.now() });
        return;
      }

      if (
        t ===
        "conversation.item.input_audio_transcription.completed"
      ) {
        transcript = String(
          ev?.transcript ?? transcript
        ).trim();

        send({
          type: "transcript.done",
          text: transcript,
          at: Date.now(),
        });

        setState("THINKING");

        const chatRes = await axios.post(
          `${process.env.INTERNAL_API_BASE}/api/chat`,
          {
            threadId: session.threadId,
            message: transcript,
            stream: true,
            thinkingProfile:
              session.requestedThinkingProfile ?? "FAST",
            meta: { modality: "voice" },
          },
          {
            headers: {
              Authorization:
                `Bearer ${process.env.INTERNAL_SERVICE_TOKEN}`,
            },
          }
        );

        const traceId = chatRes.data.traceId;

        currentStream = new EventSource(
          `${process.env.INTERNAL_API_BASE}/api/stream/${session.threadId}?traceId=${traceId}`,
          {
            fetch: (input, init) =>
              fetch(input, {
                ...init,
                headers: {
                  ...(init?.headers || {}),
                  Authorization:
                    `Bearer ${process.env.INTERNAL_SERVICE_TOKEN}`,
                },
              }),
          }
        );

        let ttsBuffer = "";

        currentStream.onmessage = async (event: any) => {
          const data = JSON.parse(event.data);

          if (data.event === "token") {
            const token = data.token ?? "";
            assistantText += token;
            ttsBuffer += token;

            send({
              type: "assistant.text.delta",
              delta: token,
              at: Date.now(),
            });

            const shouldFlush =
              ttsBuffer.length >= 100 ||
              /[.!?]\s*$/.test(ttsBuffer);

            if (shouldFlush) {
              enqueueTts(ttsBuffer);
              ttsBuffer = "";
            }
          }

          if (data.event === "done") {
            if (ttsBuffer.trim()) {
              enqueueTts(ttsBuffer);
              ttsBuffer = "";
            }

            await waitUntilTtsDrained();

            assistantSpeaking = false;
            setState("IDLE");

            send({
              type: "assistant.audio.done",
              at: Date.now(),
            });

            transcript = "";
            assistantText = "";
          }
        };
      }
    });

    rt.connect();
  }
}