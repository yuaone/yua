"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import StudioHeader from "./StudioHeader";
import StudioControlPanel from "./StudioControlPanel";
import StudioPreview from "./StudioPreview";
import StudioActionBar from "./StudioActionBar";

import { useStudioState } from "./useStudioState";
import {
  useStudioEntry,
  useStudioContext,
} from "@/store/useStudioContext";

export default function StudioLayout({
  mode,
}: {
  mode: "image" | "document" | "video";
}) {
  const router = useRouter();
  const entry = useStudioEntry();
  const { clear } = useStudioContext();

  const studio = useStudioState(mode);
  const generatedRef = useRef(false);
  const [mobileOptionsOpen, setMobileOptionsOpen] = useState(false);

  /* --------------------------------------------------
     Guard 1️⃣: entry 없으면 진입 불가
  -------------------------------------------------- */
  useEffect(() => {
    if (!entry) {
      router.replace("/chat");
    }
  }, [entry, router]);

  /* --------------------------------------------------
     Guard 2️⃣: mode 불일치 방지
  -------------------------------------------------- */
  useEffect(() => {
    if (entry && entry.mode !== mode) {
      console.warn("[STUDIO] mode mismatch");
      router.replace("/chat");
    }
  }, [entry, mode, router]);

  /* --------------------------------------------------
     Auto Generate (최초 1회)
     🔒 input만 넘긴다 (attachments는 context)
  -------------------------------------------------- */
  useEffect(() => {
    if (!entry) return;
    if (generatedRef.current) return;
    if (studio.status !== "idle") return;

    generatedRef.current = true;
    studio.generate(entry.input);
  }, [entry, studio]);

  if (!entry) return null;

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <StudioHeader
        mode="image"
        rightAction={
          <button
            type="button"
            onClick={() => setMobileOptionsOpen(true)}
            className="lg:hidden rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm"
          >
            옵션
          </button>
        }
      />

      <div className="flex flex-1 overflow-hidden max-lg:flex-col">
        {/* Control */}
        <div className="w-[320px] border-r bg-white hidden md:block">
          <StudioControlPanel
            mode={mode}
            options={studio.options}
            setOptions={studio.setOptions}
            generate={() => studio.generate(entry.input)}
          />
        </div>

        {/* Preview */}
        <div className="flex-1 overflow-auto">
          <StudioPreview
            status={studio.status}
            result={studio.result}
          />
        </div>
      </div>

      <StudioActionBar
        status={studio.status}
        regenerate={() => {
          generatedRef.current = false;
          studio.regenerate();
          studio.generate(entry.input);
        }}
        confirm={() => {
          studio.confirm();
          clear(); // ✅ 여기서만 clear
          router.replace("/chat");
        }}
      />

      {mobileOptionsOpen && (
        <div className="fixed inset-0 z-[120] lg:hidden">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setMobileOptionsOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[70vh] rounded-t-2xl bg-white shadow-xl animate-yua-slide-up">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div className="text-sm font-semibold text-gray-900">옵션</div>
              <button
                onClick={() => setMobileOptionsOpen(false)}
                className="rounded-md px-2 py-1 text-xs text-gray-500 hover:bg-gray-100"
              >
                닫기
              </button>
            </div>
            <div className="max-h-[calc(70vh-52px)] overflow-auto pb-[calc(env(safe-area-inset-bottom)+8px)]">
              <StudioControlPanel
                mode={mode}
                options={studio.options}
                setOptions={studio.setOptions}
                generate={() => studio.generate(entry.input)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
