"use client";

import { motion, AnimatePresence } from "framer-motion";

type StudioStatus =
  | "idle"
  | "planning"
  | "judging"
  | "executing"
  | "preview"
  | "done"
  | "blocked";

type Props = {
  status: StudioStatus;
  regenerate: () => void;
  confirm: () => void;
};

export default function StudioActionBar({
  status,
  regenerate,
  confirm,
}: Props) {
  // idle / blocked 에서는 액션바 자체 미노출
  if (status === "idle" || status === "blocked") {
    return null;
  }

  const isBusy =
    status === "planning" ||
    status === "judging" ||
    status === "executing";

  return (
    <AnimatePresence>
      <motion.div
        key="studio-action-bar"
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 12, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="h-14 max-lg:h-12 border-t bg-white flex items-center justify-end gap-2 px-4"
      >
        {/* 다시 생성 */}
        {status === "preview" && (
          <button
            onClick={regenerate}
            disabled={isBusy}
            className="px-4 py-2 border rounded text-sm
                       hover:bg-gray-50 disabled:opacity-50"
          >
            다시 생성
          </button>
        )}

        {/* 확정 */}
        {(status === "preview" || status === "done") && (
          <button
            onClick={confirm}
            disabled={isBusy}
            className="px-4 py-2 bg-black text-white rounded text-sm
                       hover:opacity-90 disabled:opacity-50"
          >
            {status === "done"
              ? "확정 완료"
              : "확정"}
          </button>
        )}

        {/* 실행 중 표시 */}
        {isBusy && (
          <div className="text-xs text-gray-400">
            처리 중…
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
