"use client";

import { useEffect, useState } from "react";

interface DocEntry {
  title: string;
  path: string;
}

const DOCS: DocEntry[] = [
  { title: "Authentication", path: "/docs/auth" },
  { title: "Chat API", path: "/docs/chat" },
  { title: "Instances", path: "/docs/instances" },
  { title: "Shell Commands", path: "/docs/shell" },
];

export default function CmdK() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const filtered = DOCS.filter((d) =>
    d.title.toLowerCase().includes(query.toLowerCase())
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur z-[999] flex justify-center pt-40">
      <div className="bg-white w-[500px] rounded-xl shadow-xl p-4">

        <input
          className="w-full border border-black/20 rounded-md px-3 py-2 mb-3"
          placeholder="Search docs…"
          autoFocus
          onChange={(e) => setQuery(e.target.value)}
        />

        <div className="flex flex-col gap-2">
          {filtered.map((d) => (
            <a
              key={d.path}
              href={d.path}
              className="px-3 py-2 rounded hover:bg-black/5"
              onClick={() => setOpen(false)}
            >
              {d.title}
            </a>
          ))}
        </div>

        <button
          className="text-xs text-black/40 mt-3"
          onClick={() => setOpen(false)}
        >
          Close
        </button>
      </div>
    </div>
  );
}
