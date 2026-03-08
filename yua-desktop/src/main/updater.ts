import { autoUpdater } from 'electron-updater';
import { BrowserWindow, ipcMain } from 'electron';
import log from 'electron-log';

let mainWindow: BrowserWindow | null = null;

export function setupAutoUpdater(win: BrowserWindow): void {
  mainWindow = win;

  // Configure logging
  autoUpdater.logger = log;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  // Check for updates on startup (with delay)
  setTimeout(() => {
    autoUpdater.checkForUpdatesAndNotify().catch(() => {
      // silent — no update server configured yet
    });
  }, 10_000); // 10s delay after startup

  // Periodic check every hour
  setInterval(() => {
    autoUpdater.checkForUpdatesAndNotify().catch(() => {});
  }, 60 * 60 * 1000);

  // Events -> send to renderer
  autoUpdater.on('checking-for-update', () => {
    sendToRenderer('updater:status', 'checking');
  });

  autoUpdater.on('update-available', (info) => {
    sendToRenderer('updater:available', info);
  });

  autoUpdater.on('update-not-available', () => {
    sendToRenderer('updater:status', 'up-to-date');
  });

  autoUpdater.on('download-progress', (progress) => {
    sendToRenderer('updater:progress', {
      percent: progress.percent,
      bytesPerSecond: progress.bytesPerSecond,
      transferred: progress.transferred,
      total: progress.total,
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    sendToRenderer('updater:downloaded', info);
  });

  autoUpdater.on('error', (error) => {
    sendToRenderer('updater:error', error?.message ?? 'Unknown error');
  });

  // IPC handlers
  ipcMain.handle('updater:check', async () => {
    try {
      const result = await autoUpdater.checkForUpdatesAndNotify();
      return { available: !!result?.updateInfo };
    } catch {
      return { available: false, error: 'Check failed' };
    }
  });

  ipcMain.on('updater:install', () => {
    autoUpdater.quitAndInstall(false, true);
  });
}

function sendToRenderer(channel: string, data: unknown): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, data);
  }
}
