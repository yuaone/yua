interface CreditBadgeProps {
  balance: number;
  limit?: number;
  className?: string;
}

export default function CreditBadge({ balance, limit = 100, className = "" }: CreditBadgeProps) {
  const pct = Math.min((balance / limit) * 100, 100);
  const isLow = pct < 30;
  const isMid = pct >= 30 && pct <= 70;

  const gradientClass = isLow
    ? "from-red-500 to-rose-600"
    : isMid
      ? "from-amber-400 to-orange-500"
      : "from-emerald-400 to-green-600";

  const glowColor = isLow
    ? "shadow-red-500/25"
    : isMid
      ? "shadow-amber-500/25"
      : "shadow-emerald-500/25";

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold
        bg-gradient-to-r ${gradientClass} text-white
        shadow-lg ${glowColor}
        ${isLow ? "yua-credit-pulse" : ""}
        ${className}
      `}
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      ${balance.toFixed(2)}
    </span>
  );
}
