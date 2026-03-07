"use client";

type Props = {
  indent: number; // 0 = root, 1+ = child message
};

export default function MessageBranchLine({ indent }: Props) {
  if (indent <= 0) return null;

  return (
    <div
      className="absolute left-0 top-0 h-full"
      style={{
        transform: `translateX(${indent * 14}px)`,
      }}
    >
      <div className="h-full w-[2px] bg-slate-700/60 rounded-full" />
    </div>
  );
}
