import { app, BrowserWindow, session, Menu } from 'electron';
import { createMainWindow } from './window-manager';
import { registerIpcHandlers } from './ipc-handlers';
import { registerQuickLaunchIpc } from './quick-launch-window';
import { createTray, destroyTray } from './tray';
import {
  registerGlobalShortcuts,
  unregisterGlobalShortcuts,
} from './shortcuts';
import { setupAutoUpdater } from './updater';
import { registerFileHandlers } from './file-handler';
import { handleDeepLink, setupDeepLinkHandlers } from './deeplink';
import { registerScreenshotHandlers } from './screenshot';
import { initSqliteCache, closeSqliteCache } from './sqlite-cache';

const PROTOCOL = 'yua';

// GPU acceleration — prevent software fallback which causes scroll jitter
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('ignore-gpu-blocklist');

// Single instance lock
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, argv) => {
    const win = BrowserWindow.getAllWindows()[0];
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
    // Handle deep link from argv (Windows/Linux)
    const deepLinkUrl = argv.find((arg) => arg.startsWith('yua://'));
    if (deepLinkUrl && win) handleDeepLink(deepLinkUrl, win);
  });

  app.whenReady().then(async () => {
    // Edit menu — required for keyboard shortcuts (backspace, Ctrl+A/C/V) in frameless windows
    Menu.setApplicationMenu(
      Menu.buildFromTemplate([
        {
          label: 'Edit',
          submenu: [
            { role: 'undo' },
            { role: 'redo' },
            { type: 'separator' },
            { role: 'cut' },
            { role: 'copy' },
            { role: 'paste' },
            { role: 'selectAll' },
            { role: 'delete' },
          ],
        },
      ]),
    );

    registerIpcHandlers();
    registerFileHandlers();
    registerQuickLaunchIpc();
    registerScreenshotHandlers();
    initSqliteCache();
    const mainWindow = createMainWindow();

    createTray(mainWindow);
    registerGlobalShortcuts(mainWindow);
    setupAutoUpdater(mainWindow);
    setupDeepLinkHandlers(mainWindow);

    // Headers — CSP + strip COOP (Firebase signInWithPopup needs window.closed access)
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      const headers = { ...details.responseHeaders };

      // Strip COOP/COEP headers that block Firebase OAuth popup communication
      delete headers['cross-origin-opener-policy'];
      delete headers['Cross-Origin-Opener-Policy'];
      delete headers['cross-origin-embedder-policy'];
      delete headers['Cross-Origin-Embedder-Policy'];

      // CSP — production only (Vite HMR needs inline scripts in dev)
      if (app.isPackaged) {
        headers['Content-Security-Policy'] = [
          "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; connect-src 'self' https://*.yuaone.com wss://*.yuaone.com https://*.googleapis.com https://*.firebaseapp.com https://*.firebase.google.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://cdn.jsdelivr.net; img-src 'self' data: https:; font-src 'self' data: https://cdn.jsdelivr.net;",
        ];
      }

      callback({ responseHeaders: headers });
    });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
      }
    });
  });

  app.on('will-quit', () => {
    unregisterGlobalShortcuts();
    destroyTray();
    closeSqliteCache();
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  // Register protocol for deep links
  if (process.defaultApp) {
    if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [process.argv[1]]);
    }
  } else {
    app.setAsDefaultProtocolClient(PROTOCOL);
  }
}
