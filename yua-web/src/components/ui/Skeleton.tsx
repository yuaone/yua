"use client";

export default function Skeleton({
  height = 260,
}: {
  height?: number;
}) {
  return (
    <div
      style={{ minHeight: height }}
 className="w-full h-full rounded-2xl bg-gradient-to-br from-gray-200 to-gray-100 animate-pulse"
    />
  );
}
