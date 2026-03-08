import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTheme } from "@/hooks/useTheme";
import type { AttachmentMeta } from "yua-shared/chat/attachment-types";
import { formatFileSize } from "@/lib/api/upload.api";

type Props = {
  attachments: AttachmentMeta[];
  onRemove?: (id: string) => void;
};

function resolveUrl(att: AttachmentMeta) {
  return att.previewUrl ?? att.fileUrl ?? att.url ?? "";
}

function getFileExtension(fileName?: string): string {
  if (!fileName) return "";
  const parts = fileName.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : "";
}

function getFileIconColor(mimeType?: string, fileName?: string): string {
  const mime = (mimeType ?? "").toLowerCase();
  const ext = (fileName ?? "").toLowerCase();

  if (mime.startsWith("image/")) return "#3b82f6"; // blue
  if (
    mime.includes("spreadsheet") ||
    mime.includes("csv") ||
    ext.endsWith(".csv") ||
    ext.endsWith(".xlsx") ||
    ext.endsWith(".xls")
  )
    return "#22c55e"; // green
  if (
    mime.includes("zip") ||
    mime.includes("rar") ||
    mime.includes("tar") ||
    mime.includes("7z") ||
    mime.includes("gzip") ||
    ext.endsWith(".zip") ||
    ext.endsWith(".rar") ||
    ext.endsWith(".7z")
  )
    return "#f59e0b"; // amber
  if (
    mime.includes("javascript") ||
    mime.includes("typescript") ||
    mime.includes("python") ||
    mime.includes("java") ||
    mime.includes("json") ||
    ext.endsWith(".ts") ||
    ext.endsWith(".tsx") ||
    ext.endsWith(".js") ||
    ext.endsWith(".jsx") ||
    ext.endsWith(".py")
  )
    return "#8b5cf6"; // violet
  return "#6b7280"; // gray default
}

export default function AttachmentPreviewRow({ attachments, onRemove }: Props) {
  const { colors } = useTheme();

  if (!attachments.length) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
    >
      {attachments.map((att) => {
        const uri = resolveUrl(att);
        const isImage = att.kind === "image" && uri;
        const ext = getFileExtension(att.fileName);
        const iconColor = getFileIconColor(att.mimeType, att.fileName);

        return (
          <View
            key={att.id}
            style={[
              styles.card,
              { borderColor: colors.attachCardBorder, backgroundColor: colors.attachCardBg },
            ]}
          >
            {isImage ? (
              <Image
                source={{ uri }}
                style={styles.image}
                onError={() => {
                  // Silently handle broken images
                }}
              />
            ) : (
              <View style={[styles.fileCard, { backgroundColor: colors.attachFileBg }]}>
                <View style={[styles.fileIconCircle, { backgroundColor: iconColor + "18" }]}>
                  <Text style={[styles.fileIconText, { color: iconColor }]}>
                    {ext || "FILE"}
                  </Text>
                </View>
                <Text
                  style={[styles.fileName, { color: colors.fileNameColor }]}
                  numberOfLines={1}
                  ellipsizeMode="middle"
                >
                  {att.fileName ?? "File"}
                </Text>
                {att.sizeBytes != null && att.sizeBytes > 0 ? (
                  <Text style={[styles.fileSize, { color: colors.fileSizeColor }]}>
                    {formatFileSize(att.sizeBytes)}
                  </Text>
                ) : null}
              </View>
            )}
            {onRemove ? (
              <Pressable
                style={styles.removeBtn}
                onPress={() => onRemove(att.id)}
                hitSlop={8}
              >
                <Text style={styles.removeText}>×</Text>
              </Pressable>
            ) : null}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    flexDirection: "row",
    gap: 10,
    paddingRight: 4,
  },
  card: {
    position: "relative",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.04)",
    overflow: "hidden",
  },
  cardDark: {
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  image: {
    width: 72,
    height: 72,
    borderRadius: 10,
    backgroundColor: "#f1f5f9",
    margin: 4,
  },
  fileCard: {
    width: 72,
    height: 72,
    borderRadius: 10,
    backgroundColor: "#f8fafc",
    alignItems: "center",
    justifyContent: "center",
    padding: 6,
    gap: 3,
    margin: 4,
  },
  fileCardDark: {
    backgroundColor: "#2a2a2a",
  },
  fileIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  fileIconText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  fileName: {
    fontSize: 10,
    color: "#475569",
    maxWidth: 60,
  },
  fileNameDark: {
    color: "#d1d5db",
  },
  fileSize: {
    fontSize: 9,
    color: "#94a3b8",
  },
  fileSizeDark: {
    color: "#6b7280",
  },
  removeBtn: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  removeText: {
    color: "#ffffff",
    fontSize: 12,
    lineHeight: 14,
    fontWeight: "600",
  },
});
