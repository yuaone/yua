"use client";

import { motion } from "framer-motion";
import {
  FileText,
  Image as ImageIcon,
  Film,
  ArrowUpRight,
} from "lucide-react";
import type { StudioSystemRef } from "yua-shared/chat/studio-types";

type Props = {
  studio: StudioSystemRef;
  onOpen: (ref: StudioSystemRef) => void;
};

/* ---------------------------------- */
/* 🔥 Asset Type Normalizer (SSOT)   */
/* ---------------------------------- */

type BaseType = "IMAGE" | "VIDEO" | "DOCUMENT";

const resolveBaseType = (
  type: StudioSystemRef["assetType"]
): BaseType => {
  if (
    type === "SEMANTIC_IMAGE" ||
    type === "FACTUAL_VISUALIZATION" ||
    type === "COMPOSITE_IMAGE"
  ) {
    return "IMAGE";
  }
  return type as BaseType;
};

/* ---------------------------------- */
/* 🎨 UI Mapping                     */
/* ---------------------------------- */

const ICON: Record<BaseType, JSX.Element> = {
  IMAGE: <ImageIcon size={18} />,
  VIDEO: <Film size={18} />,
  DOCUMENT: <FileText size={18} />,
};

const LABEL: Record<BaseType, string> = {
  IMAGE: "이미지 생성 완료",
  VIDEO: "영상 생성 완료",
  DOCUMENT: "문서 생성 완료",
};

const COLOR: Record<BaseType, string> = {
  IMAGE: "text-indigo-600 bg-indigo-50",
  VIDEO: "text-rose-600 bg-rose-50",
  DOCUMENT: "text-emerald-600 bg-emerald-50",
};

/* ---------------------------------- */
/* 🚀 Component                      */
/* ---------------------------------- */

export default function StudioResultToast({
  studio,
  onOpen,
}: Props) {
  const baseType = resolveBaseType(studio.assetType);

  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className="
        my-6 mx-auto w-full max-w-[560px]
        rounded-2xl
        backdrop-blur-xl
        bg-white/80
        border border-gray-200/70
        shadow-[0_10px_30px_rgba(0,0,0,0.08)]
        px-5 py-4
        flex items-center gap-4
        hover:shadow-[0_14px_40px_rgba(0,0,0,0.12)]
        transition-all
      "
    >
      {/* Icon Bubble */}
      <div
        className={`
          h-10 w-10
          rounded-xl
          flex items-center justify-center
          ${COLOR[baseType]}
        `}
      >
        {ICON[baseType]}
      </div>

      {/* Text */}
      <div className="flex-1">
        <div className="text-[15px] font-semibold text-gray-900 tracking-tight">
          {LABEL[baseType]}
        </div>
        <div className="text-xs text-gray-500 mt-0.5">
          결과를 확인하거나 수정할 수 있어요
        </div>
      </div>

      {/* CTA */}
      <button
        onClick={() => onOpen(studio)}
        className="
          group
          inline-flex items-center gap-1.5
          rounded-lg
          px-3 py-1.5
          text-sm font-medium
          bg-black text-white
          hover:bg-gray-900
          active:scale-[0.97]
          transition
        "
      >
        Studio 열기
        <ArrowUpRight
          size={14}
          className="group-hover:translate-x-[1px] transition"
        />
      </button>
    </motion.div>
  );
}
