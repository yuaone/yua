"use client";

import { useState } from "react";

export default function LinuxTerminal() {
  const [output, setOutput] = useState<string[]>([]);
  const [input, setInput] = useState("");

  async function run() {
    if (!input.trim()) return;

    const res = await fetch("/api/console/linux", {
      method: "POST",
      body: JSON.stringify({ cmd: input }),
    });

    const data = await res.json();

    setOutput((o) => [...o, `$ ${input}`, data.output ?? ""]);
    setInput("");
  }

  return (
    <div className="w-full h-full bg-black text-green-400 p-4 font-mono text-sm overflow-auto">
      {output.map((line, i) => (
        <div key={i}>{line}</div>
      ))}

      <div className="flex mt-2">
        <span>$&nbsp;</span>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && run()}
          className="flex-1 bg-black text-green-400 outline-none"
        />
      </div>
    </div>
  );
}
