import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

type ProjectOverviewComposeProps = {
  onSubmit: (value: string) => Promise<void>;
};

export default function ProjectOverviewCompose({ onSubmit }: ProjectOverviewComposeProps) {
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      await onSubmit(value);
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
        style={styles.input}
        placeholder="프로젝트에 첫 질문을 입력하세요"
        multiline
      />
      <Pressable style={[styles.button, loading ? styles.buttonDisabled : null]} onPress={submit}>
        <Text style={styles.buttonText}>{loading ? "Creating..." : "Create Thread"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  input: {
    minHeight: 80,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#0f172a",
    backgroundColor: "#fff",
  },
  button: {
    height: 42,
    borderRadius: 12,
    backgroundColor: "#0f172a",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 14 },
});
