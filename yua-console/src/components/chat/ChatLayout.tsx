"use client";

import ChatSidebar from "./ChatSidebar";


export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-screen bg-white text-black overflow-hidden">
      {/* LEFT SIDEBAR */}
      <ChatSidebar />

      {/* MAIN CHAT AREA */}
      <div className="flex-1 flex flex-col min-h-0 h-full">
        {/* 🔑 h-full 추가 */}
        {children}
      </div>
    </div>
  );
}
