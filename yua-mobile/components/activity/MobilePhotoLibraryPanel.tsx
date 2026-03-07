import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import type { MobilePhotoAsset } from "@/types/assets";

type MobilePhotoLibraryPanelProps = {
  assets: MobilePhotoAsset[];
};

export default function MobilePhotoLibraryPanel({ assets }: MobilePhotoLibraryPanelProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>사진보관함</Text>
      <Text style={styles.subtitle}>/api/studio/images(scope=user) 실자산 목록</Text>
      <ScrollView contentContainerStyle={styles.list}>
        {assets.length === 0 ? (
          <Text style={styles.empty}>저장된 이미지가 없습니다.</Text>
        ) : (
          assets.map((asset) => (
            <Pressable key={asset.id} style={styles.item}>
              <Text style={styles.itemTitle}>Asset #{asset.id}</Text>
              <Text style={styles.meta}>Section {asset.sectionId} · {asset.assetType}</Text>
              <Text numberOfLines={2} style={styles.itemBody}>
                {asset.uri}
              </Text>
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  title: { fontSize: 16, fontWeight: "700", color: "#0f172a" },
  subtitle: { fontSize: 12, color: "#64748b" },
  list: { gap: 8, paddingBottom: 12 },
  item: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    padding: 10,
    backgroundColor: "#fff",
  },
  itemTitle: { fontSize: 13, fontWeight: "600", color: "#0f172a", marginBottom: 4 },
  meta: { fontSize: 11, color: "#64748b", marginBottom: 4 },
  itemBody: { fontSize: 12, color: "#334155" },
  empty: { fontSize: 13, color: "#64748b" },
});
