/**
 * MemoryPanel
 *
 * Full-screen memory management panel (ChatGPT/Claude style memory viewer).
 * Displays all stored memories with edit, delete, lock/unlock, and bulk-delete.
 */

import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { Text } from "react-native";

import { useTheme } from "@/hooks/useTheme";
import { MobileTokens } from "@/constants/tokens";
import { useMemoryStore, type Memory } from "@/store/useMemoryStore";

/* ──────────────────────────────────────────────
   Types
   ────────────────────────────────────────────── */

interface MemoryPanelProps {
  authFetch: (url: string, init?: RequestInit) => Promise<Response>;
  onBack: () => void;
}

/* ──────────────────────────────────────────────
   Scope display config
   ────────────────────────────────────────────── */

const SCOPE_LABELS: Record<string, string> = {
  user_profile: "프로필",
  user_preference: "선호 설정",
  user_research: "리서치",
  project_architecture: "프로젝트 구조",
  project_decision: "결정사항",
  general_knowledge: "일반 지식",
  language_preference: "언어 설정",
};

function getScopeLabel(scope: string): string {
  return SCOPE_LABELS[scope] ?? scope.replace(/_/g, " ");
}

/* ──────────────────────────────────────────────
   Time formatter
   ────────────────────────────────────────────── */

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "방금 전";
  if (mins < 60) return `${mins}분 전`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}시간 전`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}일 전`;
  return new Date(iso).toLocaleDateString("ko-KR");
}

/* ──────────────────────────────────────────────
   MemoryItem (memoized)
   ────────────────────────────────────────────── */

interface MemoryItemProps {
  item: Memory;
  editingId: number | null;
  editContent: string;
  onEditStart: (mem: Memory) => void;
  onEditChange: (text: string) => void;
  onEditSave: () => void;
  onEditCancel: () => void;
  onDelete: (mem: Memory) => void;
  onToggleLock: (mem: Memory) => void;
  colors: ReturnType<typeof useTheme>["colors"];
}

const MemoryItem = React.memo(function MemoryItem({
  item,
  editingId,
  editContent,
  onEditStart,
  onEditChange,
  onEditSave,
  onEditCancel,
  onDelete,
  onToggleLock,
  colors,
}: MemoryItemProps) {
  const isEditing = editingId === item.id;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surfaceMain,
          borderColor: item.locked ? colors.activeIndicator : colors.line,
          borderWidth: 1,
          borderRadius: MobileTokens.radius.card,
        },
      ]}
    >
      {/* ── Content ── */}
      {isEditing ? (
        <View>
          <TextInput
            value={editContent}
            onChangeText={onEditChange}
            multiline
            style={[
              styles.editInput,
              {
                backgroundColor: colors.wash,
                borderColor: colors.line,
                color: colors.textPrimary,
                fontSize: MobileTokens.font.md,
                borderRadius: MobileTokens.radius.sm,
              },
            ]}
            autoFocus
          />
          <View style={styles.editActions}>
            <Pressable
              onPress={onEditSave}
              hitSlop={8}
              style={[
                styles.editBtn,
                { backgroundColor: colors.buttonBg, borderRadius: MobileTokens.radius.sm },
              ]}
            >
              <Text style={{ fontSize: MobileTokens.font.sm, color: colors.buttonText, fontWeight: MobileTokens.weight.medium }}>
                저장
              </Text>
            </Pressable>
            <Pressable
              onPress={onEditCancel}
              hitSlop={8}
              style={[
                styles.editBtn,
                {
                  backgroundColor: "transparent",
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor: colors.line,
                  borderRadius: MobileTokens.radius.sm,
                },
              ]}
            >
              <Text style={{ fontSize: MobileTokens.font.sm, color: colors.textSecondary }}>
                취소
              </Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Text
          style={{
            fontSize: MobileTokens.font.md,
            lineHeight: MobileTokens.font.md * MobileTokens.lineHeight.relaxed,
            color: colors.textPrimary,
          }}
        >
          {item.content}
        </Text>
      )}

      {/* ── Meta row (scope badge + timestamps) ── */}
      {!isEditing && (
        <View style={styles.metaRow}>
          {/* Scope badge */}
          <View
            style={[
              styles.scopeBadge,
              {
                backgroundColor: colors.wash,
                borderRadius: MobileTokens.radius.chip,
              },
            ]}
          >
            <Text
              style={{
                fontSize: MobileTokens.font.xs,
                color: colors.textMuted,
              }}
            >
              {getScopeLabel(item.scope)}
            </Text>
          </View>

          {/* Locked indicator */}
          {item.locked && (
            <Text style={{ fontSize: 12, color: colors.activeIndicator, marginLeft: MobileTokens.space.xs }}>
              잠김
            </Text>
          )}

          <View style={{ flex: 1 }} />

          {/* Timestamp */}
          <Text
            style={{
              fontSize: MobileTokens.font.xs,
              color: colors.textMuted,
            }}
          >
            {relativeTime(item.updatedAt)}
          </Text>
        </View>
      )}

      {/* ── Action row ── */}
      {!isEditing && (
        <View style={styles.actionRow}>
          {/* Lock / Unlock */}
          <Pressable
            onPress={() => onToggleLock(item)}
            hitSlop={8}
            style={[
              styles.actionBtn,
              {
                borderColor: item.locked ? colors.activeIndicator : colors.line,
                borderRadius: MobileTokens.radius.sm,
              },
            ]}
          >
            <Text style={{ fontSize: 14 }}>{item.locked ? "\u{1F512}" : "\u{1F513}"}</Text>
            <Text
              style={{
                fontSize: MobileTokens.font.xs,
                color: item.locked ? colors.activeIndicator : colors.textMuted,
                marginLeft: MobileTokens.space.xs,
              }}
            >
              {item.locked ? "해제" : "잠금"}
            </Text>
          </Pressable>

          {/* Edit */}
          <Pressable
            onPress={() => onEditStart(item)}
            hitSlop={8}
            style={[
              styles.actionBtn,
              {
                borderColor: colors.line,
                borderRadius: MobileTokens.radius.sm,
              },
            ]}
          >
            <Text style={{ fontSize: 14 }}>{"\u270F\uFE0F"}</Text>
            <Text
              style={{
                fontSize: MobileTokens.font.xs,
                color: colors.textMuted,
                marginLeft: MobileTokens.space.xs,
              }}
            >
              편집
            </Text>
          </Pressable>

          {/* Delete */}
          <Pressable
            onPress={() => onDelete(item)}
            hitSlop={8}
            style={[
              styles.actionBtn,
              {
                borderColor: colors.line,
                borderRadius: MobileTokens.radius.sm,
              },
            ]}
          >
            <Text style={{ fontSize: 14 }}>{"\u{1F5D1}\uFE0F"}</Text>
            <Text
              style={{
                fontSize: MobileTokens.font.xs,
                color: colors.errorColor,
                marginLeft: MobileTokens.space.xs,
              }}
            >
              삭제
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
});

/* ──────────────────────────────────────────────
   MemoryPanel
   ────────────────────────────────────────────── */

export default function MemoryPanel({ authFetch, onBack }: MemoryPanelProps) {
  const { colors } = useTheme();
  const {
    memories,
    loading,
    fetch: fetchMemories,
    update,
    delete: deleteMemory,
    toggleLock,
  } = useMemoryStore();

  /* ── Edit state ── */
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  /* ── Initial load ── */
  useEffect(() => {
    fetchMemories(authFetch);
  }, [authFetch, fetchMemories]);

  /* ── Pull to refresh ── */
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchMemories(authFetch);
    setRefreshing(false);
  }, [authFetch, fetchMemories]);

  /* ── Actions ── */
  const handleEditStart = useCallback((mem: Memory) => {
    setEditingId(mem.id);
    setEditContent(mem.content);
  }, []);

  const handleEditSave = useCallback(async () => {
    if (editingId == null) return;
    const trimmed = editContent.trim();
    if (!trimmed) return;
    await update(authFetch, editingId, trimmed);
    setEditingId(null);
    setEditContent("");
  }, [authFetch, editContent, editingId, update]);

  const handleEditCancel = useCallback(() => {
    setEditingId(null);
    setEditContent("");
  }, []);

  const handleDelete = useCallback(
    (mem: Memory) => {
      Alert.alert("메모리 삭제", `"${mem.content.slice(0, 40)}..." 을(를) 삭제하시겠습니까?`, [
        { text: "취소", style: "cancel" },
        {
          text: "삭제",
          style: "destructive",
          onPress: () => deleteMemory(authFetch, mem.id),
        },
      ]);
    },
    [authFetch, deleteMemory],
  );

  const handleToggleLock = useCallback(
    (mem: Memory) => {
      toggleLock(authFetch, mem.id);
    },
    [authFetch, toggleLock],
  );

  const handleDeleteAll = useCallback(() => {
    if (memories.length === 0) return;
    Alert.alert(
      "전체 삭제",
      `저장된 메모리 ${memories.length}개를 모두 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`,
      [
        { text: "취소", style: "cancel" },
        {
          text: "전체 삭제",
          style: "destructive",
          onPress: async () => {
            for (const mem of memories) {
              await deleteMemory(authFetch, mem.id);
            }
          },
        },
      ],
    );
  }, [authFetch, deleteMemory, memories]);

  /* ── Render item ── */
  const renderItem = useCallback(
    ({ item }: { item: Memory }) => (
      <MemoryItem
        item={item}
        editingId={editingId}
        editContent={editContent}
        onEditStart={handleEditStart}
        onEditChange={setEditContent}
        onEditSave={handleEditSave}
        onEditCancel={handleEditCancel}
        onDelete={handleDelete}
        onToggleLock={handleToggleLock}
        colors={colors}
      />
    ),
    [
      editingId,
      editContent,
      handleEditStart,
      handleEditSave,
      handleEditCancel,
      handleDelete,
      handleToggleLock,
      colors,
    ],
  );

  const keyExtractor = useCallback((item: Memory) => String(item.id), []);

  /* ── Empty state ── */
  const renderEmpty = useCallback(() => {
    if (loading) return null;
    return (
      <View
        style={[
          styles.emptyContainer,
          {
            backgroundColor: colors.wash,
            borderColor: colors.line,
            borderRadius: MobileTokens.radius.card,
          },
        ]}
      >
        <Text style={{ fontSize: 40, opacity: 0.3, marginBottom: MobileTokens.space.md }}>
          {"\u{1F9E0}"}
        </Text>
        <Text
          style={{
            fontSize: MobileTokens.font.md,
            fontWeight: MobileTokens.weight.medium,
            color: colors.textPrimary,
            marginBottom: MobileTokens.space.xs,
          }}
        >
          아직 저장된 메모리가 없습니다
        </Text>
        <Text
          style={{
            fontSize: MobileTokens.font.sm,
            color: colors.textMuted,
            textAlign: "center",
          }}
        >
          대화를 하면 YUA가 자동으로{"\n"}중요한 정보를 기억합니다.
        </Text>
      </View>
    );
  }, [loading, colors]);

  /* ── Footer (delete all) ── */
  const renderFooter = useCallback(() => {
    if (memories.length === 0) return null;
    return (
      <View style={styles.footerContainer}>
        <Pressable
          onPress={handleDeleteAll}
          style={[
            styles.deleteAllBtn,
            {
              borderColor: colors.errorColor,
              borderRadius: MobileTokens.radius.sm,
            },
          ]}
        >
          <Text
            style={{
              fontSize: MobileTokens.font.md,
              fontWeight: MobileTokens.weight.medium,
              color: colors.errorColor,
            }}
          >
            전체 삭제
          </Text>
        </Pressable>
      </View>
    );
  }, [colors, handleDeleteAll, memories.length]);

  /* ──────────────────────────────────────────────
     Render
     ────────────────────────────────────────────── */

  return (
    <View style={{ flex: 1, backgroundColor: colors.appBg }}>
      {/* ═══════ Header (56px) ═══════ */}
      <View
        style={[
          styles.header,
          {
            paddingTop: Platform.OS === "ios" ? 56 : 16,
            backgroundColor: colors.appBg,
          },
        ]}
      >
        <Pressable
          onPress={onBack}
          hitSlop={8}
          style={styles.backBtn}
        >
          <Text style={{ fontSize: 24, color: colors.textPrimary }}>
            {"\u2190"}
          </Text>
        </Pressable>
        <Text
          style={{
            fontSize: MobileTokens.font.lg,
            fontWeight: MobileTokens.weight.semibold,
            color: colors.textPrimary,
            marginLeft: MobileTokens.space.sm,
          }}
        >
          메모리 관리
        </Text>
      </View>

      {/* ═══════ Description ═══════ */}
      <View style={styles.descContainer}>
        <Text
          style={{
            fontSize: MobileTokens.font.sm,
            color: colors.textSecondary,
            paddingHorizontal: MobileTokens.space.lg,
          }}
        >
          YUA가 대화에서 기억하는 정보입니다. 수정하거나 삭제할 수 있습니다.
        </Text>
      </View>

      {/* ═══════ Loading state ═══════ */}
      {loading && memories.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.textMuted} />
        </View>
      ) : (
        /* ═══════ Memory list ═══════ */
        <FlatList
          data={memories}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={[
            styles.listContent,
            memories.length === 0 && styles.listContentEmpty,
          ]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          ItemSeparatorComponent={() => <View style={{ height: MobileTokens.space.md }} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.textMuted}
              colors={[colors.activeIndicator]}
            />
          }
        />
      )}
    </View>
  );
}

/* ──────────────────────────────────────────────
   Styles
   ────────────────────────────────────────────── */

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: MobileTokens.space.md,
    paddingHorizontal: MobileTokens.space.lg,
  },
  backBtn: {
    width: MobileTokens.touch.min,
    height: MobileTokens.touch.min,
    justifyContent: "center",
    alignItems: "center",
  },
  descContainer: {
    paddingBottom: MobileTokens.space.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    paddingHorizontal: MobileTokens.space.lg,
    paddingBottom: MobileTokens.space.xxxl,
  },
  listContentEmpty: {
    flexGrow: 1,
    justifyContent: "center",
  },
  card: {
    padding: MobileTokens.space.lg,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: MobileTokens.space.md,
  },
  scopeBadge: {
    paddingHorizontal: MobileTokens.space.sm,
    paddingVertical: MobileTokens.space.xxs,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: MobileTokens.space.md,
    gap: MobileTokens.space.sm,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    height: MobileTokens.layout.actionButtonSize,
    paddingHorizontal: MobileTokens.space.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  editInput: {
    borderWidth: 1,
    padding: MobileTokens.space.md,
    minHeight: 80,
    textAlignVertical: "top",
  },
  editActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: MobileTokens.space.sm,
    gap: MobileTokens.space.sm,
  },
  editBtn: {
    paddingHorizontal: MobileTokens.space.lg,
    paddingVertical: MobileTokens.space.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: MobileTokens.space.xxl,
    borderWidth: 1,
    marginHorizontal: MobileTokens.space.lg,
  },
  footerContainer: {
    paddingTop: MobileTokens.space.xl,
    paddingBottom: MobileTokens.space.xxl,
    alignItems: "center",
  },
  deleteAllBtn: {
    paddingHorizontal: MobileTokens.space.xxl,
    paddingVertical: MobileTokens.space.md,
    borderWidth: 1,
    alignItems: "center",
  },
});
