"use client";

import { useRouter } from "next/navigation";

export default function SmartUpgradeModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-sm border border-gray-200">
        <div className="text-lg font-semibold text-gray-900">프로젝트 생성 제한</div>
        <div className="mt-2 text-sm text-gray-500">
          프로 플랜에서 프로젝트를 생성할 수 있습니다.
        </div>

        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 transition"
          >
            닫기
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              router.push("/upgrade");
            }}
            className="flex-1 bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition"
          >
            Upgrade Now
          </button>
        </div>
      </div>
    </div>
  );
}
