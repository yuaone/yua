"use client";

import CodeBlock from "@/components/docs/CodeBlock";
import Link from "next/link";

export default function SpineTimelineDocs() {
  return (
    <div className="px-10 py-10 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Spine Timeline API</h1>

      <p className="text-black/70 leading-7 mb-8">
        The Spine Timeline API lets you inspect how YUA ONE processes and
        transforms a message internally. Each stage represents a checkpoint
        in the reasoning pipeline — model selection, semantic parsing,
        alignment, routing, fusion, and final synthesis.
      </p>

      {/* 1. Endpoint */}
      <section className="mb-14">
        <h2 className="text-2xl font-semibold mb-4">1. Endpoint</h2>

        <CodeBlock
          language="bash"
          code={`GET https://console.yuaone.com/api/chat/spine/timeline?threadId=THR123&messageId=MSG456`}
        />

        <p className="mt-4 text-black/60">
          Returns the full reasoning timeline for a specific message.
        </p>
      </section>

      {/* 2. Example Response */}
      <section className="mb-14">
        <h2 className="text-2xl font-semibold mb-4">2. Example Response</h2>

        <CodeBlock
          language="json"
          code={`{
  "ok": true,
  "threadId": "thr_01",
  "messageId": "msg_01",
  "timeline": [
    {
      "stage": "model_selection",
      "timestamp": 1733818290012,
      "output": { "model": "yua-one" }
    },
    {
      "stage": "semantic_parse",
      "timestamp": 1733818290040,
      "output": { "intent": "ask.question" }
    },
    {
      "stage": "router",
      "timestamp": 1733818290061,
      "output": { "target": "HPE-7.0" }
    },
    {
      "stage": "fusion",
      "timestamp": 1733818290102,
      "output": { "result": "complete text..." }
    }
  ]
}`}
        />

        <p className="mt-4 text-black/60">
          Each stage includes a timestamp and the engine output at that
          checkpoint.
        </p>
      </section>

      {/* 3. Using with Node SDK */}
      <section className="mb-16">
        <h2 className="text-2xl font-semibold mb-4">3. Using with Node SDK</h2>

        <CodeBlock
          language="javascript"
          code={`import { YuaClient } from "yua-one-node";

const yua = new YuaClient({ baseUrl: "https://console.yuaone.com/api" });

const timeline = await yua.chat.spineTimeline("thr_01", "msg_01");

console.log(timeline.timeline);`}
        />
      </section>

      {/* 4. Navigation */}
      <section className="mt-16">
        <p className="text-black/60">
          Next: View the{" "}
          <Link href="/docs/spine/graph" className="text-blue-600 underline">
            Spine Graph API
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
