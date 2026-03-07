"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { AttachmentMeta } from "yua-shared/chat/attachment-types";

type StudioStatus =
  | "idle"
  | "planning"
  | "judging"
  | "executing"
  | "preview"
  | "done"
  | "blocked";

type AssetResult = {
  contentRef: string | null;
  metadata: {
    format: string; // PDF | PNG | JPG | MP4
    pageCount?: number;
    width?: number;
    height?: number;
    durationSec?: number;
  };
};

type Props = {
  status: StudioStatus;
  result: AssetResult | null;
  attachments?: AttachmentMeta[];
};

export default function StudioPreview({
  status,
  result,
  attachments,
}: Props) {
  return (
    <div className="h-full bg-gray-50">
      <AnimatePresence mode="wait">
        {/* 실행 중 */}
        {status === "executing" && (
          <motion.div
            key="executing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-gray-500 text-sm"
          >
            제작 중입니다…
          </motion.div>
        )}

        {/* 차단 */}
        {status === "blocked" && (
          <motion.div
            key="blocked"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-red-500 text-sm"
          >
            이 요청은 실행할 수 없어요
          </motion.div>
        )}

        {/* 결과 미리보기 */}
        {status === "preview" && result && (
          <motion.div
            key="preview"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="w-full p-6 max-lg:p-4"
          >
            <div className="border rounded-lg bg-white shadow-sm overflow-hidden">
              <PreviewByType result={result} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* --------------------------------------------------
 * 결과 타입별 Preview
 * -------------------------------------------------- */

function PreviewByType({ result }: { result: AssetResult }) {
  const { contentRef, metadata } = result;

  if (!contentRef) {
    return (
      <div className="h-[420px] flex items-center justify-center text-gray-400">
        결과를 불러올 수 없어요
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Meta */}
      <div className="px-4 py-2 border-b text-xs text-gray-500 flex gap-4 flex-wrap">
        <span>형식: {metadata.format}</span>

        {metadata.pageCount && (
          <span>페이지: {metadata.pageCount}</span>
        )}

        {metadata.width && metadata.height && (
          <span>
            해상도: {metadata.width}×{metadata.height}
          </span>
        )}

        {metadata.durationSec && (
          <span>
            길이: {metadata.durationSec}s
          </span>
        )}

        <a
          href={`/${contentRef}`}
          download
          className="ml-auto text-black hover:underline"
        >
          다운로드
        </a>
      </div>

      {/* Content */}
      <div className="bg-gray-100">
        {renderContent(metadata.format, contentRef)}
      </div>
    </div>
  );
}

/* --------------------------------------------------
 * Content Renderer
 * -------------------------------------------------- */

function renderContent(
  format: string,
  contentRef: string
) {
  switch (format) {
    case "PDF":
      return (
        <iframe
          src={`/${contentRef}`}
          className="w-full h-[600px] max-lg:h-[420px]"
        />
      );

    case "PNG":
    case "JPG":
      return (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="flex items-center justify-center p-6"
        >
          <img
            src={`/${contentRef}`}
            alt="generated"
            className="max-h-[600px] max-lg:max-h-[360px] rounded"
          />
        </motion.div>
      );

    case "MP4":
      return (
        <video
          src={`/${contentRef}`}
          controls
          className="w-full max-h-[600px] max-lg:max-h-[360px]"
        />
      );

    default:
      return (
        <div className="h-[420px] flex items-center justify-center text-gray-400">
          지원하지 않는 형식
        </div>
      );
  }
}
