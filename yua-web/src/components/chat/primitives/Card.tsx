import type React from "react";

type Props = React.HTMLAttributes<HTMLDivElement> & {
  children: React.ReactNode;
};

export default function Card({ children, ...rest }: Props) {
  return (
    <div data-ui="Card" {...rest}>
      {children}
    </div>
  );
}
