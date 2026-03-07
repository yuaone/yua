import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { useTheme } from "@/hooks/useTheme";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";

import BottomSlidePanel from "@/components/panel/BottomSlidePanel";
import { useMobileThinkingProfile } from "@/hooks/useMobileThinkingProfile";
import type { ThinkingProfile } from "yua-shared/types/thinkingProfile";
import {
  MAX_FILE_SIZE_BYTES,
  WARN_FILE_SIZE_BYTES,
  resolveAttachmentKind,
  type PendingAttachment,
} from "@/lib/api/upload.api";

type PlusAction =
  | "camera"
  | "gallery"
  | "file"
  | "photoLibrary"
  | "mode"
  | "search"
  | "recent";

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelect: (action: PlusAction) => void;
  onAttachmentsPicked?: (attachments: PendingAttachment[]) => void;
};

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

const ACTIONS: { id: PlusAction; label: string; hint: string; icon: string }[] = [
  { id: "camera", label: "촬영", hint: "카메라로 촬영", icon: "📷" },
  { id: "gallery", label: "갤러리", hint: "사진 선택", icon: "🖼️" },
  { id: "file", label: "파일", hint: "문서 업로드", icon: "📄" },
  { id: "mode", label: "모드 변경", hint: "Fast/Normal/Deep", icon: "⚡" },
  { id: "photoLibrary", label: "사진보관함", hint: "보관함 열기", icon: "📚" },
  { id: "search", label: "검색", hint: "검색 모드", icon: "🔍" },
];

export default function MobilePlusPanel({
  visible,
  onClose,
  onSelect,
  onAttachmentsPicked,
}: Props) {
  const { width } = useWindowDimensions();
  const { colors } = useTheme();
  const columns = width >= 768 ? 3 : 2;
  const { profile, enable } = useMobileThinkingProfile();
  const [view, setView] = useState<"root" | "profile">("root");

  const profiles = useMemo(
    () =>
      [
        { key: "FAST", label: "Fast", desc: "Minimal processing, quick output" },
        { key: "NORMAL", label: "Normal", desc: "Balanced reasoning and speed" },
        { key: "DEEP", label: "Deep", desc: "Extended reasoning with analysis" },
      ] as { key: ThinkingProfile; label: string; desc: string }[],
    []
  );

  const pickFromCamera = useCallback(async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("권한 필요", "카메라 권한을 허용해주세요.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsEditing: false,
    });

    if (result.canceled || !result.assets?.length) return;

    const picked: PendingAttachment[] = result.assets.map((asset) => ({
      id: generateId(),
      uri: asset.uri,
      fileName: asset.fileName ?? `photo_${Date.now()}.jpg`,
      mimeType: asset.mimeType ?? "image/jpeg",
      sizeBytes: asset.fileSize ?? 0,
      kind: "image" as const,
    }));

    onAttachmentsPicked?.(picked);
    onClose();
  }, [onAttachmentsPicked, onClose]);

  const pickFromGallery = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("권한 필요", "갤러리 접근 권한을 허용해주세요.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      quality: 0.8,
      allowsMultipleSelection: true,
      selectionLimit: 10,
    });

    if (result.canceled || !result.assets?.length) return;

    const picked: PendingAttachment[] = [];
    for (const asset of result.assets) {
      const sizeBytes = asset.fileSize ?? 0;

      if (sizeBytes > MAX_FILE_SIZE_BYTES) {
        Alert.alert(
          "파일 크기 초과",
          `${asset.fileName ?? "파일"}은(는) 25MB를 초과하여 첨부할 수 없습니다.`
        );
        continue;
      }

      if (sizeBytes > WARN_FILE_SIZE_BYTES) {
        Alert.alert(
          "대용량 파일",
          `${asset.fileName ?? "파일"}은(는) 10MB 이상입니다. 업로드 시간이 길어질 수 있습니다.`
        );
      }

      picked.push({
        id: generateId(),
        uri: asset.uri,
        fileName: asset.fileName ?? `media_${Date.now()}.jpg`,
        mimeType: asset.mimeType ?? "image/jpeg",
        sizeBytes,
        kind: resolveAttachmentKind(asset.mimeType ?? "image/jpeg"),
      });
    }

    if (picked.length > 0) {
      onAttachmentsPicked?.(picked);
    }
    onClose();
  }, [onAttachmentsPicked, onClose]);

  const pickFile = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.length) return;

      const picked: PendingAttachment[] = [];
      for (const asset of result.assets) {
        const sizeBytes = asset.size ?? 0;

        if (sizeBytes > MAX_FILE_SIZE_BYTES) {
          Alert.alert(
            "파일 크기 초과",
            `${asset.name}은(는) 25MB를 초과하여 첨부할 수 없습니다.`
          );
          continue;
        }

        if (sizeBytes > WARN_FILE_SIZE_BYTES) {
          Alert.alert(
            "대용량 파일",
            `${asset.name}은(는) 10MB 이상입니다. 업로드 시간이 길어질 수 있습니다.`
          );
        }

        picked.push({
          id: generateId(),
          uri: asset.uri,
          fileName: asset.name,
          mimeType: asset.mimeType ?? "application/octet-stream",
          sizeBytes,
          kind: resolveAttachmentKind(asset.mimeType ?? "application/octet-stream"),
        });
      }

      if (picked.length > 0) {
        onAttachmentsPicked?.(picked);
      }
      onClose();
    } catch (err) {
      console.warn("[FILE_PICK_ERROR]", err);
    }
  }, [onAttachmentsPicked, onClose]);

  const handleAction = useCallback(
    (actionId: PlusAction) => {
      switch (actionId) {
        case "camera":
          void pickFromCamera();
          return;
        case "gallery":
          void pickFromGallery();
          return;
        case "file":
          void pickFile();
          return;
        case "mode":
          setView("profile");
          return;
        default:
          onSelect(actionId);
          return;
      }
    },
    [pickFromCamera, pickFromGallery, pickFile, onSelect]
  );

  return (
    <BottomSlidePanel
      visible={visible}
      onClose={() => {
        setView("root");
        onClose();
      }}
      title={view === "profile" ? "모드" : "첨부"}
      renderWhenClosed={false}
    >
      {view === "profile" ? (
        <View style={styles.profileList}>
          <TouchableOpacity style={styles.backRow} onPress={() => setView("root")}>
            <Text style={[styles.backText, { color: colors.backText }]}>
              ← 뒤로
            </Text>
          </TouchableOpacity>
          {profiles.map((it) => {
            const active = it.key === profile;
            return (
              <TouchableOpacity
                key={it.key}
                style={[
                  styles.profileRow,
                  {
                    borderColor: active ? colors.profileRowActiveBorder : colors.profileRowBorder,
                    backgroundColor: active ? colors.profileRowActiveBg : colors.profileRowBg,
                  },
                ]}
                onPress={() => {
                  enable(it.key);
                  setView("root");
                  onClose();
                }}
              >
                <View style={styles.profileTextWrap}>
                  <Text style={[styles.profileTitle, { color: colors.plusCardTitle }]}>
                    {it.label}
                  </Text>
                  <Text style={[styles.profileDesc, { color: colors.plusCardHint }]}>
                    {it.desc}
                  </Text>
                </View>
                {active ? (
                  <Text style={[styles.profileCheck, { color: colors.plusCardTitle }]}>{"\u2713"}</Text>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>
      ) : (
        <View style={styles.grid} accessibilityRole="menu">
          {ACTIONS.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={[
                styles.card,
                {
                  borderColor: colors.plusCardBorder,
                  backgroundColor: colors.plusCardBg,
                  flexBasis: `${100 / columns}%`,
                },
              ]}
              onPress={() => handleAction(action.id)}
            >
              <Text style={styles.cardIcon}>{action.icon}</Text>
              <Text style={[styles.cardTitle, { color: colors.plusCardTitle }]}>
                {action.label}
              </Text>
              <Text style={[styles.cardHint, { color: colors.plusCardHint }]}>
                {action.hint}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </BottomSlidePanel>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  card: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 14,
    padding: 14,
    backgroundColor: "#f8f8f8",
    minWidth: 140,
  },
  cardDark: {
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "#1e1e1e",
  },
  cardIcon: {
    fontSize: 20,
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
  },
  cardHint: {
    marginTop: 6,
    fontSize: 12,
    color: "#64748b",
  },
  textDark: {
    color: "#f5f5f5",
  },
  textMutedDark: {
    color: "#6b7280",
  },
  profileList: {
    gap: 10,
  },
  backRow: {
    paddingVertical: 6,
  },
  backText: {
    fontSize: 13,
    color: "#475569",
  },
  backTextDark: {
    color: "#9ca3af",
  },
  profileRow: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 12,
    backgroundColor: "#ffffff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  profileRowDark: {
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "#1e1e1e",
  },
  profileRowActive: {
    borderColor: "#0f172a",
    backgroundColor: "#f8fafc",
  },
  profileRowActiveDark: {
    borderColor: "#f5f5f5",
    backgroundColor: "#2a2a2a",
  },
  profileTextWrap: {
    flex: 1,
  },
  profileTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
  },
  profileDesc: {
    marginTop: 4,
    fontSize: 12,
    color: "#64748b",
  },
  profileCheck: {
    fontSize: 16,
    color: "#0f172a",
  },
});
