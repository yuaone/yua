import { FileText, Image as ImageIcon, Film } from "lucide-react";
import type { StudioSystemRef } from "yua-shared/chat/studio-types";
import ImageSectionBlock from "@/components/chat/image/ImageSectionBlock";
type Props = {
  content: string;
  studio: StudioSystemRef;
  onOpenStudio?: (ref: StudioSystemRef) => void;
};

function resolveIcon(type: StudioSystemRef["assetType"]) {
  switch (type) {
    case "IMAGE":
      return <ImageIcon size={18} />;
    case "VIDEO":
      return <Film size={18} />;
    default:
      return <FileText size={18} />;
  }
}

function resolveLabel(type: StudioSystemRef["assetType"]) {
  switch (type) {
    case "IMAGE":
      return "이미지 생성 완료";
    case "VIDEO":
      return "영상 생성 완료";
    default:
      return "문서 생성 완료";
  }
}

export default function SystemMessageCard({
  content,
  studio,
  onOpenStudio,
}: Props) {


  return (
 <div
   className="
     my-6 mx-auto
     max-w-[640px]
     rounded-2xl
     border
     bg-white
     px-6 py-5
     shadow-[0_6px_24px_rgba(0,0,0,0.06)]
     transition
     hover:shadow-[0_10px_30px_rgba(0,0,0,0.08)]
   "
 >
      <div className="flex items-center gap-2 text-[15px] font-semibold text-[var(--ink)]">
        {resolveIcon(studio.assetType)}
        <span>{resolveLabel(studio.assetType)}</span>
      </div>

      <div className="mt-2 text-[14.5px] text-[var(--ink-2)]">
        {content}
      </div>


 <div className="mt-5 flex justify-end">
   <button
     onClick={() => onOpenStudio?.(studio)}
     className="yua-system-cta"
   >
     Studio에서 열기
     <span className="arrow">→</span>
   </button>
 </div>

    </div>
  );
}
