"use client";

type Props = {
  children: React.ReactNode;
  className?: string;
};

export default function GlassPanel({ children, className = "" }: Props) {
  return (
    <div
      className={`
        rounded-2xl
        bg-white/60 
        backdrop-blur-xl
        border border-black/10
        shadow-[0_4px_20px_rgba(0,0,0,0.04)]
        p-4
        ${className}
      `}
    >
      {children}
    </div>
  );
}
