import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/hooks/useTheme";

type MobileTopBarProps = {
  title: string;
  onPressMenu: () => void;
  onPressThink?: () => void;
  rightLabel?: string;
  onPressRight?: () => void;
};

export default function MobileTopBar({
  title,
  onPressMenu,
  onPressThink,
  rightLabel,
  onPressRight,
}: MobileTopBarProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.header, { backgroundColor: colors.topBarBg, borderBottomColor: colors.line }]}>
      <Pressable
        style={[styles.iconBtn, { backgroundColor: colors.iconBtnBg }]}
        onPress={onPressMenu}
      >
        <Text style={[styles.iconText, { color: colors.iconBtnText }]}>
          {"\u2261"}
        </Text>
      </Pressable>
      <Text
        numberOfLines={1}
        style={[styles.headerTitle, { color: colors.iconBtnText }]}
      >
        {title}
      </Text>
      {rightLabel && onPressRight ? (
        <Pressable
          style={[styles.iconBtn, styles.textBtn, { backgroundColor: colors.iconBtnBg }]}
          onPress={onPressRight}
        >
          <Text style={[styles.textBtnLabel, { color: colors.iconBtnText }]}>
            {rightLabel}
          </Text>
        </Pressable>
      ) : (
        <Pressable
          style={[styles.iconBtn, { backgroundColor: colors.iconBtnBg }]}
          onPress={onPressThink}
        >
          <Text style={[styles.iconText, { color: colors.iconBtnText }]}>
            {"\u25C9"}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 56, // spec: 56px
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLight: {
    backgroundColor: "#f8f8f8", // --surface-sidebar light
    borderBottomColor: "rgba(0,0,0,0.08)", // --line light
  },
  headerDark: {
    backgroundColor: "#1a1a1a", // --surface-sidebar dark
    borderBottomColor: "rgba(255,255,255,0.08)", // --line dark
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  iconBtnLight: {
    backgroundColor: "#f1f5f9",
  },
  iconBtnDark: {
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  iconText: { fontSize: 16 },
  iconTextLight: { color: "#0f172a" },
  iconTextDark: { color: "#f5f5f5" },
  textBtn: { width: "auto", paddingHorizontal: 12 },
  textBtnLabel: { fontSize: 13, fontWeight: "700" },
  textBtnLabelLight: { color: "#0f172a" },
  textBtnLabelDark: { color: "#f5f5f5" },
  headerTitle: { fontSize: 16, fontWeight: "600", maxWidth: "72%" },
  headerTitleLight: { color: "#0f172a" },
  headerTitleDark: { color: "#f5f5f5" },
});
