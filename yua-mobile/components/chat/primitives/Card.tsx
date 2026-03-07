import type React from "react";
import { View, type ViewProps } from "react-native";

type Props = ViewProps & {
  children: React.ReactNode;
};

export default function Card({ children, ...rest }: Props) {
  return <View {...rest}>{children}</View>;
}
