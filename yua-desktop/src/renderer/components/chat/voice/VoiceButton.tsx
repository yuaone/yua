import { useCallback } from "react";
import { Mic, MicOff } from "lucide-react";

type VoiceButtonProps = {
  permissionState: "prompt" | "granted" | "denied";
  onStartRecording: () => void;
  disabled?: boolean;
};

export default function VoiceButton({
  permissionState,
  onStartRecording,
  disabled,
}: VoiceButtonProps) {
  const handleClick = useCallback(() => {
    onStartRecording();
  }, [onStartRecording]);

  const isDenied = permissionState === "denied";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className="
        h-9 w-9 max-lg:h-10 max-lg:w-10
        rounded-full
        flex items-center justify-center
        text-gray-500 dark:text-gray-400
        hover:bg-gray-100 dark:hover:bg-white/10
        disabled:opacity-30
        transition
      "
      title={isDenied ? "마이크 권한이 필요합니다" : "음성 입력"}
    >
      {isDenied ? <MicOff size={18} /> : <Mic size={18} />}
    </button>
  );
}
