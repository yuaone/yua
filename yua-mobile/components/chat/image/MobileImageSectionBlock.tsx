import { useCallback, useEffect, useState } from "react";
import {
  Image,
  Linking,
  Modal,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as Clipboard from "expo-clipboard";

import { useMobileAuth } from "@/contexts/MobileAuthContext";
import { useTheme } from "@/hooks/useTheme";
import { useAdaptive } from "@/constants/adaptive";
import { MobileTokens } from "@/constants/tokens";

type Asset = {
  id: number;
  asset_type: "COMPOSITE_IMAGE" | "FACTUAL_VISUALIZATION" | "SEMANTIC_IMAGE";
  uri: string;
};

type Props = {
  sectionId: number;
  loading?: boolean;
};

type ImageLoadState = "loading" | "loaded" | "error";

export default function MobileImageSectionBlock({
  sectionId,
  loading = false,
}: Props) {
  const { authFetch } = useMobileAuth();
  const { colors } = useTheme();
  const { imageGridColumns, isTablet } = useAdaptive();
  const isPlaceholder = sectionId <= 0;

  const [assets, setAssets] = useState<Asset[] | null>(null);
  const [fetched, setFetched] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [imageStates, setImageStates] = useState<Record<number, ImageLoadState>>({});
  const [copied, setCopied] = useState(false);
  const [lightboxUri, setLightboxUri] = useState<string | null>(null);

  useEffect(() => {
    setFetched(false);
  }, [sectionId]);

  useEffect(() => {
    if (isPlaceholder) return;
    setFetched(false);
    setAssets(null);
    setImageStates({});
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

  const handleImageLoad = useCallback((id: number) => {
    setImageStates((prev) => ({ ...prev, [id]: "loaded" }));
  }, []);

  const handleImageError = useCallback((id: number) => {
    setImageStates((prev) => ({ ...prev, [id]: "error" }));
  }, []);

  if (sectionId <= 0) return null;

  const hasAssets = Array.isArray(assets) && assets.length > 0;
  const showSkeleton = fetching || loading;

  const pickLatest = (type: Asset["asset_type"]) =>
    (assets ?? [])
      .filter((a) => a.asset_type === type)
      .sort((a, b) => b.id - a.id)[0];

  const primary = hasAssets
    ? pickLatest("COMPOSITE_IMAGE") ??
      pickLatest("FACTUAL_VISUALIZATION") ??
      pickLatest("SEMANTIC_IMAGE")
    : undefined;

  const allImages = hasAssets
    ? (assets ?? []).filter((a) => a.uri).sort((a, b) => b.id - a.id)
    : [];

  const isSingle = allImages.length === 1;
  const singleMaxHeight = isTablet ? 400 : 300;

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

  const gap = MobileTokens.space.sm;
  const columns = imageGridColumns;

  if (!hasAssets && !showSkeleton && fetched) {
    return (
      <View style={[styles.empty, { marginVertical: MobileTokens.space.md }]}>
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
          Image failed to load.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ marginVertical: MobileTokens.space.md }}>
      {/* Skeleton while fetching */}
      {showSkeleton && !hasAssets ? (
        <View
          style={[
            styles.placeholder,
            {
              backgroundColor: colors.wash,
              borderRadius: MobileTokens.radius.sm,
              height: singleMaxHeight,
            },
          ]}
        >
          <Text style={[styles.placeholderText, { color: colors.textMuted }]}>
            Loading...
          </Text>
        </View>
      ) : null}

      {/* Single image */}
      {hasAssets && isSingle ? (
        <SingleImage
          asset={allImages[0]}
          maxHeight={singleMaxHeight}
          loadState={imageStates[allImages[0].id] ?? "loading"}
          onLoad={handleImageLoad}
          onError={handleImageError}
          onPress={setLightboxUri}
          colors={colors}
        />
      ) : null}

      {/* Grid of multiple images */}
      {hasAssets && !isSingle ? (
        <View style={[styles.grid, { gap }]}>
          {allImages.map((asset) => (
            <GridImage
              key={asset.id}
              asset={asset}
              columns={columns}
              gap={gap}
              loadState={imageStates[asset.id] ?? "loading"}
              onLoad={handleImageLoad}
              onError={handleImageError}
              onPress={setLightboxUri}
              colors={colors}
            />
          ))}
        </View>
      ) : null}

      {/* Actions */}
      {primary ? (
        <View style={styles.actions}>
          <Pressable
            onPress={() => primary.uri && Linking.openURL(primary.uri)}
            disabled={!primary.uri}
          >
            <Text style={[styles.actionText, { color: colors.linkColor }]}>
              Open
            </Text>
          </Pressable>
          <Pressable onPress={handleCopy} disabled={!primary.uri}>
            <Text
              style={[
                styles.actionText,
                { color: copied ? colors.statusOk : colors.linkColor },
              ]}
            >
              {copied ? "Copied" : "Copy"}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {/* Lightbox Modal */}
      <Modal
        visible={lightboxUri !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setLightboxUri(null)}
        statusBarTranslucent
      >
        <StatusBar hidden={lightboxUri !== null} />
        <Pressable
          style={styles.lightboxBackdrop}
          onPress={() => setLightboxUri(null)}
        >
          <Image
            source={{ uri: lightboxUri ?? undefined }}
            style={styles.lightboxImage}
            resizeMode="contain"
          />
          <Pressable
            style={styles.lightboxClose}
            onPress={() => setLightboxUri(null)}
            hitSlop={8}
          >
            <Text style={styles.lightboxCloseText}>{"\u00D7"}</Text>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

/* -------------------------------------------------------
   Single Image Sub-component
------------------------------------------------------- */

function SingleImage({
  asset,
  maxHeight,
  loadState,
  onLoad,
  onError,
  onPress,
  colors,
}: {
  asset: Asset;
  maxHeight: number;
  loadState: ImageLoadState;
  onLoad: (id: number) => void;
  onError: (id: number) => void;
  onPress: (uri: string) => void;
  colors: Record<string, string>;
}) {
  if (loadState === "error") {
    return (
      <View
        style={[
          styles.errorCard,
          {
            backgroundColor: colors.wash,
            borderRadius: MobileTokens.radius.sm,
            height: maxHeight,
          },
        ]}
      >
        <Text style={[styles.errorText, { color: colors.textMuted }]}>
          Failed to load image
        </Text>
      </View>
    );
  }

  return (
    <Pressable onPress={() => onPress(asset.uri)}>
      <View
        style={{
          width: "100%",
          maxHeight,
          borderRadius: MobileTokens.radius.sm,
          overflow: "hidden",
        }}
      >
        {loadState === "loading" ? (
          <View
            style={[
              styles.placeholder,
              {
                backgroundColor: colors.wash,
                borderRadius: MobileTokens.radius.sm,
                height: maxHeight,
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                zIndex: 1,
              },
            ]}
          >
            <Text style={[styles.placeholderText, { color: colors.textMuted }]}>
              Loading...
            </Text>
          </View>
        ) : null}
        <Image
          source={{ uri: asset.uri }}
          style={{ width: "100%", height: maxHeight }}
          resizeMode="contain"
          onLoad={() => onLoad(asset.id)}
          onError={() => onError(asset.id)}
        />
      </View>
    </Pressable>
  );
}

/* -------------------------------------------------------
   Grid Image Sub-component
------------------------------------------------------- */

function GridImage({
  asset,
  columns,
  gap,
  loadState,
  onLoad,
  onError,
  onPress,
  colors,
}: {
  asset: Asset;
  columns: number;
  gap: number;
  loadState: ImageLoadState;
  onLoad: (id: number) => void;
  onError: (id: number) => void;
  onPress: (uri: string) => void;
  colors: Record<string, string>;
}) {
  // Calculate percentage-based width accounting for gaps
  // For N columns with (N-1) gaps: each item width = (100% - (N-1)*gap) / N
  // We use a wrapper with flexBasis to approximate this
  const basisPercent = 100 / columns;

  if (loadState === "error") {
    return (
      <View
        style={{
          flexBasis: `${basisPercent}%`,
          flexShrink: 1,
          aspectRatio: 4 / 3,
          backgroundColor: colors.wash,
          borderRadius: MobileTokens.radius.sm,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={[styles.errorText, { color: colors.textMuted }]}>
          Failed to load
        </Text>
      </View>
    );
  }

  return (
    <Pressable
      onPress={() => onPress(asset.uri)}
      style={{
        flexBasis: `${basisPercent}%`,
        flexShrink: 1,
        flexGrow: 0,
      }}
    >
      <View
        style={{
          aspectRatio: 4 / 3,
          borderRadius: MobileTokens.radius.sm,
          overflow: "hidden",
          backgroundColor: colors.wash,
        }}
      >
        {loadState === "loading" ? (
          <View style={[styles.gridPlaceholder]}>
            <Text style={[styles.placeholderText, { color: colors.textMuted }]}>
              Loading...
            </Text>
          </View>
        ) : null}
        <Image
          source={{ uri: asset.uri }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          onLoad={() => onLoad(asset.id)}
          onError={() => onError(asset.id)}
        />
      </View>
    </Pressable>
  );
}

/* -------------------------------------------------------
   Styles
------------------------------------------------------- */

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  placeholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: {
    fontSize: MobileTokens.font.xs,
  },
  gridPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  errorCard: {
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    fontSize: MobileTokens.font.xs,
  },
  actions: {
    marginTop: MobileTokens.space.sm,
    flexDirection: "row",
    gap: MobileTokens.space.md,
  },
  actionText: {
    fontSize: MobileTokens.font.sm,
  },
  empty: {
    alignItems: "center",
  },
  emptyText: {
    fontSize: MobileTokens.font.xs,
  },
  lightboxBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    alignItems: "center",
    justifyContent: "center",
  },
  lightboxImage: {
    width: "100%",
    height: "100%",
  },
  lightboxClose: {
    position: "absolute",
    top: 48,
    right: 16,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  lightboxCloseText: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "600",
  },
});
