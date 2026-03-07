"use client";

import { useEffect, useState } from "react";

interface Props {
  items: { id: string; title: string }[];
}

export default function TOC({ items }: Props) {
  const [active, setActive] = useState("");

  useEffect(() => {
    const handler = () => {
      let current = "";
      items.forEach((item) => {
        const el = document.getElementById(item.id);
        if (!el) return;
        const rect = el.getBoundingClientRect();
        if (rect.top < 120) current = item.id;
      });
      setActive(current);
    };

    window.addEventListener("scroll", handler);
    handler();
    return () => window.removeEventListener("scroll", handler);
  }, [items]);

  return (
    <aside className="hidden lg:block w-60 fixed left-[260px] top-20">
      <div className="text-sm flex flex-col gap-2">
        {items.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            className={`
              px-2 py-1 rounded
              ${active === item.id ? "font-bold text-black" : "text-black/50"}
            `}
          >
            {item.title}
          </a>
        ))}
      </div>
    </aside>
  );
}
