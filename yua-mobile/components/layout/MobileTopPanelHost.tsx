import MobileActivityPanel from "@/components/activity/MobileActivityPanel";
import MobilePhotoLibraryPanel from "@/components/activity/MobilePhotoLibraryPanel";
import MobileThinkPanel from "@/components/activity/MobileThinkPanel";
import BottomSlidePanel from "@/components/panel/BottomSlidePanel";
import TopSlidePanel from "@/components/panel/TopSlidePanel";
import LeftSlidePanel from "@/components/panel/LeftSlidePanel";
import MobileSidebarPanel from "@/components/sidebar/MobileSidebarPanel";
import type { TopPanelType } from "@/hooks/useTopPanel";
import type { MobilePhotoAsset } from "@/types/assets";
import type { MobileProject, MobileThread, SidebarPanelMode } from "@/types/sidebar";
import type { ActivityItem } from "yua-shared/stream/activity";

import type { MobileOverlayChunk, MobileThinkingSummary } from "@/store/useMobileStreamSessionStore";

type MobileTopPanelHostProps = {
  activePanel: TopPanelType | null;
  visible: boolean;
  onClose: () => void;
  sidebarMode: SidebarPanelMode;
  onSidebarModeChange: (mode: SidebarPanelMode) => void;
  projects: MobileProject[];
  threads: MobileThread[];
  activeProjectId: string | null;
  activeThreadId: number | null;
  onSelectThread: (threadId: number) => void;
  onSelectProject: (projectId: string | null) => void;
  onCreateThread: () => void;
  onOpenPhotoLibrary: () => void;
  onPressLogout: () => void;
  onRefreshSidebar?: () => void;
  refreshingSidebar?: boolean;
  streamStateLabel: string;
  tokenChars: number;
  traceId?: string | null;
  thinkingProfile?: string | null;
  streamStage?: string | null;
  activity: ActivityItem[];
  sessionChunks: MobileOverlayChunk[];
  sessionSummaries: MobileThinkingSummary[];
  sessionLabel?: string | null;
  startedAt?: number | null;
  finalizedAt?: number | null;
  finalized?: boolean;
  photoAssets: MobilePhotoAsset[];
};

function resolveTitle(panel: TopPanelType | null): string {
  if (panel === "sidebar") return "Sidebar";
  if (panel === "think") return "Think";
  if (panel === "photoLibrary") return "사진보관함";
  return "Activity";
}

export default function MobileTopPanelHost({
  activePanel,
  visible,
  onClose,
  sidebarMode,
  onSidebarModeChange,
  projects,
  threads,
  activeProjectId,
  activeThreadId,
  onSelectThread,
  onSelectProject,
  onCreateThread,
  onOpenPhotoLibrary,
  onPressLogout,
  onRefreshSidebar,
  refreshingSidebar = false,
  streamStateLabel,
  tokenChars,
  traceId,
  thinkingProfile,
  streamStage,
  activity,
  sessionChunks,
  sessionSummaries,
  sessionLabel,
  startedAt,
  finalizedAt,
  finalized,
  photoAssets,
}: MobileTopPanelHostProps) {
  return (
    <>
      <LeftSlidePanel
        visible={visible && activePanel === "sidebar"}
        onClose={onClose}
        title="Sidebar"
        renderWhenClosed={false}
      >
        {activePanel === "sidebar" ? (
          <MobileSidebarPanel
            mode={sidebarMode}
            onModeChange={onSidebarModeChange}
            projects={projects}
            threads={threads}
            activeProjectId={activeProjectId}
            activeThreadId={activeThreadId}
            onSelectThread={onSelectThread}
            onSelectProject={onSelectProject}
            onCreateThread={onCreateThread}
            onOpenPhotoLibrary={onOpenPhotoLibrary}
            onPressLogout={onPressLogout}
            onRefresh={onRefreshSidebar}
            refreshing={refreshingSidebar}
          />
        ) : null}
      </LeftSlidePanel>

      <TopSlidePanel
        visible={visible && activePanel !== "activity" && activePanel !== "sidebar"}
        onClose={onClose}
        title={resolveTitle(activePanel)}
        renderWhenClosed={false}
      >
        {activePanel === "think" ? (
          <MobileThinkPanel
            traceId={traceId}
            profile={thinkingProfile}
            stage={streamStage}
            activity={activity}
            chunks={sessionChunks}
            summaries={sessionSummaries}
            label={sessionLabel}
            startedAt={startedAt}
            finalizedAt={finalizedAt}
            finalized={Boolean(finalized)}
          />
        ) : null}

        {activePanel === "photoLibrary" ? <MobilePhotoLibraryPanel assets={photoAssets} /> : null}
      </TopSlidePanel>

      <BottomSlidePanel
        visible={visible && activePanel === "activity"}
        onClose={onClose}
        title={resolveTitle(activePanel)}
        renderWhenClosed={false}
      >
        {activePanel === "activity" ? (
          <MobileActivityPanel
            streamStateLabel={streamStateLabel}
            tokenChars={tokenChars}
            chunks={sessionChunks}
            summaries={sessionSummaries}
          />
        ) : null}
      </BottomSlidePanel>
    </>
  );
}
