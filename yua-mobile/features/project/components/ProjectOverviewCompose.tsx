import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { useTheme } from "@/hooks/useTheme";

type ProjectOverviewComposeProps = {
  onSubmit: (value: string) => Promise<void>;
};

export default function ProjectOverviewCompose({ onSubmit }: ProjectOverviewComposeProps) {
  const { colors } = useTheme();
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const trimmed = value.trim();
    if (!trimmed || loading) return;
    setLoading(true);
    try {
      await onSubmit(trimmed);
      setValue("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <TextInput
        value={value}
        onChangeText={setValue}
        style={[
          styles.input,
          {
            borderColor: colors.inputBorder,
            color: colors.inputText,
            backgroundColor: colors.inputShellBg,
          },
        ]}
        placeholder={"\uD504\uB85C\uC81D\uD2B8\uC5D0 \uCCAB \uC9C8\uBB38\uC744 \uC785\uB825\uD558\uC138\uC694"}
        placeholderTextColor={colors.inputPlaceholder}
        multiline
      />
      <Pressable
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: colors.buttonBg },
          loading && styles.buttonDisabled,
          pressed && { opacity: 0.85 },
        ]}
        onPress={submit}
        disabled={loading}
      >
        <Text style={[styles.buttonText, { color: colors.buttonText }]}>
          {loading ? "\uC0DD\uC131 \uC911..." : "\uC0C8 \uB300\uD654 \uC2DC\uC791"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  input: {
    minHeight: 80,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  button: {
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { fontWeight: "600", fontSize: 14 },
});
