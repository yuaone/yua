// Desktop IPC bridge — type-safe wrapper around preload API

declare global {
  interface Window {
    yuaDesktop: {
      // Window controls
      minimize(): void;
      maximize(): void;
      close(): void;
      isMaximized(): Promise<boolean>;
      toggleMiniMode(): void;
      toggleAlwaysOnTop(): Promise<boolean>;

      // Platform
      platform: 'darwin' | 'win32' | 'linux';

      // File operations
      openFile(): Promise<string[] | null>;
      saveFile(data: ArrayBuffer, name: string): Promise<string | null>;
      showInFolder(filePath: string): void;
      getFileInfo(filePaths: string[]): Promise<
        Array<{
          path: string;
          name: string;
          size: number;
          type: 'image' | 'pdf' | 'document' | 'spreadsheet' | 'code' | 'json' | 'other';
          mimeType: string;
          suggestions: string[];
        }>
      >;
      readFileAsBase64(filePath: string): Promise<string | null>;
      readFileBuffer(filePath: string): Promise<ArrayBuffer | null>;

      // Auth / secure storage (safeStorage)
      getSecureToken(): Promise<string | null>;
      setSecureToken(token: string): Promise<boolean>;
      deleteSecureToken(): Promise<boolean>;

      // Clipboard
      readClipboard(): Promise<string>;
      writeClipboard(text: string): Promise<boolean>;

      // Tray
      setBadge(count: number): void;
      setTrayState(state: 'idle' | 'streaming' | 'notification' | 'offline'): void;
      setRecentThreads(threads: Array<{ id: string; title: string }>): void;
      onNavigateThread(cb: (threadId: string) => void): () => void;

      // Auto-launch
      setAutoLaunch(enabled: boolean): Promise<boolean>;

      // Updater
      checkUpdate(): Promise<unknown>;
      installUpdate(): void;

      // Event listeners
      onUpdateAvailable(cb: (info: unknown) => void): () => void;
      onUpdateStatus(cb: (status: string) => void): () => void;
      onUpdateProgress(cb: (progress: unknown) => void): () => void;
      onUpdateDownloaded(cb: (info: unknown) => void): () => void;
      onWindowMaximized(cb: (maximized: boolean) => void): () => void;
      onDeepLink(cb: (url: string) => void): () => void;
      onDeepLinkRoute(
        cb: (route: { action: string; params: Record<string, string> }) => void,
      ): () => void;
      onAlwaysOnTopChanged(cb: (isOnTop: boolean) => void): () => void;
      onUpdateError(cb: (message: string) => void): () => void;
      onNewChat(cb: () => void): () => void;
      onQuickLaunch(cb: () => void): () => void;
      onOpenSettings(cb: () => void): () => void;
      onClipboardQuestion(cb: () => void): () => void;

      // Auto launch
      setAutoLaunch(enabled: boolean): void;

      // Quick Launch
      quickLaunchResize(height: number): void;
      quickLaunchClose(): void;
      quickLaunchOpenFull(): void;

      // Power management
      preventSleep(): void;
      allowSleep(): void;

      // Screenshot
      screenshotGetSources(): Promise<
        Array<{
          id: string;
          name: string;
          thumbnail: string;
          appIcon: string | null;
          display_id: string;
        }>
      >;
      screenshotCapture(sourceId?: string): Promise<{
        dataUrl: string;
        width: number;
        height: number;
        name: string;
      } | null>;
      onScreenshotCapture(cb: () => void): () => void;

      // SQLite offline cache
      cacheSetThreads(threads: any[]): Promise<boolean>;
      cacheGetThreads(projectId?: string): Promise<any[]>;
      cacheSetMessages(threadId: string, messages: any[]): Promise<boolean>;
      cacheGetMessages(threadId: string): Promise<any[]>;
      cacheSetMeta(key: string, value: string): Promise<boolean>;
      cacheGetMeta(key: string): Promise<string | null>;
      cacheClear(): Promise<boolean>;
      cacheOutboxPush(action: string, payload: string): Promise<boolean>;
      cacheOutboxList(): Promise<any[]>;
      cacheOutboxComplete(id: number): Promise<boolean>;
      cacheOutboxRetry(id: number): Promise<boolean>;
      cacheSearchMessages(query: string): Promise<any[]>;
    };
  }
}

export const desktop = typeof window !== 'undefined' ? window.yuaDesktop : undefined;
export const isDesktop = typeof window !== 'undefined' && !!window.yuaDesktop;
export const isMac = desktop?.platform === 'darwin';
export const isWindows = desktop?.platform === 'win32';
