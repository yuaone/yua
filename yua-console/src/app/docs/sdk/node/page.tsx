"use client";

import CodeBlock from "@/components/docs/CodeBlock";
import Link from "next/link";

export default function NodeSdkDocs() {
  return (
    <div className="px-10 py-10 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Node.js SDK</h1>

      <p className="text-black/70 leading-7 mb-8">
        The official Node.js SDK provides a fast, type-safe wrapper around the
        YUA ONE API — including chat generation, streaming, and Spine
        introspection.
      </p>

      {/* 1. Install */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">1. Installation</h2>

        <CodeBlock language="bash" code={`npm install yua-one-node`} />
      </section>

      {/* 2. Setup */}
      <section className="mb-14">
        <h2 className="text-2xl font-semibold mb-4">2. Client Setup</h2>

        <CodeBlock
          language="javascript"
          code={`import { YuaClient } from "yua-one-node";

const yua = new YuaClient({
  baseUrl: "https://console.yuaone.com/api",
  apiKey: process.env.YUA_API_KEY,
});`}
        />

        <p className="text-black/60 mt-4">
          The client exposes <code>chat</code> and <code>instance</code> helpers.
        </p>

        <CodeBlock
          language="javascript"
          code={`yua.chat.generate(...);
yua.chat.stream(...);
yua.chat.spineTimeline(...);
yua.chat.spineGraph(...);

yua.instance.health();
yua.instance.logs();`}
        />
      </section>

      {/* 3. generate */}
      <section className="mb-14">
        <h2 className="text-2xl font-semibold mb-4">3. Chat: generate()</h2>

        <CodeBlock
          language="javascript"
          code={`const res = await yua.chat.generate({
  messages: [{ role: "user", content: "Explain YUA ONE." }],
  temperature: 0.7
});

console.log(res.text);`}
        />
      </section>

      {/* 4. stream */}
      <section className="mb-14">
        <h2 className="text-2xl font-semibold mb-4">4. Chat: stream()</h2>

        <CodeBlock
          language="javascript"
          code={`for await (const chunk of yua.chat.stream({
  messages: [{ role: "user", content: "Stream demo" }],
})) {
  if (chunk.type === "heartbeat") continue;
  process.stdout.write(chunk.text ?? "");
}`}
        />
      </section>

      {/* 5. Spine */}
      <section className="mb-14">
        <h2 className="text-2xl font-semibold mb-4">5. Spine Timeline & Graph</h2>

        <CodeBlock
          language="javascript"
          code={`const timeline = await yua.chat.spineTimeline("thr_01", "msg_01");
console.log(timeline.timeline);

const graph = await yua.chat.spineGraph("thr_01");
console.log(graph.nodes, graph.edges);`}
        />

        <p className="text-black/60 mt-3">
          Docs:{" "}
          <Link href="/docs/spine/timeline" className="text-blue-600 underline">
            Timeline
          </Link>{" "}
          ·{" "}
          <Link href="/docs/spine/graph" className="text-blue-600 underline">
            Graph
          </Link>
        </p>
      </section>

      {/* 6. Instances */}
      <section className="mb-14">
        <h2 className="text-2xl font-semibold mb-4">6. Instances</h2>

        <CodeBlock
          language="javascript"
          code={`const health = await yua.instance.health();
console.log(health.metrics);

const logs = await yua.instance.logs(100);
console.log(logs.lines.join("\\n"));`}
        />
      </section>

      {/* 7. Errors */}
      <section className="mb-20">
        <h2 className="text-2xl font-semibold mb-4">7. Error Handling</h2>

        <CodeBlock
          language="javascript"
          code={`try {
  const res = await yua.chat.generate({
    messages: [{ role: "user", content: "Hello" }],
  });
} catch (err) {
  console.error("YUA error:", err);
}`}
        />
      </section>

      <section className="mb-6">
        <p className="text-black/60">
          Next:{" "}
          <Link href="/docs/sdk/python" className="text-blue-600 underline">
            Python SDK
          </Link>
        </p>
      </section>
    </div>
  );
}
