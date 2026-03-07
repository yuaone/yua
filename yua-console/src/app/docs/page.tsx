"use client";

import Link from "next/link";
import dynamic from "next/dynamic";

// TOC는 default export → default로 import
const TOC = dynamic(
  () => import("@/components/docs/TOC").then((m) => m.default),
  {
    ssr: false,
    loading: () => null,
  }
);

export default function DocsHome() {
  return (
    <div className="px-10 py-10 max-w-5xl mx-auto">
      {/* Header */}
      <h1 className="text-3xl font-bold mb-6 text-black">
        YUA ONE — Developer Documentation
      </h1>

      <p className="text-black/70 leading-7 mb-12">
        Welcome to the official documentation for <strong>YUA ONE</strong>.
        Explore comprehensive guides for the Chat API, Spine Timeline/Graph,
        Instances, Node & Python SDKs, and the YUA Developer Console.
      </p>

      {/* Docs Index */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-20">
        <DocCard
          title="Quickstart"
          desc="Start using YUA ONE in under 60 seconds."
          href="/docs/quickstart"
        />

        <DocCard
          title="Chat API"
          desc="Message-based chat, streaming, system prompts, file uploads."
          href="/docs/chat"
        />

        <DocCard
          title="Spine Timeline"
          desc="Visualize internal reasoning across pipeline stages."
          href="/docs/spine/timeline"
        />

        <DocCard
          title="Spine Graph"
          desc="Graph-level representation of the multi-engine reasoning flow."
          href="/docs/spine/graph"
        />

        <DocCard
          title="Instances"
          desc="Health checks, logs, metrics, snapshots, and firewall tools."
          href="/docs/instances"
        />

        <DocCard
          title="Node SDK"
          desc="Type-safe Node.js client for Chat, Streaming, and Spine tools."
          href="/docs/sdk/node"
        />

        <DocCard
          title="Python SDK"
          desc="Python client for AI/ML workflows, streaming, and file uploads."
          href="/docs/sdk/python"
        />
      </div>

      {/* Optional: TOC navigation */}
      <div className="mt-24 mb-10">
        {/* ✅ Props 계약 충족 */}
        <TOC items={[]} />
      </div>
    </div>
  );
}

function DocCard({
  title,
  desc,
  href,
}: {
  title: string;
  desc: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="
        block p-6 rounded-xl border border-black/10
        bg-white/70 backdrop-blur-xl
        shadow-[0_4px_20px_rgba(0,0,0,0.03)]
        hover:shadow-[0_6px_24px_rgba(0,0,0,0.06)]
        hover:bg-white/90 transition
      "
    >
      <h2 className="text-lg font-semibold text-black mb-1">{title}</h2>
      <p className="text-black/60 text-sm leading-6">{desc}</p>
    </Link>
  );
}
