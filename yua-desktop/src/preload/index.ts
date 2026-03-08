import { contextBridge, ipcRenderer } from 'electron';

const api = {
  // Window controls
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:is-maximized'),
  toggleMiniMode: () => ipcRenderer.send('window:mini-toggle'),
  toggleAlwaysOnTop: () => ipcRenderer.invoke('window:toggle-always-on-top'),

  // Platform info
  platform: process.platform as 'darwin' | 'win32' | 'linux',

  // File operations
  openFile: () => ipcRenderer.invoke('file:open'),
  saveFile: (data: ArrayBuffer, name: string) =>
    ipcRenderer.invoke('file:save', data, name),
  showInFolder: (filePath: string) =>
    ipcRenderer.send('file:show-in-folder', filePath),
  getFileInfo: (filePaths: string[]) =>
    ipcRenderer.invoke('file:get-info', filePaths),
  readFileAsBase64: (filePath: string) =>
    ipcRenderer.invoke('file:read-as-base64', filePath),
  readFileBuffer: (filePath: string) =>
    ipcRenderer.invoke('file:read-buffer', filePath),

  // Auth / secure storage
  getSecureToken: () => ipcRenderer.invoke('auth:get-token'),
  setSecureToken: (token: string) =>
    ipcRenderer.invoke('auth:set-token', token),
  deleteSecureToken: () => ipcRenderer.invoke('auth:delete-token'),

  // Clipboard
  readClipboard: () => ipcRenderer.invoke('clipboard:read'),
  writeClipboard: (text: string) =>
    ipcRenderer.invoke('clipboard:write', text),

  // Tray
  setBadge: (count: number) => ipcRenderer.send('tray:badge', count),
  setTrayState: (state: 'idle' | 'streaming' | 'notification' | 'offline') => ipcRenderer.send('tray:set-state', state),

  // Quick Launch
  quickLaunchResize: (height: number) =>
    ipcRenderer.send('quick-launch:resize', height),
  quickLaunchClose: () => ipcRenderer.send('quick-launch:close'),
  quickLaunchOpenFull: () => ipcRenderer.send('quick-launch:open-full'),

  // Updater
  checkUpdate: () => ipcRenderer.invoke('updater:check'),
  installUpdate: () => ipcRenderer.send('updater:install'),

  // Event listeners (renderer subscribes)
  onUpdateAvailable: (cb: (info: unknown) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, info: unknown) =>
      cb(info);
    ipcRenderer.on('updater:available', handler);
    return () => ipcRenderer.removeListener('updater:available', handler);
  },
  onUpdateStatus: (cb: (status: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, status: string) =>
      cb(status);
    ipcRenderer.on('updater:status', handler);
    return () => ipcRenderer.removeListener('updater:status', handler);
  },
  onUpdateProgress: (cb: (progress: unknown) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, progress: unknown) =>
      cb(progress);
    ipcRenderer.on('updater:progress', handler);
    return () => ipcRenderer.removeListener('updater:progress', handler);
  },
  onUpdateDownloaded: (cb: (info: unknown) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, info: unknown) =>
      cb(info);
    ipcRenderer.on('updater:downloaded', handler);
    return () => ipcRenderer.removeListener('updater:downloaded', handler);
  },
  onWindowMaximized: (cb: (maximized: boolean) => void) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      maximized: boolean,
    ) => cb(maximized);
    ipcRenderer.on('window:maximized-changed', handler);
    return () =>
      ipcRenderer.removeListener('window:maximized-changed', handler);
  },
  onDeepLink: (cb: (url: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, url: string) =>
      cb(url);
    ipcRenderer.on('deep-link', handler);
    return () => ipcRenderer.removeListener('deep-link', handler);
  },
  onDeepLinkRoute: (
    cb: (route: { action: string; params: Record<string, string> }) => void,
  ) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      route: { action: string; params: Record<string, string> },
    ) => cb(route);
    ipcRenderer.on('deep-link:route', handler);
    return () => ipcRenderer.removeListener('deep-link:route', handler);
  },
  onAlwaysOnTopChanged: (cb: (isOnTop: boolean) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, isOnTop: boolean) =>
      cb(isOnTop);
    ipcRenderer.on('window:always-on-top-changed', handler);
    return () =>
      ipcRenderer.removeListener('window:always-on-top-changed', handler);
  },
  onUpdateError: (cb: (message: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, message: string) =>
      cb(message);
    ipcRenderer.on('updater:error', handler);
    return () => ipcRenderer.removeListener('updater:error', handler);
  },
  onNewChat: (cb: () => void) => {
    const handler = () => cb();
    ipcRenderer.on('app:new-chat', handler);
    return () => ipcRenderer.removeListener('app:new-chat', handler);
  },
  onQuickLaunch: (cb: () => void) => {
    const handler = () => cb();
    ipcRenderer.on('app:quick-launch', handler);
    return () => ipcRenderer.removeListener('app:quick-launch', handler);
  },
  onOpenSettings: (cb: () => void) => {
    const handler = () => cb();
    ipcRenderer.on('app:open-settings', handler);
    return () => ipcRenderer.removeListener('app:open-settings', handler);
  },

  // Recent threads (tray)
  setRecentThreads: (threads: Array<{ id: string; title: string }>) =>
    ipcRenderer.send('tray:set-recent-threads', threads),
  onNavigateThread: (cb: (threadId: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, threadId: string) => cb(threadId);
    ipcRenderer.on('app:navigate-thread', handler);
    return () => ipcRenderer.removeListener('app:navigate-thread', handler);
  },

  // Clipboard question shortcut
  onClipboardQuestion: (cb: () => void) => {
    const handler = () => cb();
    ipcRenderer.on('app:clipboard-question', handler);
    return () => ipcRenderer.removeListener('app:clipboard-question', handler);
  },

  // Power management
  preventSleep: () => ipcRenderer.send('power:prevent-sleep'),
  allowSleep: () => ipcRenderer.send('power:allow-sleep'),

  // Screenshot
  screenshotGetSources: () => ipcRenderer.invoke('screenshot:get-sources'),
  screenshotCapture: (sourceId?: string) =>
    ipcRenderer.invoke('screenshot:capture', sourceId),
  onScreenshotCapture: (cb: () => void) => {
    const handler = () => cb();
    ipcRenderer.on('screenshot:capture', handler);
    return () => ipcRenderer.removeListener('screenshot:capture', handler);
  },

  // SQLite offline cache
  cacheSetThreads: (threads: any[]) =>
    ipcRenderer.invoke('cache:set-threads', threads),
  cacheGetThreads: (projectId?: string) =>
    ipcRenderer.invoke('cache:get-threads', projectId),
  cacheSetMessages: (threadId: string, messages: any[]) =>
    ipcRenderer.invoke('cache:set-messages', threadId, messages),
  cacheGetMessages: (threadId: string) =>
    ipcRenderer.invoke('cache:get-messages', threadId),
  cacheSetMeta: (key: string, value: string) =>
    ipcRenderer.invoke('cache:set-meta', key, value),
  cacheGetMeta: (key: string) =>
    ipcRenderer.invoke('cache:get-meta', key),
  cacheClear: () => ipcRenderer.invoke('cache:clear'),
  cacheOutboxPush: (action: string, payload: string) =>
    ipcRenderer.invoke('cache:outbox-push', action, payload),
  cacheOutboxList: () => ipcRenderer.invoke('cache:outbox-list'),
  cacheOutboxComplete: (id: number) =>
    ipcRenderer.invoke('cache:outbox-complete', id),
  cacheOutboxRetry: (id: number) =>
    ipcRenderer.invoke('cache:outbox-retry', id),
  cacheSearchMessages: (query: string) =>
    ipcRenderer.invoke('cache:search-messages', query),
};

contextBridge.exposeInMainWorld('yuaDesktop', api);

// Type declaration for renderer
export type YuaDesktopAPI = typeof api;
