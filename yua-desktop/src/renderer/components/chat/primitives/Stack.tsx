import type React from "react";

type Props = React.HTMLAttributes<HTMLDivElement> & {
  children: React.ReactNode;
};

export default function Stack({ children, ...rest }: Props) {
  return (
    <div data-ui="Stack" {...rest}>
      {children}
    </div>
  );
}
