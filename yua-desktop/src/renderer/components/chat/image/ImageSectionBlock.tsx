import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/DesktopAuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Copy, Maximize2 } from "lucide-react";
import Skeleton from "@/components/ui/Skeleton";

type Asset = {
  id: number;
  asset_type:
    | "COMPOSITE_IMAGE"
    | "FACTUAL_VISUALIZATION"
    | "SEMANTIC_IMAGE";
  uri: string;
};

type Props = {
  sectionId: number;
  loading?: boolean;
};

export default function ImageSectionBlock({
  sectionId,
  loading = false,
}: Props) {
  const { authFetch } = useAuth();

  const isPlaceholder = sectionId <= 0;

  const [assets, setAssets] = useState<Asset[] | null>(null);
  const [fetched, setFetched] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [reveal, setReveal] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  console.log("[DEBUG][ImageSectionBlock RENDER]", {
    sectionId,
    isPlaceholder,
  });

  useEffect(() => {
    setFetched(false);
  }, [sectionId]);

  /* ---------------- State reset ---------------- */
 useEffect(() => {
   if (isPlaceholder) return;
   setFetched(false);
   setAssets(null);
   setImageLoaded(false);
 }, [sectionId, isPlaceholder]);

  /* ---------------- Fetch assets ---------------- */
  useEffect(() => {
    if (isPlaceholder) return;
    if (fetched) return;
    if (!Number.isFinite(sectionId) || sectionId <= 0) return;

    let alive = true;

    console.log("[IMAGE_FETCH]", { sectionId });
    setFetching(true);
    authFetch(`/api/sections/${sectionId}/assets`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((res) => {
        if (!alive) return;
        if (res?.ok && Array.isArray(res.assets)) {
          setAssets(res.assets);
          setFetched(true);
          setFetching(false);
        } else {
          setAssets([]);
          setFetched(true);
          setFetching(false);
        }
      })
      .catch((err) => {
        console.error("[ImageSectionBlock][FETCH_ERROR]", err);
        if (alive) {
          setAssets([]);
          setFetched(true);
          setFetching(false);
        }
      });

    return () => {
      alive = false;
    };
  }, [sectionId, fetched, authFetch, isPlaceholder]);

  if (sectionId <= 0) return null;
 const hasAssets = Array.isArray(assets) && assets.length > 0;

 const showSkeleton = !imageLoaded || fetching === true;

 const pickLatest = (type: Asset["asset_type"]) =>
   (assets ?? [])
     .filter((a) => a.asset_type === type)
     .sort((a, b) => b.id - a.id)[0];

 const primary =
   hasAssets
     ? pickLatest("COMPOSITE_IMAGE") ??
       pickLatest("FACTUAL_VISUALIZATION") ??
       pickLatest("SEMANTIC_IMAGE")
     : undefined;

  if (!primary && !showSkeleton) {
    return (
      <div className="mx-auto my-8 max-w-[520px] text-sm text-gray-400">
        이미지 로딩에 실패했습니다
      </div>
    );
  }

  /* ---------------- Render image ---------------- */
  return (
    <motion.div
      initial={{ opacity: 0, y: -24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
    >
      <div className="mx-auto my-8 max-w-[520px]">
        <AnimatePresence>
 <motion.div
   initial={{ opacity: 0 }}
   animate={{ opacity: 1 }}
   transition={{ duration: 0.4, ease: "easeOut" }}
   className="relative z-0 aspect-square rounded-2xl overflow-hidden bg-gray-100 shadow-md"
 >
   {primary ? (
     <>
   {/* Progressive blur layer */}
   <img
     src={primary?.uri}
     aria-hidden
     className={`
       absolute inset-0 w-full h-full object-cover
       scale-105
       transition-all duration-[1200ms] ease-out
       ${reveal ? "blur-0 opacity-100" : "blur-[20px] opacity-60"}
     `}
   />

   {/* Final sharp image */}
   <img
     src={primary.uri}
     alt="generated"
     className={`
       relative z-10 w-full h-full object-contain
       transition-all duration-300 ease-out
       ${imageLoaded ? "opacity-100 blur-0" : "opacity-0 blur-sm"}
       cursor-zoom-in select-none
     `}
     onLoad={() => {
       setTimeout(() => {
         setImageLoaded(true);
       }, 200);
       requestAnimationFrame(() => setReveal(true));
     }}
   />
     </>
   ) : (
     <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-400">
       아직 생성된 이미지가 없어요
     </div>
   )}

   <AnimatePresence>
     {showSkeleton && !imageLoaded && (
       <motion.div
         initial={{ opacity: 1 }}
         exit={{ opacity: 0 }}
         transition={{ duration: 0.25 }}
         className="absolute inset-0 bg-white"
       >
         <Skeleton />
       </motion.div>
     )}
   </AnimatePresence>

            {primary && (
              <div className="absolute right-3 top-3 flex gap-2 relative z-20">
              <ActionButton
                icon={<Download size={18} />}
                onClick={() => {
                  const a = document.createElement("a");
                  a.href = primary.uri;
                  a.download = "";
                  a.click();
                }}
              />
              <ActionButton
                icon={<Copy size={18} />}
                onClick={() => {
                  navigator.clipboard.writeText(primary.uri);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1200);
                }}
              />
              <ActionButton
                icon={<Maximize2 size={18} />}
                onClick={() => setExpanded(true)}
              />
              </div>
            )}

            {copied && primary && (
              <div className="absolute bottom-3 right-3 text-xs text-gray-600 bg-white/90 px-3 py-1 rounded-md shadow">
                링크 복사됨
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {expanded && primary && (
          <motion.div
            className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setExpanded(false)}
          >
            <motion.img
              src={primary.uri}
              className="max-h-[90vh] max-w-[90vw] rounded-2xl bg-white shadow-2xl"
              initial={{ scale: 0.92 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.92 }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ---------------- Action Button ---------------- */

function ActionButton({
  icon,
  onClick,
}: {
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="h-10 w-10 rounded-lg bg-white/90 backdrop-blur flex items-center justify-center shadow hover:bg-white"
    >
      {icon}
    </button>
  );
}
