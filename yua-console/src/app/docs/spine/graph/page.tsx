"use client";

import CodeBlock from "@/components/docs/CodeBlock";
import Link from "next/link";

export default function SpineGraphDocs() {
  return (
    <div className="px-10 py-10 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Spine Graph API</h1>

      <p className="text-black/70 leading-7 mb-8">
        The Spine Graph API visualizes how messages propagate through
        YUA ONE’s internal architecture — semantic units, routing edges,
        fusion paths, and reasoning nodes.  
        This is one of the most powerful tools for debugging and inspecting
        internal AI reasoning.
      </p>

      {/* 1. Endpoint */}
      <section className="mb-14">
        <h2 className="text-2xl font-semibold mb-4">1. Endpoint</h2>

        <CodeBlock
          language="bash"
          code={`GET https://console.yuaone.com/api/chat/spine/graph?threadId=THR123`}
        />

        <p className="mt-4 text-black/60">
          Returns a directed graph of nodes & edges representing the
          full reasoning path for the given thread.
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
  "nodes": [
    {
      "id": "n1",
      "type": "message",
      "label": "User Input",
      "timestamp": 1733818290001,
      "threadId": "thr_01",
      "messageId": "msg_01"
    },
    {
      "id": "n2",
      "type": "router",
      "label": "Spine Router",
      "timestamp": 1733818290100
    }
  ],
  "edges": [
    { "from": "n1", "to": "n2" }
  ]
}`}
        />

        <p className="mt-4 text-black/60">
          Nodes represent reasoning events; edges describe causal flow.
        </p>
      </section>

      {/* 3. Visualizing in the Console */}
      <section className="mb-14">
        <h2 className="text-2xl font-semibold mb-4">
          3. Visualizing in YUA Console
        </h2>

        <p className="text-black/60 mb-3">
          The console includes an interactive viewer with:
        </p>

        <ul className="list-disc ml-6 text-black/60 leading-7">
          <li>Node interaction & metadata popover</li>
          <li>Timeline sync</li>
          <li>DAG explorer</li>
          <li>Engine-hop tracing (Spine → Omega → HPE)</li>
        </ul>
      </section>

      {/* 4. SDK Example */}
      <section className="mb-14">
        <h2 className="text-2xl font-semibold mb-4">4. Node SDK Example</h2>

        <CodeBlock
          language="javascript"
          code={`const graph = await yua.chat.spineGraph("thr_01");

console.log(graph.nodes, graph.edges);`}
        />
      </section>

      {/* 5. Navigation */}
      <section className="mt-16">
        <p className="text-black/60">
          Next: Go to{" "}
          <Link href="/docs/sdk/node" className="text-blue-600 underline">
            Node SDK Documentation
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
