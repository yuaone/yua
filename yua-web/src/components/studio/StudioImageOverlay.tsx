"use client";

import { X, Download } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useStudioContext } from "@/store/useStudioContext";
import { useStudioState } from "./useStudioState";
import { useAuth } from "@/contexts/AuthContext";

import StudioHeader from "./StudioHeader";
import StudioPreview from "./StudioPreview";
import StudioActionBar from "./StudioActionBar";
import Skeleton from "@/components/ui/Skeleton";

/* =========================
   Types
========================= */

type Asset = {
  id: number;
  asset_type:
    | "COMPOSITE_IMAGE"
    | "FACTUAL_VISUALIZATION"
    | "SEMANTIC_IMAGE";
  uri: string;
};

/* =========================
   Component
========================= */

export default function StudioImageOverlay() {
  const backdropRef = useRef<HTMLDivElement>(null);

  const { entry, closeStudio, clear } = useStudioContext();
  const studio = useStudioState("image");
  const { authFetch } = useAuth();

  const [assets, setAssets] = useState<Asset[] | null>(null);
  const [selected, setSelected] = useState<Asset | null>(null);

  if (!entry) return null;

  /* =========================
     Load Assets
  ========================= */
  useEffect(() => {

    let alive = true;
    setAssets(null);

    if (process.env.NODE_ENV !== "production") {
      console.log("[STUDIO][IMAGES_FETCH]", {
        scope: "user",
        threadId: entry.threadId,
        sectionId: entry.sectionId,
      });
    }

    authFetch(`/api/studio/images?scope=user`)
      .then((r) => r.json())
      .then((res) => {
        if (!alive) return;
        if (res?.ok && Array.isArray(res.assets)) {
          setAssets(res.assets);
          setSelected(
            res.assets
              .slice()
              .sort((a: Asset, b: Asset) => b.id - a.id)[0] ?? null
          );
        } else {
          setAssets([]);
        }
      })
      .catch(() => alive && setAssets([]));

    return () => {
      alive = false;
    };
  }, [entry.threadId, authFetch]);

  const showPreview =
    studio.status === "executing" ||
    studio.status === "preview";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        ref={backdropRef}
        className="absolute inset-0 bg-black/40"
        onClick={closeStudio}
      />

      {/* Panel */}
      <div className="relative z-10 h-[85vh] w-[1100px] max-lg:h-[92vh] max-lg:w-[96vw] rounded-2xl bg-white shadow-xl flex flex-col overflow-hidden">
        <StudioHeader mode="image" />

        {/* Body */}
        <div className="flex flex-1 overflow-hidden bg-gray-50 max-lg:flex-col">
          {/* Left: Preview or Library */}
          <div className="flex-1 overflow-auto p-6 max-lg:p-4">
            {showPreview ? (
              <StudioPreview
                status={studio.status}
                result={studio.result}
              />
            ) : (
              <>
                <h2 className="mb-3 text-sm font-medium text-gray-700">
                  이미지 보관함
                </h2>

                {assets === null && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="aspect-square">
                        <Skeleton />
                      </div>
                    ))}
                  </div>
                )}

                {assets?.length === 0 && (
                  <div className="h-[240px] flex items-center justify-center text-sm text-gray-400">
                    아직 생성된 이미지가 없어요
                  </div>
                )}

                {assets && assets.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {assets.map((a) => (
                      <ImageCard
                        key={a.id}
                        asset={a}
                        active={a.id === selected?.id}
                        onSelect={() => setSelected(a)}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Right: Inspector */}
          <ImageInspector
            asset={selected}
            regenerate={() => {
              if (!entry?.input) return;
              studio.regenerate();
              studio.generate(entry.input);
            }}
          />
        </div>

        <StudioActionBar
          status={studio.status}
          regenerate={() => {
            if (!entry?.input) return;
            studio.regenerate();
            studio.generate(entry.input);
          }}
          confirm={() => {
            studio.confirm();
            clear();
          }}
        />
      </div>
    </div>
  );
}

/* =========================
   Image Card
========================= */

function ImageCard({
  asset,
  active,
  onSelect,
}: {
  asset: Asset;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      onClick={onSelect}
      className={`
        relative aspect-square rounded-xl overflow-hidden cursor-pointer
        ${active ? "ring-2 ring-black" : "hover:shadow"}
      `}
    >
      <img
        src={asset.uri}
        className="h-full w-full object-cover"
      />
    </div>
  );
}

/* =========================
   Inspector
========================= */

function ImageInspector({
  asset,
  regenerate,
}: {
  asset: Asset | null;
  regenerate: () => void;
}) {
  if (!asset) {
    return (
      <div className="w-[320px] max-lg:w-full border-l max-lg:border-l-0 max-lg:border-t bg-white flex items-center justify-center text-sm text-gray-400">
        이미지를 선택하세요
      </div>
    );
  }

  return (
    <div className="w-[320px] max-lg:w-full border-l max-lg:border-l-0 max-lg:border-t bg-white p-4 flex flex-col gap-4">
      <div className="aspect-square max-lg:aspect-[4/3] rounded-lg overflow-hidden bg-gray-100">
        <img
          src={asset.uri}
          className="h-full w-full object-contain"
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={regenerate}
          className="flex-1 px-3 py-2 border rounded text-sm hover:bg-gray-50 max-lg:py-2.5"
        >
          다시 생성
        </button>
        <button
          onClick={() => {
            const a = document.createElement("a");
            a.href = asset.uri;
            a.download = "";
            a.click();
          }}
          className="px-3 py-2 border rounded hover:bg-gray-50 max-lg:py-2.5"
        >
          <Download size={16} />
        </button>
      </div>
    </div>
  );
}
