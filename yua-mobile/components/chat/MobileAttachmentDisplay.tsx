import { useState } from "react";
import {
  Dimensions,
  Image,
  Modal,
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
  /** "user" renders above message, "assistant" renders inline */
  placement?: "user" | "assistant";
};

const SCREEN_WIDTH = Dimensions.get("window").width;

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

  if (mime.startsWith("image/")) return "#3b82f6";
  if (
    mime.includes("spreadsheet") ||
    mime.includes("csv") ||
    ext.endsWith(".csv") ||
    ext.endsWith(".xlsx") ||
    ext.endsWith(".xls")
  )
    return "#22c55e";
  if (
    mime.includes("zip") ||
    mime.includes("rar") ||
    mime.includes("tar") ||
    ext.endsWith(".zip") ||
    ext.endsWith(".rar")
  )
    return "#f59e0b";
  if (
    mime.includes("javascript") ||
    mime.includes("typescript") ||
    mime.includes("python") ||
    ext.endsWith(".ts") ||
    ext.endsWith(".js") ||
    ext.endsWith(".py")
  )
    return "#8b5cf6";
  return "#6b7280";
}

function FullscreenImageModal({
  uri,
  visible,
  onClose,
}: {
  uri: string;
  visible: boolean;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={fsStyles.backdrop} onPress={onClose}>
        <Pressable style={fsStyles.imageWrap} onPress={() => {}}>
          <Image
            source={{ uri }}
            style={fsStyles.image}
            resizeMode="contain"
          />
        </Pressable>
        <Pressable style={fsStyles.closeBtn} onPress={onClose}>
          <Text style={fsStyles.closeBtnText}>×</Text>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const fsStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  imageWrap: {
    width: SCREEN_WIDTH - 32,
    height: SCREEN_WIDTH - 32,
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  closeBtn: {
    position: "absolute",
    top: 60,
    right: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtnText: {
    color: "#ffffff",
    fontSize: 22,
    lineHeight: 24,
  },
});

function ImageAttachment({ att }: { att: AttachmentMeta }) {
  const [fullscreen, setFullscreen] = useState(false);
  const [imgError, setImgError] = useState(false);
  const uri = resolveUrl(att);

  if (!uri || imgError) {
    return (
      <View style={styles.imagePlaceholder}>
        <Text style={styles.imagePlaceholderText}>Image unavailable</Text>
      </View>
    );
  }

  return (
    <>
      <Pressable onPress={() => setFullscreen(true)}>
        <Image
          source={{ uri }}
          style={styles.imageDisplay}
          resizeMode="cover"
          onError={() => setImgError(true)}
        />
      </Pressable>
      <FullscreenImageModal
        uri={uri}
        visible={fullscreen}
        onClose={() => setFullscreen(false)}
      />
    </>
  );
}

function FileAttachment({ att }: { att: AttachmentMeta }) {
  const { colors } = useTheme();
  const ext = getFileExtension(att.fileName);
  const iconColor = getFileIconColor(att.mimeType, att.fileName);

  return (
    <View style={[styles.fileCard, { borderColor: colors.attachCardBorder, backgroundColor: colors.attachCardBg }]}>
      <View style={[styles.fileIconCircle, { backgroundColor: iconColor + "18" }]}>
        <Text style={[styles.fileIconText, { color: iconColor }]}>
          {ext || "FILE"}
        </Text>
      </View>
      <View style={styles.fileInfo}>
        <Text
          style={[styles.fileFileName, { color: colors.fileNameColor }]}
          numberOfLines={1}
          ellipsizeMode="middle"
        >
          {att.fileName ?? "File"}
        </Text>
        <View style={styles.fileMeta}>
          {att.sizeBytes != null && att.sizeBytes > 0 ? (
            <Text style={[styles.fileSize, { color: colors.fileSizeColor }]}>
              {formatFileSize(att.sizeBytes)}
            </Text>
          ) : null}
          {ext ? (
            <View style={[styles.extBadge, { backgroundColor: iconColor + "18" }]}>
              <Text style={[styles.extBadgeText, { color: iconColor }]}>.{ext}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

export default function MobileAttachmentDisplay({
  attachments,
  placement = "user",
}: Props) {
  if (!attachments.length) return null;

  const images = attachments.filter(
    (a) => a.kind === "image" && resolveUrl(a)
  );
  const files = attachments.filter(
    (a) => a.kind !== "image" || !resolveUrl(a)
  );

  return (
    <View style={[styles.root, placement === "user" && styles.rootUser]}>
      {/* Images */}
      {images.length > 0 && (
        <ScrollView
          horizontal={images.length > 1}
          showsHorizontalScrollIndicator={false}
          style={styles.imageScroll}
          contentContainerStyle={styles.imageScrollContent}
        >
          {images.map((att) => (
            <ImageAttachment key={att.id} att={att} />
          ))}
        </ScrollView>
      )}

      {/* Files */}
      {files.length > 0 && (
        <View style={styles.fileList}>
          {files.map((att) => (
            <FileAttachment key={att.id} att={att} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 8,
    marginBottom: 6,
  },
  rootUser: {
    alignItems: "flex-end",
  },
  imageScroll: {
    flexGrow: 0,
  },
  imageScrollContent: {
    gap: 8,
  },
  imageDisplay: {
    width: Math.min(SCREEN_WIDTH * 0.65, 280),
    height: Math.min(SCREEN_WIDTH * 0.65, 280),
    borderRadius: 12,
    backgroundColor: "#f1f5f9",
  },
  imagePlaceholder: {
    width: 200,
    height: 120,
    borderRadius: 12,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  imagePlaceholderText: {
    fontSize: 12,
    color: "#94a3b8",
  },
  fileList: {
    gap: 6,
  },
  fileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.04)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    maxWidth: 280,
  },
  fileCardDark: {
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  fileIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  fileIconText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  fileInfo: {
    flex: 1,
    gap: 3,
  },
  fileFileName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1e293b",
  },
  fileFileNameDark: {
    color: "#e2e8f0",
  },
  fileMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  fileSize: {
    fontSize: 11,
    color: "#94a3b8",
  },
  fileSizeDark: {
    color: "#6b7280",
  },
  extBadge: {
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  extBadgeText: {
    fontSize: 9,
    fontWeight: "700",
  },
});
