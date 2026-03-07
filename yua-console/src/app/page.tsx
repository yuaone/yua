"use client";

export default function Home() {
  return (
    <div className="w-full max-w-5xl mx-auto py-24 px-8">

      {/* ------------------------------ */}
      {/* HERO SECTION */}
      {/* ------------------------------ */}
      <div className="flex flex-col items-center gap-4 mb-24">
        <h1 className="text-5xl font-semibold tracking-tight text-black text-center">
          Build Beyond Models.
        </h1>

        <p className="text-black/60 text-[17px] max-w-2xl text-center leading-7">
          YUA ONE is the next-generation developer platform for AGI.
          <br />
          Multi-Engine Architecture · QGML · Console · Instance · SSH · Realtime Logs
        </p>

        <div className="flex gap-4 mt-8 flex-wrap justify-center">
          <a
            href="/console"
            className="px-6 py-2 rounded-xl bg-black text-white text-sm hover:bg-black/80 transition"
          >
            Launch Console
          </a>

          <a
            href="/models"
            className="px-6 py-2 rounded-xl border border-black/20 bg-white/70 backdrop-blur-xl text-sm hover:bg-white/90 transition"
          >
            Explore Models
          </a>

          <a
            href="/docs"
            className="px-6 py-2 rounded-xl border border-black/10 text-sm hover:bg-black/5 transition"
          >
            Read Docs
          </a>
        </div>
      </div>

      {/* ------------------------------ */}
      {/* WHAT IS YUA ONE */}
      {/* ------------------------------ */}
      <section className="w-full max-w-5xl mb-24">
        <h2 className="text-2xl font-semibold mb-6 text-black">What is YUA ONE?</h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            {
              title: "AGI-Ready Engine Stack",
              desc: "QGML · HPE · Omega-Lite · Gen5.9-Lite · Quantum",
            },
            {
              title: "Developer Console",
              desc: "Dual Shell · File Explorer · YUA Shell",
            },
            {
              title: "Instance Management",
              desc: "VM Health · Logs · Firewall · Snapshots",
            },
          ].map((item, idx) => (
            <div
              key={idx}
              className="rounded-2xl p-6 border border-black/10 bg-white/70
                         backdrop-blur-xl shadow-[0_4px_20px_rgba(0,0,0,0.03)]
                         flex flex-col gap-2"
            >
              <h3 className="font-semibold text-lg text-black">{item.title}</h3>
              <p className="text-sm text-black/60">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------ */}
      {/* ENGINE ARCHITECTURE */}
      {/* ------------------------------ */}
      <section className="w-full max-w-5xl mb-24">
        <h2 className="text-2xl font-semibold mb-6 text-black">
          Multi-Engine Architecture
        </h2>

        <div className="rounded-2xl p-6 border border-black/10 bg-white/70
                        backdrop-blur-xl shadow-[0_4px_20px_rgba(0,0,0,0.03)]
                        flex flex-col gap-3 text-sm text-black/70">
          <p className="font-semibold text-black/80">Request Flow:</p>

          <div className="space-y-1">
            <p>• Stability Kernel (Noise Reduction)</p>
            <p>• Gen5.9-Lite (Context Composer)</p>
            <p>• Omega-Lite (Semantic Alignment)</p>
            <p>• HPE Engine (High Precision Execution)</p>
            <p>• Quantum Engine (Multi-Dimensional Reasoning)</p>
            <p>• Router + Bandit (Engine Selection)</p>
            <p>• Streaming Output</p>
          </div>
        </div>
      </section>

      {/* ------------------------------ */}
      {/* TOOLKIT */}
      {/* ------------------------------ */}
      <section className="w-full max-w-5xl mb-24">
        <h2 className="text-2xl font-semibold mb-6 text-black">Developer Toolkit</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {[
            "Developer Console (Dual Shell)",
            "SSH Terminal (Realtime PTY)",
            "Instance Dashboard",
            "Logs + Metrics Panels",
            "Chat Playground (Streaming)",
            "API Keys Management",
            "File Explorer & Editor",
            "Usage Dashboard",
          ].map((label, idx) => (
            <div
              key={idx}
              className="rounded-2xl p-5 border border-black/10 bg-white/70
                         backdrop-blur-xl shadow-[0_4px_20px_rgba(0,0,0,0.03)]
                         text-sm text-black/70"
            >
              {label}
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------ */}
      {/* CODE EXAMPLES */}
      {/* ------------------------------ */}
      <section className="w-full max-w-4xl mb-24">
        <h2 className="text-2xl font-semibold mb-4 text-black">Code Examples</h2>

        <div className="rounded-2xl p-6 border border-black/10 bg-white/70
                        backdrop-blur-xl shadow-[0_4px_20px_rgba(0,0,0,0.03)]
                        text-sm text-black/80">
          
          {/* TypeScript */}
          <p className="font-semibold text-black mb-3">TypeScript</p>
          <pre className="text-[13px] whitespace-pre-wrap">{`import { YuaClient } from "yua-one-node";

const yua = new YuaClient({
  baseUrl: "https://console.yuaone.com/api",
  apiKey: process.env.YUA_API_KEY,
});

const result = await yua.chat.generate({
  messages: [{ role: "user", content: "Explain HPE Engine" }],
});

console.log(result.text);`}</pre>

          <hr className="my-6 border-black/10" />

          {/* Python */}
          <p className="font-semibold text-black mb-3">Python</p>
          <pre className="text-[13px] whitespace-pre-wrap">{`from yua_one_python import YuaClient

yua = YuaClient(
    base_url="https://console.yuaone.com/api",
    api_key="YOUR_KEY"
)

res = yua.chat.generate({
    "messages": [{"role": "user", "content": "Analyze dataset"}]
})

print(res.text)`}</pre>

          <hr className="my-6 border-black/10" />

          {/* QGML Pipeline */}
          <p className="font-semibold text-black mb-3">QGML Pipeline</p>
          <pre className="text-[13px] whitespace-pre-wrap">{`pipeline:
  stability -> gen59 -> omega -> hpe -> quantum`}</pre>

        </div>
      </section>

      {/* ------------------------------ */}
      {/* FOOTER */}
      {/* ------------------------------ */}
      <footer className="mt-10 text-xs text-black/40 pb-10 text-center">
        © {new Date().getFullYear()} YUA ONE — Developer Platform
      </footer>
    </div>
  );
}
