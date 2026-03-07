"use client";

import SidebarItem from "./SidebarItem";

export default function LeftSidebar() {
  return (
    <aside
      className="
        fixed top-16 left-0
        h-[calc(100vh-64px)] w-[240px]
        border-r border-black/10
        bg-white/70 backdrop-blur-xl
        shadow-[4px_0_20px_rgba(0,0,0,0.03)]
        overflow-y-auto z-30
        px-6 py-8
      "
    >
      <nav className="flex flex-col gap-10 text-[14px]">

        {/* GUIDE */}
        <section>
          <p className="text-black/40 text-[11px] font-semibold mb-3">
            GUIDE
          </p>

          <div className="flex flex-col gap-1.5">
            <SidebarItem href="/overview" label="Overview" />
            <SidebarItem href="/quickstart" label="Quickstart" />
            <SidebarItem href="/models" label="Models" />

            {/* --- Expanded Docs --- */}
            <SidebarItem href="/docs/chat" label="Chat API" />
            <SidebarItem href="/docs/spine/timeline" label="Spine Timeline" />
            <SidebarItem href="/docs/spine/graph" label="Spine Graph" />
            <SidebarItem href="/docs/instances" label="Instances" />
            <SidebarItem href="/docs/sdk/node" label="Node SDK" />
            <SidebarItem href="/docs/sdk/python" label="Python SDK" />
          </div>
        </section>

        {/* DEVELOPER */}
        <section>
          <p className="text-black/40 text-[11px] font-semibold mb-3">
            DEVELOPER
          </p>
          <div className="flex flex-col gap-1.5">
            <SidebarItem href="/console" label="Developer Console" />
            <SidebarItem href="/chat" label="Chat API Playground" />
            <SidebarItem href="/keys" label="API Keys" />
          </div>
        </section>

        {/* SYSTEM */}
        <section>
          <p className="text-black/40 text-[11px] font-semibold mb-3">
            SYSTEM
          </p>
          <div className="flex flex-col gap-1.5">
            <SidebarItem href="/usage" label="Usage" />
            <SidebarItem href="/billing" label="Billing" />
            <SidebarItem href="/settings" label="Settings" />
          </div>
        </section>
      </nav>
    </aside>
  );
}
