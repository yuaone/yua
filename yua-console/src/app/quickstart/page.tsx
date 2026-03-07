"use client";

import { useEffect, useState, ReactNode } from "react";

export default function QuickstartPage() {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const t = localStorage.getItem("YUA_API_KEY");
    setToken(t);
  }, []);

  const codeExample = `
const res = await fetch("https://api.yuaone.com/chat", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": "Bearer ${token ?? "YOUR_API_KEY"}"
  },
  body: JSON.stringify({
    model: "yua-basic",
    messages: [{ role: "user", content: "Hello YUA!" }]
  })
});

const data = await res.json();
console.log(data);
  `.trim();

  const streamExample = `
const eventSource = new EventSource(
  "https://api.yuaone.com/stream?key=${token ?? "YOUR_API_KEY"}"
);

eventSource.onmessage = (event) => {
  console.log("chunk:", event.data);
};

eventSource.onerror = () => {
  console.error("stream error");
  eventSource.close();
};
  `.trim();

  return (
    <div className="p-10 text-black max-w-4xl mx-auto">
      <h1 className="text-4xl font-bold mb-4">Quickstart</h1>
      <p className="text-black/60 text-lg mb-10">
        단 5분 안에 YUA ONE API를 시작할 수 있습니다.
      </p>

      <Step title="1) API Key 생성하기" number={1}>
        <a
          href="/keys"
          className="inline-block bg-black text-white px-4 py-2 rounded-lg"
        >
          API Key 생성하기 →
        </a>
      </Step>

      <Step title="2) 첫 Chat API 호출" number={2}>
        <CodeBlock code={codeExample} />
      </Step>

      <Step title="3) Stream(SSE) 실시간 응답 받기" number={3}>
        <CodeBlock code={streamExample} />
      </Step>
    </div>
  );
}

/* =========================================================
   Local Components (Quickstart 전용)
========================================================= */

function Step({
  title,
  number,
  children,
}: {
  title: string;
  number: number;
  children: ReactNode;
}) {
  return (
    <div className="mb-10">
      <h2 className="text-xl font-semibold mb-3">
        {number}. {title}
      </h2>
      <div className="pl-4 border-l-2 border-black/10">
        {children}
      </div>
    </div>
  );
}

function CodeBlock({ code }: { code: string }) {
  return (
    <pre className="mt-3 bg-black text-white text-sm p-4 rounded-lg overflow-x-auto">
      <code>{code}</code>
    </pre>
  );
}
