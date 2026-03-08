import { BrowserWindow, screen, ipcMain } from 'electron';
import path from 'node:path';

let quickLaunchWindow: BrowserWindow | null = null;

export function createQuickLaunchWindow(): BrowserWindow {
  if (quickLaunchWindow && !quickLaunchWindow.isDestroyed()) {
    quickLaunchWindow.show();
    quickLaunchWindow.focus();
    return quickLaunchWindow;
  }

  const { width: screenWidth, height: screenHeight } =
    screen.getPrimaryDisplay().workAreaSize;

  quickLaunchWindow = new BrowserWindow({
    width: 600,
    height: 80,
    x: Math.round((screenWidth - 600) / 2),
    y: Math.round(screenHeight * 0.25),
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    show: false,
    vibrancy: 'under-window', // macOS frosted glass
    visualEffectState: 'active',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, '../preload/index.js'),
    },
  });

  // Load the renderer with a hash fragment for quick launch.
  // The renderer's App.tsx checks window.location.hash to render
  // the QuickLaunch component directly (without AppShell wrapper).
  if (process.env.NODE_ENV === 'development') {
    quickLaunchWindow.loadURL('http://localhost:5173#/quick-launch');
  } else {
    quickLaunchWindow.loadFile(
      path.join(__dirname, '../renderer/index.html'),
      { hash: '/quick-launch' },
    );
  }

  quickLaunchWindow.on('blur', () => {
    quickLaunchWindow?.hide();
  });

  quickLaunchWindow.on('closed', () => {
    quickLaunchWindow = null;
  });

  quickLaunchWindow.once('ready-to-show', () => {
    quickLaunchWindow?.show();
    quickLaunchWindow?.focus();
  });

  return quickLaunchWindow;
}

export function toggleQuickLaunch(): void {
  if (
    quickLaunchWindow &&
    !quickLaunchWindow.isDestroyed() &&
    quickLaunchWindow.isVisible()
  ) {
    quickLaunchWindow.hide();
  } else {
    createQuickLaunchWindow();
  }
}

export function resizeQuickLaunch(height: number): void {
  if (!quickLaunchWindow || quickLaunchWindow.isDestroyed()) return;
  const clampedHeight = Math.min(Math.max(height, 80), 500);
  const [w] = quickLaunchWindow.getSize();
  quickLaunchWindow.setSize(w, clampedHeight);
}

export function getQuickLaunchWindow(): BrowserWindow | null {
  return quickLaunchWindow;
}

// --- IPC handlers for Quick Launch ---
export function registerQuickLaunchIpc(): void {
  ipcMain.on('quick-launch:resize', (_event, height: number) => {
    resizeQuickLaunch(height);
  });

  ipcMain.on('quick-launch:close', () => {
    quickLaunchWindow?.hide();
  });

  ipcMain.on('quick-launch:open-full', () => {
    // Show the main window — the renderer will handle thread navigation
    const mainWindow = BrowserWindow.getAllWindows().find(
      (w) => w !== quickLaunchWindow && !w.isDestroyed(),
    );
    if (mainWindow) {
      if (!mainWindow.isVisible()) mainWindow.show();
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
    quickLaunchWindow?.hide();
  });
}
