import { globalShortcut, BrowserWindow } from 'electron';
import { toggleQuickLaunch } from './quick-launch-window';
import { toggleMiniMode } from './window-manager';

const isMac = process.platform === 'darwin';

/**
 * Show and focus the main window.
 */
function showAndFocus(win: BrowserWindow): void {
  if (!win.isVisible()) win.show();
  if (win.isMinimized()) win.restore();
  win.focus();
}

/**
 * Register all global shortcuts.
 * These are system-wide shortcuts that work even when the app is not focused.
 *
 * | macOS          | Windows/Linux  | Action                        |
 * |----------------|----------------|-------------------------------|
 * | Opt+Space      | Ctrl+Space     | Quick Launch (Spotlight-style) |
 * | Cmd+Shift+Y    | Ctrl+Shift+Y   | Show/focus main window        |
 * | Cmd+Shift+T    | Ctrl+Shift+T   | Toggle Mini Mode              |
 * | Cmd+Shift+S    | Ctrl+Shift+S   | Screenshot capture            |
 * | Cmd+Shift+V    | Ctrl+Shift+V   | Clipboard context question    |
 */
export function registerGlobalShortcuts(mainWindow: BrowserWindow): void {
  // --- Quick Launch: Opt+Space (macOS) / Ctrl+Space (Windows/Linux) ---
  const quickLaunchKey = isMac ? 'Alt+Space' : 'Ctrl+Space';
  const quickLaunchRegistered = globalShortcut.register(quickLaunchKey, () => {
    toggleQuickLaunch();
  });
  if (!quickLaunchRegistered) {
    console.warn(
      `[shortcuts] Failed to register Quick Launch shortcut: ${quickLaunchKey}`,
    );
  }

  // --- Show/Focus: Cmd+Shift+Y (macOS) / Ctrl+Shift+Y (Windows/Linux) ---
  const showKey = isMac ? 'Cmd+Shift+Y' : 'Ctrl+Shift+Y';
  const showRegistered = globalShortcut.register(showKey, () => {
    showAndFocus(mainWindow);
  });
  if (!showRegistered) {
    console.warn(
      `[shortcuts] Failed to register Show/Focus shortcut: ${showKey}`,
    );
  }

  // --- Mini Mode: Cmd+Shift+T (macOS) / Ctrl+Shift+T (Windows/Linux) ---
  const miniModeKey = isMac ? 'Cmd+Shift+T' : 'Ctrl+Shift+T';
  const miniModeRegistered = globalShortcut.register(miniModeKey, () => {
    toggleMiniMode();
  });
  if (!miniModeRegistered) {
    console.warn(
      `[shortcuts] Failed to register Mini Mode shortcut: ${miniModeKey}`,
    );
  }

  // --- Screenshot Capture: Cmd+Shift+S (macOS) / Ctrl+Shift+S (Windows/Linux) ---
  const screenshotKey = isMac ? 'Cmd+Shift+S' : 'Ctrl+Shift+S';
  const screenshotRegistered = globalShortcut.register(screenshotKey, () => {
    // TODO: Implement actual screenshot capture
    console.log('[shortcuts] Screenshot capture triggered');
    mainWindow.webContents.send('screenshot:capture');
  });
  if (!screenshotRegistered) {
    console.warn(
      `[shortcuts] Failed to register Screenshot shortcut: ${screenshotKey}`,
    );
  }

  // --- Clipboard Context Question: Cmd+Shift+V (macOS) / Ctrl+Shift+V (Windows/Linux) ---
  const clipboardShortcut = 'CommandOrControl+Shift+V';
  const clipboardRegistered = globalShortcut.register(clipboardShortcut, () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
      mainWindow.webContents.send('app:clipboard-question');
    }
  });
  if (!clipboardRegistered) {
    console.warn(
      `[shortcuts] Failed to register Clipboard Question shortcut: ${clipboardShortcut}`,
    );
  }

  console.log('[shortcuts] Global shortcuts registered');
}

/**
 * Unregister all global shortcuts.
 * Must be called on app quit to release system-wide key bindings.
 */
export function unregisterGlobalShortcuts(): void {
  globalShortcut.unregisterAll();
  console.log('[shortcuts] Global shortcuts unregistered');
}
