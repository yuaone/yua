import { useEffect, useState } from "react";

type Props = {
  frames: string[];
  cadenceMs?: number;
};

export function ActionPreviewIndicator({
  frames,
  cadenceMs = 500,
}: Props) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!frames.length) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % frames.length);
    }, cadenceMs);
    return () => clearInterval(id);
  }, [frames, cadenceMs]);

  return (
    <div className="text-sm text-gray-500 opacity-70 transition-all">
      {frames[index]}
    </div>
  );
}
