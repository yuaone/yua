import type React from "react";

type Props = React.HTMLAttributes<HTMLDivElement> & {
  children: React.ReactNode;
};

export default function Timeline({ children, ...rest }: Props) {
  return (
    <div data-ui="Timeline" {...rest}>
      {children}
    </div>
  );
}
