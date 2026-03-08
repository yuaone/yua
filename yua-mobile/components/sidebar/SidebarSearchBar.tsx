import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { useTheme } from "@/hooks/useTheme";

interface SidebarSearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

export default function SidebarSearchBar({
  value,
  onChangeText,
  placeholder = "Search threads...",
}: SidebarSearchBarProps) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.searchBarBg,
          borderColor: colors.searchBarBorder,
        },
      ]}
    >
      <View style={styles.iconWrap}>
        <View
          style={[
            styles.magnifyCircle,
            { borderColor: colors.textMuted },
          ]}
        />
        <View
          style={[
            styles.magnifyHandle,
            { backgroundColor: colors.textMuted },
          ]}
        />
      </View>

      <TextInput
        style={[styles.input, { color: colors.textPrimary }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
      />

      {value.length > 0 && (
        <Pressable
          style={({ pressed }) => [
            styles.clearBtn,
            pressed && { opacity: 0.5 },
          ]}
          onPress={() => onChangeText("")}
          hitSlop={8}
        >
          <View style={[styles.clearCircle, { backgroundColor: colors.textMuted }]}>
            <View style={[styles.clearX1, { backgroundColor: colors.searchBarBg }]} />
            <View style={[styles.clearX2, { backgroundColor: colors.searchBarBg }]} />
          </View>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 36,
    borderWidth: 1,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 10,
  },
  iconWrap: {
    width: 12,
    height: 12,
    marginRight: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  magnifyCircle: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    position: "absolute",
    top: 0,
    left: 0,
  },
  magnifyHandle: {
    width: 4,
    height: 1.5,
    borderRadius: 1,
    position: "absolute",
    bottom: 0.5,
    right: 0,
    transform: [{ rotate: "45deg" }],
  },
  input: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 0,
  },
  clearBtn: {
    marginLeft: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  clearCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  clearX1: {
    position: "absolute",
    width: 8,
    height: 1.5,
    borderRadius: 1,
    transform: [{ rotate: "45deg" }],
  },
  clearX2: {
    position: "absolute",
    width: 8,
    height: 1.5,
    borderRadius: 1,
    transform: [{ rotate: "-45deg" }],
  },
});
