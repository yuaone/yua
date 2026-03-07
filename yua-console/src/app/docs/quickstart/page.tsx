"use client";

import Link from "next/link";
import CodeBlock from "@/components/docs/CodeBlock";

export default function Quickstart() {
  return (
    <div className="px-10 py-10 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Quickstart</h1>

      <p className="text-black/70 leading-7 mb-10">
        Welcome to <strong>YUA ONE</strong>.  
        This guide helps you start building in under 60 seconds — using Node.js,
        Python, or raw HTTP with cURL.
      </p>

      {/* ----------------------------------------- */}
      {/* 1. Setup */}
      {/* ----------------------------------------- */}
      <section className="mb-16">
        <h2 className="text-2xl font-semibold mb-4">1. Setup</h2>

        <p className="text-black/60 mb-4">
          First, create an API Key from the{" "}
          <Link href="/keys" className="text-blue-600 underline">
            API Keys page
          </Link>.
        </p>

        <CodeBlock
          language="bash"
          code={`export YUA_API_KEY="your_api_key_here"`}
        />
      </section>

      {/* ----------------------------------------- */}
      {/* 2. Node.js */}
      {/* ----------------------------------------- */}
      <section className="mb-16">
        <h2 className="text-2xl font-semibold mb-4">2. Node.js</h2>

        <p className="text-black/60 mb-3">Install the official SDK:</p>

        <CodeBlock language="bash" code={`npm install yua-one-node`} />

        <p className="text-black/60 mt-6 mb-3">Basic example:</p>

        <CodeBlock
          language="javascript"
          code={`import { YuaClient } from "yua-one-node";

const yua = new YuaClient({
  baseUrl: "https://console.yuaone.com/api",
  apiKey: process.env.YUA_API_KEY,
});

const res = await yua.chat.generate({
  messages: [{ role: "user", content: "Hello YUA!" }]
});

console.log(res.text);`}
        />

        <p className="text-black/50 text-sm mt-3">
          → Full Node SDK docs:{" "}
          <Link href="/docs/sdk/node" className="text-blue-600 underline">
            /docs/sdk/node
          </Link>
        </p>
      </section>

      {/* ----------------------------------------- */}
      {/* 3. Python */}
      {/* ----------------------------------------- */}
      <section className="mb-16">
        <h2 className="text-2xl font-semibold mb-4">3. Python</h2>

        <p className="text-black/60 mb-3">Install the official SDK:</p>

        <CodeBlock language="bash" code={`pip install yua-one-python`} />

        <p className="text-black/60 mt-6 mb-3">Basic example:</p>

        <CodeBlock
          language="python"
          code={`from yua_one_python import YuaClient

yua = YuaClient(
    base_url="https://console.yuaone.com/api",
    api_key="YOUR_KEY"
)

result = yua.chat.generate({
    "messages": [{"role": "user", "content": "Hello from Python!"}]
})

print(result.text)`}
        />

        <p className="text-black/50 text-sm mt-3">
          → Full Python SDK docs:{" "}
          <Link href="/docs/sdk/python" className="text-blue-600 underline">
            /docs/sdk/python
          </Link>
        </p>
      </section>

      {/* ----------------------------------------- */}
      {/* 4. cURL */}
      {/* ----------------------------------------- */}
      <section className="mb-16">
        <h2 className="text-2xl font-semibold mb-4">4. cURL</h2>

        <p className="text-black/60 mb-3">Quick request:</p>

        <CodeBlock
          language="bash"
          code={`curl -X POST "https://console.yuaone.com/api/chat/stream" \\
  -H "Authorization: Bearer $YUA_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "messages": [
      {"role": "user", "content": "Hello from cURL!"}
    ]
  }'`}
        />
      </section>

      {/* ----------------------------------------- */}
      {/* 5. Spine Engine */}
      {/* ----------------------------------------- */}
      <section className="mb-20">
        <h2 className="text-2xl font-semibold mb-4">5. Spine Engine</h2>

        <p className="text-black/60 mb-3">
          Access YUA ONE's internal reasoning using the{" "}
          <strong>Spine Timeline</strong> and <strong>Spine Graph</strong>.
        </p>

        <ul className="list-disc pl-6 text-black/70 leading-7">
          <li>
            Timeline →{" "}
            <Link href="/docs/spine/timeline" className="text-blue-600 underline">
              /docs/spine/timeline
            </Link>
          </li>
          <li>
            Graph →{" "}
            <Link href="/docs/spine/graph" className="text-blue-600 underline">
              /docs/spine/graph
            </Link>
          </li>
        </ul>
      </section>

      {/* END */}
      <section className="mb-10">
        <p className="text-black/60">
          You're ready to build with YUA ONE.  
          Try the{" "}
          <Link href="/chat" className="text-blue-600 underline">
            Chat Playground
          </Link>{" "}
          next.
        </p>
      </section>
    </div>
  );
}
