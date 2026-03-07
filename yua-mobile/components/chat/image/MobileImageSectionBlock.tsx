"use client";

import { useEffect, useState } from "react";
import { Image, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import * as Clipboard from "expo-clipboard";

import { useMobileAuth } from "@/contexts/MobileAuthContext";

type Asset = {
  id: number;
  asset_type: "COMPOSITE_IMAGE" | "FACTUAL_VISUALIZATION" | "SEMANTIC_IMAGE";
  uri: string;
};

type Props = {
  sectionId: number;
  loading?: boolean;
};

export default function MobileImageSectionBlock({ sectionId, loading = false }: Props) {
  const { authFetch } = useMobileAuth();
  const isPlaceholder = sectionId <= 0;

  const [assets, setAssets] = useState<Asset[] | null>(null);
  const [fetched, setFetched] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setFetched(false);
  }, [sectionId]);

  useEffect(() => {
    if (isPlaceholder) return;
    setFetched(false);
    setAssets(null);
    setImageLoaded(false);
  }, [isPlaceholder, sectionId]);

  useEffect(() => {
    if (isPlaceholder) return;
    if (fetched) return;
    if (!Number.isFinite(sectionId) || sectionId <= 0) return;
    if (!authFetch) return;

    let alive = true;
    setFetching(true);
    authFetch(`/api/sections/${sectionId}/assets`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((payload) => {
        if (!alive) return;
        if (payload?.ok && Array.isArray(payload.assets)) {
          setAssets(payload.assets);
        } else {
          setAssets([]);
        }
        setFetched(true);
        setFetching(false);
      })
      .catch((err) => {
        console.error("[MobileImageSectionBlock][FETCH_ERROR]", err);
        if (alive) {
          setAssets([]);
          setFetched(true);
          setFetching(false);
        }
      });

    return () => {
      alive = false;
    };
  }, [authFetch, fetched, isPlaceholder, sectionId]);

  if (sectionId <= 0) return null;

  const hasAssets = Array.isArray(assets) && assets.length > 0;
  const showSkeleton = !imageLoaded || fetching || loading;

  const pickLatest = (type: Asset["asset_type"]) =>
    (assets ?? []).filter((a) => a.asset_type === type).sort((a, b) => b.id - a.id)[0];

  const primary = hasAssets
    ? pickLatest("COMPOSITE_IMAGE") ?? pickLatest("FACTUAL_VISUALIZATION") ?? pickLatest("SEMANTIC_IMAGE")
    : undefined;

  const handleCopy = async () => {
    if (!primary?.uri) return;
    try {
      await Clipboard.setStringAsync(primary.uri);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  };

  if (!primary && !showSkeleton) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Image failed to load.</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.card}>
        {primary ? (
          <Image
            source={{ uri: primary.uri }}
            style={styles.image}
            resizeMode="contain"
            onLoad={() => setImageLoaded(true)}
          />
        ) : null}

        {showSkeleton ? (
          <View style={styles.skeleton}>
            <Text style={styles.skeletonText}>Loading…</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.actions}>
        <Pressable onPress={() => primary?.uri && Linking.openURL(primary.uri)} disabled={!primary?.uri}>
          <Text style={styles.actionText}>Open</Text>
        </Pressable>
        <Pressable onPress={handleCopy} disabled={!primary?.uri}>
          <Text style={[styles.actionText, copied ? styles.actionActive : null]}>
            {copied ? "Copied" : "Copy"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginVertical: 12,
  },
  card: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 16,
    backgroundColor: "#f8fafc",
    overflow: "hidden",
    aspectRatio: 1,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  skeleton: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
  },
  skeletonText: {
    color: "#94a3b8",
    fontSize: 12,
  },
  actions: {
    marginTop: 8,
    flexDirection: "row",
    gap: 12,
  },
  actionText: {
    fontSize: 13,
    color: "#2563eb",
  },
  actionActive: {
    color: "#16a34a",
  },
  empty: {
    marginVertical: 12,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 12,
    color: "#94a3b8",
  },
});
