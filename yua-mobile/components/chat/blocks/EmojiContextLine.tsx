import { StyleSheet, Text, View } from "react-native";
import type { ThoughtStage } from "@/components/common/thoughtStage";
import { emojiMap } from "@/components/common/thoughtStage";
import { emojiVariants } from "@/lib/thoughtStageEmojiVariants";

type Props = {
  stage?: ThoughtStage;
  persona?: "DEFAULT" | "KID";
  confidence?: number;
  seed?: string;
  className?: string;
};

function hashToInt(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export default function EmojiContextLine({
  stage,
  persona = "DEFAULT",
  confidence,
  seed,
}: Props) {
  if (!stage) {
    return (
      <View style={styles.empty}>
        <Text style={styles.text}>💭</Text>
      </View>
    );
  }

  const baseEmoji = emojiMap[stage];
  const variants = emojiVariants[stage] ?? [baseEmoji];
  if (persona === "KID") {
    return (
      <View style={styles.empty}>
        <Text style={styles.text}>{variants[0]}</Text>
      </View>
    );
  }

  const c = confidence === undefined ? 0.6 : Math.max(0, Math.min(1, confidence));
  const softness = c < 0.4 ? 0 : c < 0.75 ? 1 : 2;
  const key = seed ? `${stage}:${seed}` : `${stage}`;
  const idx = variants.length === 1 ? 0 : (hashToInt(key) + softness) % variants.length;
  const emoji = variants[idx] ?? baseEmoji;
  return (
    <View style={styles.empty}>
      <Text style={styles.text}>{emoji}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    marginTop: 10,
    alignItems: "center",
  },
  text: {
    fontSize: 14,
  },
});
