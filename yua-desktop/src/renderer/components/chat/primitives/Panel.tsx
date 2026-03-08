import type React from "react";

type Props = React.HTMLAttributes<HTMLDivElement> & {
  children: React.ReactNode;
};

export default function Panel({ children, ...rest }: Props) {
  return (
    <div data-ui="Panel" {...rest}>
      {children}
    </div>
  );
}
