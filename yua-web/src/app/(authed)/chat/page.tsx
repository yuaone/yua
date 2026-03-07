"use client";

import { ChatOverview } from "@/components/chat/ChatOverview";
import AuthGate from "@/components/auth/AuthGate";

export default function ChatPage() {
  return (
    <AuthGate mode="chat">
      <ChatOverview />
    </AuthGate>
  );
}
