import { useEffect, useMemo, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/hooks/useTheme";
import { MobileTokens } from "@/constants/tokens";
import { useAdaptive } from "@/constants/adaptive";

import MobileAttachmentDisplay from "@/components/chat/MobileAttachmentDisplay";
import MobileMarkdown from "@/components/common/MobileMarkdown";
import SuggestionBlock from "@/components/chat/blocks/SuggestionBlock";
import EmojiContextLine from "@/components/chat/blocks/EmojiContextLine";
import MobileImageSectionBlock from "@/components/chat/image/MobileImageSectionBlock";
import MobileStreamOverlay from "@/components/chat/MobileStreamOverlay";
import { analyzeAnswer } from "@/lib/answer/analyzeAnswer";
import { decideClose } from "@/lib/answer/decideClose";
import { closeCopyMap } from "@/lib/answer/closeCopy";
import { emojiMap } from "@/components/common/thoughtStage";
import { useMobileChatStore } from "@/store/useMobileChatStore";
import type {
  MobileChatMessage,
  MobileChatMessageMeta,
  MobileCompareTable,
} from "@/features/chat/model/chat-message.types";

type MobileAssistantMessageProps = {
  message: MobileChatMessage;
  onPressThink?: (message: MobileChatMessage) => void;
};

function renderCompareTable(table: MobileCompareTable): string {
  const header = `| 項目 | ${table.columns.map((c) => c.title).join(" | ")} |`;
  const sep = `| --- | ${table.columns.map(() => "---").join(" | ")} |`;
  const rows = table.rows.map(
    (row) =>
      `| ${row.label} | ${table.columns.map((c) => row.values[c.key] ?? "").join(" | ")} |`,
  );

  const body = [header, sep, ...rows].join("\n");
  return table.caption ? `**${table.caption}**\n\n${body}` : body;
}

function mergeFinalMetaForOverlay<T extends Record<string, unknown>>(
  frozen: T | undefined,
  live: T | undefined,
): T | undefined {
  if (!frozen) return live;
  if (!live) return frozen;
  return {
    ...frozen,
    drawerOpen: (live as Record<string, unknown>).drawerOpen ?? (frozen as Record<string, unknown>).drawerOpen,
    thinking: (live as Record<string, unknown>).thinking ?? (frozen as Record<string, unknown>).thinking,
  };
}

export default function MobileAssistantMessage({
  message,
  onPressThink,
}: MobileAssistantMessageProps) {
  const { colors, isDark } = useTheme();
  const { avatarSize } = useAdaptive();
  const finalized = Boolean(message.finalized);
  const metaRef = useRef<MobileChatMessageMeta | undefined>(message.meta);
  const messagesByThread = useMobileChatStore((s) => s.messagesByThread);

  useEffect(() => {
    if (!finalized) {
      metaRef.current = message.meta;
      return;
    }
    if (metaRef.current == null) metaRef.current = message.meta;
  }, [finalized, message.meta]);

  const stableMeta = finalized
    ? mergeFinalMetaForOverlay(
        metaRef.current ?? message.meta,
        message.meta,
      )
    : message.meta;

  const fallbackSystemStudio = useMemo(() => {
    const list = messagesByThread[message.threadId] ?? [];
    const idx = list.findIndex((m) => m.id === message.id);
    if (idx === -1) return undefined;
    for (let i = idx + 1; i < list.length; i += 1) {
      const candidate = list[i];
      if (candidate.role === "system" && candidate.meta?.studio)
        return candidate.meta.studio;
      if (candidate.role === "assistant") break;
    }
    return undefined;
  }, [message.id, message.threadId, messagesByThread]);

  const effectiveStudio = stableMeta?.studio ?? fallbackSystemStudio;
  const isImageAsset =
    effectiveStudio?.assetType === "IMAGE" ||
    effectiveStudio?.assetType === "SEMANTIC_IMAGE" ||
    effectiveStudio?.assetType === "FACTUAL_VISUALIZATION" ||
    effectiveStudio?.assetType === "COMPOSITE_IMAGE";

  const sectionIdRaw = effectiveStudio?.sectionId;
  const numericSectionId =
    typeof sectionIdRaw === "string"
      ? Number(sectionIdRaw)
      : typeof sectionIdRaw === "number"
        ? sectionIdRaw
        : NaN;
  const hasImageStudioSection =
    isImageAsset &&
    Number.isFinite(numericSectionId) &&
    numericSectionId > 0;
  const sectionId = hasImageStudioSection ? numericSectionId : -1;
  const isImageIntent = hasImageStudioSection;

  const trimmed = (
    typeof message.content === "string" ? message.content : ""
  ).trim();
  const analysis = useMemo(() => {
    if (!trimmed) return null;
    try {
      return analyzeAnswer(trimmed);
    } catch {
      return null;
    }
  }, [trimmed]);

  const closeSignal =
    stableMeta?.suggestion && analysis ? decideClose(analysis) : null;
  const footerSuggestion = finalized ? stableMeta?.suggestion : null;
  const closeText =
    finalized && closeSignal?.show
      ? closeCopyMap[closeSignal.intent]?.[closeSignal.confidence]?.[0]
      : null;

  const compareMarkdown = useMemo(() => {
    if (!stableMeta?.compareTable || !finalized) return null;
    return renderCompareTable(stableMeta.compareTable);
  }, [finalized, stableMeta?.compareTable]);

  const avatarBg = isDark ? "#f5f5f5" : "#0f172a";
  const avatarTextColor = isDark ? "#111111" : "#ffffff";

  return (
    <View style={styles.wrap}>
      {/* AI Avatar + Name */}
      <View style={styles.avatarRow}>
        <View
          style={[
            styles.avatar,
            {
              width: avatarSize,
              height: avatarSize,
              borderRadius: avatarSize / 2,
              backgroundColor: avatarBg,
            },
          ]}
        >
          <Text
            style={[
              styles.avatarLabel,
              { color: avatarTextColor },
            ]}
          >
            Y
          </Text>
        </View>
        <Text style={[styles.nameLabel, { color: colors.textSecondary }]}>
          YUA
        </Text>
      </View>

      {/* Stream Overlay (typing + thinking panel) */}
      <MobileStreamOverlay
        assistantMeta={stableMeta ?? null}
        assistantFinalized={finalized}
        assistantContent={
          typeof message.content === "string" ? message.content : ""
        }
        assistantMessageId={message.id}
        onOpenDrawer={onPressThink ? () => onPressThink(message) : undefined}
      />

      {/* Attachments (from message meta or top-level) */}
      {(message.attachments?.length || message.meta?.attachments?.length) ? (
        <MobileAttachmentDisplay
          attachments={message.attachments ?? message.meta?.attachments ?? []}
          placement="assistant"
        />
      ) : null}

      {/* Image Section */}
      {hasImageStudioSection ? (
        <MobileImageSectionBlock
          sectionId={sectionId}
          loading={message.meta?.imageLoading === true}
        />
      ) : null}

      {/* Main Content (Markdown) */}
      <View style={styles.content}>
        {trimmed.length === 0 ? <View style={styles.emptyAnchor} /> : null}
        <MobileMarkdown
          content={message.content}
          streaming={Boolean(message.streaming && !finalized)}
          branchEmoji={
            stableMeta?.branchEmoji ??
            (stableMeta?.thoughtStage
              ? emojiMap[stableMeta.thoughtStage]
              : undefined)
          }
          sources={stableMeta?.sources ?? []}
        />
        {compareMarkdown ? (
          <View style={styles.compareWrap}>
            <MobileMarkdown content={compareMarkdown} streaming={false} />
          </View>
        ) : null}
      </View>

      {/* Emoji Context */}
      {!message.streaming && !isImageIntent && stableMeta?.thoughtStage ? (
        <View style={styles.emojiWrap}>
          <EmojiContextLine
            stage={stableMeta.thoughtStage}
            persona={stableMeta.persona ?? "DEFAULT"}
            confidence={stableMeta.confidence}
            seed={message.id}
          />
        </View>
      ) : null}

      {/* Close + Suggestions */}
      {!message.streaming &&
      finalized &&
      !isImageIntent &&
      (closeText || footerSuggestion?.items?.length) ? (
        <View
          style={[
            styles.suggestionWrap,
            { borderTopColor: colors.suggestionBorder },
          ]}
        >
          {stableMeta?.suggestion && closeText ? (
            <Text
              style={[
                styles.closeText,
                { color: colors.closeTextColor },
              ]}
            >
              {closeText}
            </Text>
          ) : null}
          {footerSuggestion?.items?.length ? (
            <SuggestionBlock payload={footerSuggestion} />
          ) : null}
        </View>
      ) : null}

      {/* Think Chip (DEEP) */}
      {stableMeta?.thinkingProfile ? (
        <View style={styles.thinkChipWrap}>
          <Text
            style={[
              styles.thinkChip,
              { backgroundColor: colors.thinkChipBg, color: colors.thinkChipColor },
            ]}
            onPress={() => onPressThink?.(message)}
          >
            Think {stableMeta.thinkingProfile}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  /* Flat text, full width, no bubble */
  wrap: {
    width: "100%",
    gap: 4,
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  avatar: {
    justifyContent: "center",
    alignItems: "center",
  },
  avatarLabel: {
    fontSize: MobileTokens.font.sm,
    fontWeight: MobileTokens.weight.bold,
  },
  nameLabel: {
    fontSize: MobileTokens.font.sm,
    fontWeight: MobileTokens.weight.semibold,
  },
  content: {
    gap: 4,
  },
  emptyAnchor: {
    minHeight: 16,
  },
  compareWrap: {
    marginTop: 6,
  },
  emojiWrap: {
    marginTop: 8,
  },
  suggestionWrap: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    gap: 6,
  },
  suggestionWrapLight: {
    borderTopColor: "rgba(0,0,0,0.06)",
  },
  suggestionWrapDark: {
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  closeText: {
    fontSize: 14,
    lineHeight: 20,
  },
  closeTextLight: {
    color: "#475569",
  },
  closeTextDark: {
    color: "#9ca3af",
  },
  thinkChipWrap: {
    alignItems: "flex-start",
    marginTop: 8,
  },
  thinkChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 11,
    fontWeight: "600",
    overflow: "hidden",
  },
  thinkChipLight: {
    backgroundColor: "#dbeafe",
    color: "#1e40af",
  },
  thinkChipDark: {
    backgroundColor: "rgba(59,130,246,0.15)",
    color: "#93c5fd",
  },
});
