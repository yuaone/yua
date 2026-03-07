"use client";

export default function Loader() {
  return (
    <div className="flex gap-1 items-center">
      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse" />
      <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-pulse delay-150" />
      <span className="w-1.5 h-1.5 rounded-full bg-slate-600 animate-pulse delay-300" />
    </div>
  );
}
