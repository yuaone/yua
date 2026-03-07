import { StyleSheet, Text, View } from "react-native";
import type { SuggestionItem, SuggestionPayload } from "yua-shared/types/suggestion";
import type { SuggestionAffordance, SuggestionContext } from "@/lib/suggestion/suggestionTypes";
import { pickCopy } from "@/lib/suggestion/pickCopy";

type Props = {
  payload: SuggestionPayload;
  context?: SuggestionContext;
};

export default function SuggestionBlock({ payload, context = "GENERAL" }: Props) {
  if (!payload?.items?.length) return null;
  const seen = new Set<string>();
  return (
    <View style={styles.wrap}>
      {payload.items.map((item: SuggestionItem) => {
        const affordance = item.label as SuggestionAffordance;
        if (seen.has(affordance)) return null;
        seen.add(affordance);
        const text = pickCopy(affordance, context);
        if (!text) return null;
        return (
          <Text key={item.id} style={styles.text}>
            {text}
          </Text>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 8,
    gap: 6,
  },
  text: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 18,
  },
});
