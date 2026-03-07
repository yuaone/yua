"use client";

type StudioMode = "image" | "document" | "video";

type Props = {
  mode: StudioMode;
  options: any;
  setOptions: (v: any) => void;
  generate: (input: string) => void;
};

export default function StudioControlPanel({
  mode,
  options,
  setOptions,
  generate,
}: Props) {
  return (
    <div className="p-4 space-y-6 text-sm">
      {/* DOCUMENT OPTIONS */}
      {mode === "document" && (
        <section className="space-y-3">
          <div className="font-medium text-gray-700">
            문서 설정
          </div>

          <div>
            <label className="block mb-1 text-gray-500">
              출력 형식
            </label>
            <select
              className="w-full border rounded px-2 py-1"
              value={options.outputFormat ?? "PDF"}
              onChange={(e) =>
                setOptions({
                  ...options,
                  outputFormat: e.target.value,
                })
              }
            >
              <option value="PDF">PDF</option>
              <option value="DOCX">DOCX</option>
              <option value="HWP">HWP</option>
            </select>
          </div>
        </section>
      )}

      {/* IMAGE OPTIONS */}
      {mode === "image" && (
        <section className="space-y-3">
          <div className="font-medium text-gray-700">
            이미지 설정
          </div>

          <div>
            <label className="block mb-1 text-gray-500">
              스타일
            </label>
            <select
              className="w-full border rounded px-2 py-1"
              value={options.style ?? "realistic"}
              onChange={(e) =>
                setOptions({
                  ...options,
                  style: e.target.value,
                })
              }
            >
              <option value="realistic">사실적</option>
              <option value="illustration">일러스트</option>
              <option value="cinematic">시네마틱</option>
            </select>
          </div>

          <div>
            <label className="block mb-1 text-gray-500">
              비율
            </label>
            <select
              className="w-full border rounded px-2 py-1"
              value={options.aspectRatio ?? "1:1"}
              onChange={(e) =>
                setOptions({
                  ...options,
                  aspectRatio: e.target.value,
                })
              }
            >
              <option value="1:1">1:1 (정사각)</option>
              <option value="16:9">16:9 (와이드)</option>
              <option value="9:16">9:16 (세로)</option>
            </select>
          </div>

          <div>
            <label className="block mb-1 text-gray-500">
              해상도
            </label>
            <select
              className="w-full border rounded px-2 py-1"
              value={options.resolution ?? "1024"}
              onChange={(e) =>
                setOptions({
                  ...options,
                  resolution: e.target.value,
                })
              }
            >
              <option value="512">512px</option>
              <option value="1024">1024px</option>
              <option value="2048">2048px</option>
            </select>
          </div>
        </section>
      )}

      {/* VIDEO (스켈레톤 유지) */}
      {mode === "video" && (
        <section className="space-y-3 text-gray-400">
          <div className="font-medium">
            영상 설정 (준비 중)
          </div>
        </section>
      )}

      {/* ACTION */}
      <div className="pt-4 border-t">
        <button
          onClick={() =>
            generate("CHAT_CONTEXT_INPUT")
          }
          className="w-full bg-black text-white py-2 rounded hover:opacity-90"
        >
          생성
        </button>
      </div>
    </div>
  );
}
