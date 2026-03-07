"use client";

import { useState } from "react";

export function useChatHistory() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/chat/load");
      const data = await res.json();
      if (data.ok) setHistory(data.messages ?? []);
    } catch (err) {
      console.error("[HISTORY LOAD ERROR]", err);
    }
    setLoading(false);
  };

  const list = async () => {
    try {
      const res = await fetch("/api/chat/list");
      const data = await res.json();
      if (data.ok) return data.conversations ?? [];
    } catch (err) {
      console.error("[HISTORY LIST ERROR]", err);
      return [];
    }
  };

  const save = async (payload: any) => {
    try {
      await fetch("/api/chat/save", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.error("[HISTORY SAVE ERROR]", err);
    }
  };

  return {
    history,
    loading,
    load,
    list,
    save,
  };
}
