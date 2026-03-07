"use client";

export default function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`
        relative inline-flex w-10 h-5 shrink-0 rounded-full transition-colors
        ${checked ? "bg-[#111827] dark:bg-white" : "bg-[var(--line)]"}
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
      `}
    >
      <span
        className={`
          pointer-events-none inline-block h-4 w-4 rounded-full bg-white dark:bg-[#111827]
          shadow transform transition-transform mt-0.5
          ${checked ? "translate-x-[22px]" : "translate-x-[2px]"}
        `}
      />
    </button>
  );
}
