import {
  Tray,
  Menu,
  nativeImage,
  app,
  BrowserWindow,
  ipcMain,
  MenuItemConstructorOptions,
} from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { toggleMiniMode } from './window-manager';

let tray: Tray | null = null;
let badgeCount = 0;
let recentThreads: Array<{ id: string; title: string }> = [];
let cachedMainWindow: BrowserWindow | null = null;

/**
 * Resolve the tray icon path.
 * In production: resources/ next to the app.
 * In dev: resources/ at project root.
 */
function getTrayIconPath(): string {
  const isProd = app.isPackaged;
  const basePath = isProd
    ? path.join(process.resourcesPath, 'resources')
    : path.join(__dirname, '../../resources');

  // On macOS, use template image (Template suffix tells macOS it's a
  // monochrome icon that adapts to light/dark menu bar).
  const iconName =
    process.platform === 'darwin' ? 'tray-iconTemplate.png' : 'tray-icon.png';
  const iconPath = path.join(basePath, iconName);

  if (fs.existsSync(iconPath)) return iconPath;

  // Fallback to non-template variant
  const fallback = path.join(basePath, 'tray-icon.png');
  if (fs.existsSync(fallback)) return fallback;

  // No icon file found — we'll create an empty 16x16 icon in-memory
  return '';
}

/**
 * Build the context menu template for the tray.
 */
function buildMenuTemplate(
  mainWindow: BrowserWindow,
): MenuItemConstructorOptions[] {
  const isMac = process.platform === 'darwin';

  const alwaysOnTopLabel = mainWindow.isAlwaysOnTop()
    ? '✓ 항상 위에 표시'
    : '항상 위에 표시';

  return [
    {
      label: 'YUA',
      enabled: false,
    },
    { type: 'separator' },
    {
      label: '새 대화',
      accelerator: isMac ? 'Cmd+N' : 'Ctrl+N',
      click: () => {
        showAndFocus(mainWindow);
        mainWindow.webContents.send('app:new-chat');
      },
    },
    {
      label: '빠른 질문',
      accelerator: isMac ? 'Alt+Space' : 'Ctrl+Space',
      click: () => {
        showAndFocus(mainWindow);
        mainWindow.webContents.send('app:quick-launch');
      },
    },
    {
      label: '최근 대화',
      submenu: recentThreads.length > 0
        ? recentThreads.map(t => ({
            label: t.title || '(제목 없음)',
            click: () => {
              showAndFocus(mainWindow);
              mainWindow.webContents.send('app:navigate-thread', t.id);
            },
          }))
        : [{ label: '대화 없음', enabled: false }],
    },
    {
      label: '미니 모드',
      accelerator: isMac ? 'Cmd+Shift+T' : 'Ctrl+Shift+T',
      click: () => {
        toggleMiniMode();
      },
    },
    { type: 'separator' },
    {
      label: '스크린샷 캡처',
      accelerator: isMac ? 'Cmd+Shift+S' : 'Ctrl+Shift+S',
      click: () => {
        mainWindow.webContents.send('screenshot:capture');
      },
    },
    {
      label: alwaysOnTopLabel,
      type: 'checkbox',
      checked: mainWindow.isAlwaysOnTop(),
      click: (menuItem) => {
        mainWindow.setAlwaysOnTop(menuItem.checked);
        mainWindow.webContents.send(
          'window:always-on-top-changed',
          menuItem.checked,
        );
      },
    },
    {
      label: '시작 시 실행',
      type: 'checkbox',
      checked: app.getLoginItemSettings().openAtLogin,
      click: (menuItem) => {
        app.setLoginItemSettings({ openAtLogin: menuItem.checked });
      },
    },
    { type: 'separator' },
    {
      label: '설정...',
      accelerator: isMac ? 'Cmd+,' : 'Ctrl+,',
      click: () => {
        showAndFocus(mainWindow);
        mainWindow.webContents.send('app:open-settings');
      },
    },
    {
      label: 'YUA 종료',
      accelerator: isMac ? 'Cmd+Q' : 'Alt+F4',
      click: () => {
        app.quit();
      },
    },
  ];
}

/**
 * Show and focus the main window.
 */
function showAndFocus(win: BrowserWindow): void {
  if (!win.isVisible()) win.show();
  if (win.isMinimized()) win.restore();
  win.focus();
}

/**
 * Create a small fallback icon (16x16 empty nativeImage) when no icon file exists.
 */
function createFallbackIcon(): Electron.NativeImage {
  return nativeImage.createEmpty();
}

/**
 * Update the tray tooltip to include badge count.
 */
function updateTrayTooltip(): void {
  if (!tray) return;
  const base = 'YUA';
  if (badgeCount > 0) {
    tray.setToolTip(`${base} — ${badgeCount}개 알림`);
  } else {
    tray.setToolTip(base);
  }
}

/**
 * Rebuild the tray context menu (e.g. after recent threads update).
 */
function rebuildMenu(): void {
  if (!tray || !cachedMainWindow) return;
  const updated = Menu.buildFromTemplate(buildMenuTemplate(cachedMainWindow));
  tray.setContextMenu(updated);
}

/**
 * Create the system tray with context menu.
 * Call this after the main window is created and ready.
 */
export function createTray(mainWindow: BrowserWindow): Tray {
  cachedMainWindow = mainWindow;
  const iconPath = getTrayIconPath();
  const icon = iconPath
    ? nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 })
    : createFallbackIcon();

  // On macOS, mark as template image for dark/light adaptation
  if (process.platform === 'darwin') {
    icon.setTemplateImage(true);
  }

  tray = new Tray(icon);
  tray.setToolTip('YUA');

  // Build and set context menu
  const contextMenu = Menu.buildFromTemplate(buildMenuTemplate(mainWindow));
  tray.setContextMenu(contextMenu);

  // On Windows/Linux, clicking the tray icon toggles window visibility
  if (process.platform !== 'darwin') {
    tray.on('click', () => {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        showAndFocus(mainWindow);
      }
    });
  }

  // Rebuild menu when always-on-top changes (to update checkbox state)
  mainWindow.on('always-on-top-changed', () => {
    if (tray) {
      const updated = Menu.buildFromTemplate(buildMenuTemplate(mainWindow));
      tray.setContextMenu(updated);
    }
  });

  // --- IPC: tray state ---
  ipcMain.on('tray:set-state', (_event, state: 'idle' | 'streaming' | 'notification' | 'offline') => {
    if (!tray) return;
    const tooltips: Record<string, string> = {
      idle: 'YUA',
      streaming: 'YUA — 생성 중...',
      notification: 'YUA — 새 알림',
      offline: 'YUA — 오프라인',
    };
    tray.setToolTip(tooltips[state] || 'YUA');
  });

  // --- IPC: badge count ---
  ipcMain.on('tray:badge', (_event, count: number) => {
    badgeCount = Math.max(0, count);
    updateTrayTooltip();

    // On macOS, also set the dock badge
    if (process.platform === 'darwin') {
      app.dock?.setBadge(badgeCount > 0 ? String(badgeCount) : '');
    }
  });

  // --- IPC: recent threads for tray submenu ---
  ipcMain.on('tray:set-recent-threads', (_event, threads: Array<{ id: string; title: string }>) => {
    recentThreads = threads.slice(0, 5);
    rebuildMenu();
  });

  return tray;
}

/**
 * Destroy the tray (cleanup).
 */
export function destroyTray(): void {
  if (tray) {
    tray.destroy();
    tray = null;
  }
}
