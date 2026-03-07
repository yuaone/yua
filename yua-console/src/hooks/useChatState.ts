"use client";

import { useState } from "react";

export function useChatState() {
  const [input, setInput] = useState("");
  const [replyTo, setReplyTo] = useState<number | null>(null);

  return {
    input,
    setInput,
    replyTo,
    setReplyTo,
  };
}
