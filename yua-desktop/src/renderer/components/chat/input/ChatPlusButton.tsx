import { Plus } from "lucide-react";

export default function ChatPlusButton({
  onClick,
}: {
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="
        rounded-full p-2
        hover:bg-gray-100
        dark:hover:bg-white/10
        text-gray-900 dark:text-white
        transition
      "
    >
      <Plus size={18} />
    </button>
  );
}
