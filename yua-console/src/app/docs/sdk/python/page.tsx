"use client";

import CodeBlock from "@/components/docs/CodeBlock";
import Link from "next/link";

export default function PythonSdkDocs() {
  return (
    <div className="px-10 py-10 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Python SDK</h1>

      <p className="text-black/70 leading-7 mb-8">
        The official Python SDK provides a clean and intuitive interface for
        accessing YUA ONE’s chat completion, streaming, and reasoning
        introspection features (Spine Timeline / Graph).
      </p>

      {/* 1. Installation */}
      <section className="mb-14">
        <h2 className="text-2xl font-semibold mb-4">1. Installation</h2>

        <CodeBlock language="bash" code={`pip install yua-one-python`} />

        <p className="mt-4 text-black/60">
          After installation, import the <code>YuaClient</code> class.
        </p>
      </section>

      {/* 2. Basic Setup */}
      <section className="mb-14">
        <h2 className="text-2xl font-semibold mb-4">2. Basic Setup</h2>

        <CodeBlock
          language="python"
          code={`from yua_one_python import YuaClient

yua = YuaClient(
    base_url="https://console.yuaone.com/api",
    api_key="YOUR_API_KEY"
)`}
        />

        <p className="mt-4 text-black/60">
          The client exposes <code>chat</code> utilities and additional helper
          functions consistent with the Node SDK.
        </p>
      </section>

      {/* 3. Chat — generate() */}
      <section className="mb-14">
        <h2 className="text-2xl font-semibold mb-4">
          3. Chat: <code>generate()</code>
        </h2>

        <p className="text-black/60 mb-3">
          <code>generate()</code> returns the final assistant message as a single
          response.
        </p>

        <CodeBlock
          language="python"
          code={`response = yua.chat.generate({
    "messages": [
        {"role": "user", "content": "Explain YUA ONE in 2 sentences."}
    ]
})

print(response.text)`}
        />
      </section>

      {/* 4. Chat — stream() */}
      <section className="mb-14">
        <h2 className="text-2xl font-semibold mb-4">
          4. Chat: <code>stream()</code>
        </h2>

        <p className="text-black/60 mb-3">
          <code>stream()</code> yields partial chunks as they are produced by the
          server.
        </p>

        <CodeBlock
          language="python"
          code={`for chunk in yua.chat.stream({
    "messages": [{"role": "user", "content": "Stream demo"}]
}):
    if chunk.get("type") == "heartbeat":
        continue
    print(chunk.get("text", ""), end="")`}
        />
      </section>

      {/* 5. Spine Timeline & Graph */}
      <section className="mb-14">
        <h2 className="text-2xl font-semibold mb-4">5. Spine Timeline & Graph</h2>

        <p className="text-black/60 mb-3">
          Use Python to introspect the model’s reasoning structure.  
          The SDK maps directly to the REST endpoints.
        </p>

        <CodeBlock
          language="python"
          code={`timeline = yua.chat.spine_timeline("thread_123", "msg_01")
print(timeline)

graph = yua.chat.spine_graph("thread_123")
print(graph["nodes"], graph["edges"])`}
        />

        <p className="text-black/60 mt-3">
          See the dedicated docs:{" "}
          <Link href="/docs/spine/timeline" className="text-blue-600 underline">
            Spine Timeline
          </Link>{" "}
          &nbsp;/&nbsp;
          <Link href="/docs/spine/graph" className="text-blue-600 underline">
            Spine Graph
          </Link>
        </p>
      </section>

      {/* 6. File Upload */}
      <section className="mb-14">
        <h2 className="text-2xl font-semibold mb-4">6. File Upload</h2>

        <p className="text-black/60 mb-3">Send files such as PDFs or images:</p>

        <CodeBlock
          language="python"
          code={`file_id = yua.chat.upload("./document.pdf")
print("Uploaded:", file_id)

response = yua.chat.generate({
    "messages": [
        {
            "role": "user",
            "content": "Summarize this file",
            "file_ids": [file_id]
        }
    ]
})

print(response.text)`}
        />
      </section>

      {/* 7. Error Handling */}
      <section className="mb-20">
        <h2 className="text-2xl font-semibold mb-4">7. Error Handling</h2>

        <CodeBlock
          language="python"
          code={`try:
    res = yua.chat.generate({
        "messages": [{"role": "user", "content": "Hello!"}]
    })
    print(res.text)
except Exception as e:
    print("YUA error:", e)`}
        />
      </section>

      {/* Footer */}
      <section className="mb-10">
        <p className="text-black/60">
          Return to{" "}
          <Link href="/docs/sdk/node" className="text-blue-600 underline">
            Node SDK
          </Link>{" "}
          or try the{" "}
          <Link href="/chat" className="text-blue-600 underline">
            Chat Playground
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
