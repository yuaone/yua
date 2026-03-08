import { BrowserWindow, shell, app } from 'electron';
import fs from 'node:fs';
import path from 'node:path';

const BOUNDS_FILE = 'window-bounds.json';

function loadWindowBounds(): Electron.Rectangle | null {
  try {
    const filePath = path.join(app.getPath('userData'), BOUNDS_FILE);
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

function saveWindowBounds(bounds: Electron.Rectangle): void {
  try {
    const filePath = path.join(app.getPath('userData'), BOUNDS_FILE);
    fs.writeFileSync(filePath, JSON.stringify(bounds));
  } catch {}
}

let mainWindow: BrowserWindow | null = null;
let miniWindow: BrowserWindow | null = null;

export function createMainWindow(): BrowserWindow {
  const savedBounds = loadWindowBounds();

  mainWindow = new BrowserWindow({
    width: savedBounds?.width ?? 1200,
    height: savedBounds?.height ?? 800,
    ...(savedBounds?.x !== undefined && savedBounds?.y !== undefined
      ? { x: savedBounds.x, y: savedBounds.y }
      : {}),
    minWidth: 720,
    minHeight: 500,
    show: false,
    frame: false, // Custom title bar
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'hidden',
    trafficLightPosition: { x: 20, y: 14 },
    backgroundColor: '#0a0a0a',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      preload: path.join(__dirname, '../preload/index.js'),
      backgroundThrottling: false, // Keep SSE alive when minimized
      v8CacheOptions: 'bypassHeatCheckAndEagerCompile',
    },
  });

  // Load renderer
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    // mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  // Show when ready (no white flash)
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Allow Firebase/Google auth popups, open everything else in system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Firebase auth popup flow requires in-app window
    if (
      url.includes('accounts.google.com') ||
      url.includes('firebaseapp.com') ||
      url.includes('googleapis.com') ||
      url.includes('firebase.google.com')
    ) {
      return { action: 'allow' };
    }
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Notify renderer when maximized state changes
  mainWindow.on('maximize', () => {
    mainWindow?.webContents.send('window:maximized-changed', true);
  });
  mainWindow.on('unmaximize', () => {
    mainWindow?.webContents.send('window:maximized-changed', false);
  });

  mainWindow.on('close', () => {
    if (mainWindow && !mainWindow.isMinimized() && !mainWindow.isMaximized()) {
      saveWindowBounds(mainWindow.getBounds());
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  return mainWindow;
}

export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}

export function createMiniWindow(): BrowserWindow {
  if (miniWindow && !miniWindow.isDestroyed()) {
    miniWindow.show();
    miniWindow.focus();
    return miniWindow;
  }

  miniWindow = new BrowserWindow({
    width: 400,
    height: 500,
    minWidth: 350,
    minHeight: 400,
    maxWidth: 500,
    maxHeight: 700,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: false,
    show: false,
    backgroundColor: '#0a0a0a',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, '../preload/index.js'),
    },
  });

  const url =
    process.env.NODE_ENV === 'development'
      ? 'http://localhost:5173#/mini'
      : `file://${path.join(__dirname, '../renderer/index.html')}#/mini`;

  miniWindow.loadURL(url);

  miniWindow.once('ready-to-show', () => miniWindow?.show());
  miniWindow.on('closed', () => {
    miniWindow = null;
  });

  return miniWindow;
}

export function toggleMiniMode(): void {
  if (miniWindow && !miniWindow.isDestroyed() && miniWindow.isVisible()) {
    miniWindow.hide();
    // Show main window
    mainWindow?.show();
    mainWindow?.focus();
  } else {
    // Hide main window, show mini
    mainWindow?.hide();
    createMiniWindow();
  }
}

export function getMiniWindow(): BrowserWindow | null {
  return miniWindow;
}
