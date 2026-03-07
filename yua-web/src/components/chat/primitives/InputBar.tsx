import type React from "react";
import type { StreamState } from "@/store/useChatStore";

type Props = React.HTMLAttributes<HTMLDivElement> & {
  children: React.ReactNode;
  streamState: StreamState;
};

export default function InputBar({ children, streamState, ...rest }: Props) {
  return (
    <div data-ui="InputBar" data-stream-state={streamState} {...rest}>
      {children}
    </div>
  );
}
