"use client";

import Link from "next/link";
import CodeBlock from "@/components/docs/CodeBlock";

export default function ChatDocs() {
  return (
    <div className="px-10 py-10 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Chat API</h1>

      <p className="text-black/70 leading-7 mb-8">
        The YUA ONE Chat API provides blazing-fast text generation with
        full streaming support. This document covers <strong>generate()</strong>,
        <strong>stream()</strong>, system prompts, message arrays, and file uploads.
      </p>

      {/* ----------------------------------------- */}
      {/* 1. Endpoint */}
      {/* ----------------------------------------- */}
      <section className="mb-16">
        <h2 className="text-2xl font-semibold mb-4">1. Endpoint</h2>

        <CodeBlock
          language="bash"
          code={`POST https://console.yuaone.com/api/chat/stream`}
        />

        <p className="mt-4 text-black/60">
          All chat requests use a single unified streaming endpoint.
        </p>
      </section>

      {/* ----------------------------------------- */}
      {/* 2. Request Format */}
      {/* ----------------------------------------- */}
      <section className="mb-16">
        <h2 className="text-2xl font-semibold mb-4">2. Request Format</h2>

        <CodeBlock
          language="json"
          code={`{
  "model": "yua-one",
  "messages": [
    { "role": "user", "content": "Hello YUA!" }
  ],
  "temperature": 0.7,
  "stream": true
}`}
        />

        <p className="mt-4 text-black/60">
          • <strong>messages</strong> follow a standard role-based format  
          • <strong>system</strong> can be added for system-level behavior  
          • <strong>stream</strong> must be true for streamed responses  
        </p>
      </section>

      {/* ----------------------------------------- */}
      {/* 3. Node.js SDK */}
      {/* ----------------------------------------- */}
      <section className="mb-16">
        <h2 className="text-2xl font-semibold mb-4">3. Node.js SDK</h2>

        <p className="text-black/60 mb-3">Install the SDK:</p>
        <CodeBlock language="bash" code={`npm install yua-one-node`} />

        <p className="text-black/60 mt-6 mb-3">Generate text (non-streaming):</p>

        <CodeBlock
          language="javascript"
          code={`import { YuaClient } from "yua-one-node";

const yua = new YuaClient({
  baseUrl: "https://console.yuaone.com/api",
  apiKey: process.env.YUA_API_KEY,
});

// 🔥 Full text completion
const res = await yua.chat.generate({
  messages: [{ role: "user", content: "Hello!" }]
});

console.log(res.text);`}
        />

        <p className="text-black/60 mt-6 mb-3">Streaming example:</p>

        <CodeBlock
          language="javascript"
          code={`for await (const chunk of yua.chat.stream({
  messages: [{ role: "user", content: "Stream demo" }]
})) {
  process.stdout.write(chunk.text ?? "");
}`}
        />

        <p className="text-black/50 text-sm mt-3">
          → Detailed Node SDK documentation:{" "}
          <Link href="/docs/sdk/node" className="text-blue-600 underline">
            /docs/sdk/node
          </Link>
        </p>
      </section>

      {/* ----------------------------------------- */}
      {/* 4. Python SDK */}
      {/* ----------------------------------------- */}
      <section className="mb-16">
        <h2 className="text-2xl font-semibold mb-4">4. Python SDK</h2>

        <p className="text-black/60 mb-3">Install:</p>
        <CodeBlock language="bash" code={`pip install yua-one-python`} />

        <p className="text-black/60 mt-6 mb-3">Generate text:</p>

        <CodeBlock
          language="python"
          code={`from yua_one_python import YuaClient

yua = YuaClient(
    base_url="https://console.yuaone.com/api",
    api_key="YOUR_KEY"
)

res = yua.chat.generate({
    "messages": [{"role": "user", "content": "Hello from Python!"}]
})

print(res.text)`}
        />

        <p className="text-black/50 text-sm mt-3">
          → Python SDK docs:{" "}
          <Link href="/docs/sdk/python" className="text-blue-600 underline">
            /docs/sdk/python
          </Link>
        </p>
      </section>

      {/* ----------------------------------------- */}
      {/* 5. cURL */}
      {/* ----------------------------------------- */}
      <section className="mb-16">
        <h2 className="text-2xl font-semibold mb-4">5. cURL</h2>

        <CodeBlock
          language="bash"
          code={`curl -X POST "https://console.yuaone.com/api/chat/stream" \\
  -H "Authorization: Bearer $YUA_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "messages": [{ "role": "user", "content": "Hello!" }]
  }'`}
        />
      </section>

      {/* ----------------------------------------- */}
      {/* 6. File Upload */}
      {/* ----------------------------------------- */}
      <section className="mb-16">
        <h2 className="text-2xl font-semibold mb-4">6. File Upload</h2>

        <p className="text-black/60 mb-3">
          You can send files (PDF, image, etc.) through the{" "}
          <strong>/api/chat/upload</strong> endpoint.
        </p>

        <CodeBlock
          language="bash"
          code={`curl -X POST "https://console.yuaone.com/api/chat/upload" \\
  -H "Authorization: Bearer $YUA_API_KEY" \\
  -F "file=@document.pdf"`}
        />

        <p className="text-black/60 mt-4">
          The returned file ID can be referenced in chat messages:
        </p>

        <CodeBlock
          language="json"
          code={`{
  "messages": [
    {
      "role": "user",
      "content": "Summarize this file",
      "file_ids": ["file_12345"]
    }
  ]
}`}
        />
      </section>

      {/* ----------------------------------------- */}
      {/* 7. Using system prompts */}
      {/* ----------------------------------------- */}
      <section className="mb-20">
        <h2 className="text-2xl font-semibold mb-4">7. System Prompt</h2>

        <CodeBlock
          language="javascript"
          code={`await yua.chat.generate({
  system: "You are YUA, a helpful assistant.",
  messages: [{ role: "user", content: "Introduce yourself" }]
});`}
        />
      </section>

      {/* ----------------------------------------- */}
      {/* END */}
      {/* ----------------------------------------- */}
      <section className="mb-10">
        <p className="text-black/60">
          Next: Explore the{" "}
          <Link href="/docs/spine/timeline" className="text-blue-600 underline">
            Spine Timeline API
          </Link>{" "}
          or try the{" "}
          <Link href="/chat" className="text-blue-600 underline">
            Chat Playground
          </Link>.
        </p>
      </section>
    </div>
  );
}
