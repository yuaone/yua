"use client";

import CodeBlock from "@/components/docs/CodeBlock";
import Link from "next/link";

export default function InstancesDocs() {
  return (
    <div className="px-10 py-10 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Instances</h1>

      <p className="text-black/70 leading-7 mb-8">
        YUA ONE runs on a managed compute instance (VM) that powers chat,
        file processing, memory, and the developer console.  
        The Instance API lets you check health, view logs, resize disk, and
        manage basic firewall rules from your own tools.
      </p>

      {/* 1. Overview */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">1. Overview</h2>
        <p className="text-black/60 leading-7">
          For the first version, YUA ONE exposes a single main instance
          (internally named <code className="px-1 py-0.5 bg-black/5 rounded">
            yua-main-vm
          </code>
          ).  
          You can observe and control this instance through the REST API or the
          built-in console UI.
        </p>
        <p className="text-black/60 leading-7 mt-3">
          All endpoints are served under:
        </p>
        <CodeBlock
          language="bash"
          code={`https://console.yuaone.com/api/instance/*`}
        />
      </section>

      {/* 2. Endpoints */}
      <section className="mb-14">
        <h2 className="text-2xl font-semibold mb-4">2. Core Endpoints</h2>

        <CodeBlock
          language="bash"
          code={`GET    /api/instance/health         # VM + metrics + docker
GET    /api/instance/disk-info      # Disk usage summary
GET    /api/instance/logs           # Recent instance logs
POST   /api/instance/resize-disk    # Request disk resize
POST   /api/instance/restart        # Restart instance

GET    /api/instance/firewall       # List firewall rules
POST   /api/instance/firewall/add   # Add firewall rule
POST   /api/instance/firewall/remove# Remove firewall rule

GET    /api/instance/snapshot       # Snapshot info (summary)
POST   /api/instance/snapshot/create
POST   /api/instance/snapshot/list
POST   /api/instance/snapshot/delete
POST   /api/instance/snapshot/restore`}
        />

        <p className="mt-4 text-black/60">
          All instance APIs require an authenticated backend environment and
          are designed for operator-level usage rather than public client-side
          calls.
        </p>
      </section>

      {/* 3. Health Check */}
      <section className="mb-14">
        <h2 className="text-2xl font-semibold mb-4">3. Health Check</h2>

        <p className="text-black/60 mb-3">
          Simple cURL check from your terminal:
        </p>

        <CodeBlock
          language="bash"
          code={`curl -s "https://console.yuaone.com/api/instance/health" \\
  -H "Authorization: Bearer $YUA_API_KEY" | jq`}
        />

        <p className="text-black/60 mt-4">
          Example response:
        </p>

        <CodeBlock
          language="json"
          code={`{
  "ok": true,
  "instance": {
    "instance_id": "yua-main-vm",
    "ip": "10.0.0.5",
    "uptime": 123456,
    "states": { "vm": true, "docker": true }
  },
  "metrics": {
    "ok": true,
    "cpu": 12.3,
    "ram": { "total": 32_000, "used": 10_500 },
    "network": { "rx": 1234567, "tx": 7654321 },
    "disk": { "total": 200_000, "used": 85_000 }
  },
  "docker": { "status": "running" }
}`}
        />
      </section>

      {/* 4. Node SDK Integration */}
      <section className="mb-14">
        <h2 className="text-2xl font-semibold mb-4">
          4. Using the Node.js SDK
        </h2>

        <p className="text-black/60 mb-3">
          If you are already using the{" "}
          <code className="px-1 py-0.5 bg-black/5 rounded">yua-one-node</code>{" "}
          SDK, you can access instances from the same client:
        </p>

        <CodeBlock
          language="bash"
          code={`npm install yua-one-node`}
        />

        <CodeBlock
          language="javascript"
          code={`import { YuaClient } from "yua-one-node";

const yua = new YuaClient({
  baseUrl: "https://console.yuaone.com/api",
  apiKey: process.env.YUA_API_KEY,
});

// 🔍 Health
const health = await yua.instance.health();
console.log(health.metrics);

// 📜 Logs
const logs = await yua.instance.logs(200);
console.log(logs.lines);

// 💾 Resize disk
await yua.instance.resizeDisk("yua-main-vm", 200, 300);`}
        />

        <p className="text-black/50 text-sm mt-3">
          The SDK simply wraps the same REST endpoints under{" "}
          <code>yua.instance.*</code> methods.
        </p>
      </section>

      {/* 5. Logs Streaming */}
      <section className="mb-16">
        <h2 className="text-2xl font-semibold mb-4">5. Logs Streaming</h2>

        <p className="text-black/60 mb-3">
          You can also consume logs as a stream for a live console
          experience:
        </p>

        <CodeBlock
          language="javascript"
          code={`for await (const line of yua.instance.logsStream("yua-main-vm")) {
  process.stdout.write(line + "\\n");
}`}
        />
      </section>

      {/* Footer navigation */}
      <section className="mt-10 mb-4">
        <p className="text-black/60">
          Next: read the{" "}
          <Link href="/docs/sdk/node" className="text-blue-600 underline">
            Node SDK guide
          </Link>{" "}
          or open the{" "}
          <Link href="/instance" className="text-blue-600 underline">
            Instance Console
          </Link>{" "}
          in the UI.
        </p>
      </section>
    </div>
  );
}
