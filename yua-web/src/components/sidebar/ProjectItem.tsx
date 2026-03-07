"use client";

export function ProjectItem({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick(): void;
}) {
  return (
    <div
      onClick={onClick}
      className={`cursor-pointer rounded px-2 py-1 mb-1 text-sm transition ${
        active
          ? "bg-gray-200 font-medium"
          : "hover:bg-gray-200"
      }`}
    >
      {label}
    </div>
  );
}
