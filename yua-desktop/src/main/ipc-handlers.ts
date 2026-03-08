import {
  ipcMain,
  BrowserWindow,
  dialog,
  clipboard,
  safeStorage,
  shell,
  powerSaveBlocker,
} from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { app } from 'electron';

const TOKEN_FILE = 'yua-auth-token';

let powerBlockerId: number | null = null;

function getTokenPath(): string {
  return path.join(app.getPath('userData'), TOKEN_FILE);
}

export function registerIpcHandlers(): void {
  // --- Window controls ---
  ipcMain.on('window:minimize', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.minimize();
  });

  ipcMain.on('window:maximize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win?.isMaximized()) win.unmaximize();
    else win?.maximize();
  });

  ipcMain.on('window:close', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.close();
  });

  ipcMain.handle('window:is-maximized', (event) => {
    return (
      BrowserWindow.fromWebContents(event.sender)?.isMaximized() ?? false
    );
  });

  ipcMain.handle('window:toggle-always-on-top', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return false;
    const next = !win.isAlwaysOnTop();
    win.setAlwaysOnTop(next);
    return next;
  });

  // --- File operations ---
  ipcMain.handle('file:open', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return null;
    const result = await dialog.showOpenDialog(win, {
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'All Files', extensions: ['*'] },
        {
          name: 'Images',
          extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'],
        },
        {
          name: 'Documents',
          extensions: ['pdf', 'docx', 'csv', 'xlsx', 'json', 'txt'],
        },
      ],
    });
    if (result.canceled) return null;
    return result.filePaths;
  });

  ipcMain.handle(
    'file:save',
    async (_event, data: ArrayBuffer, name: string) => {
      const result = await dialog.showSaveDialog({ defaultPath: name });
      if (result.canceled || !result.filePath) return null;
      fs.writeFileSync(result.filePath, Buffer.from(data));
      return result.filePath;
    },
  );

  ipcMain.on('file:show-in-folder', (_event, filePath: string) => {
    // Validate path: must be absolute and exist on disk
    if (typeof filePath !== 'string' || !path.isAbsolute(filePath)) return;
    if (!fs.existsSync(filePath)) return;
    shell.showItemInFolder(filePath);
  });

  // --- Auth (safeStorage) ---
  ipcMain.handle('auth:get-token', () => {
    const tokenPath = getTokenPath();
    if (!fs.existsSync(tokenPath)) return null;
    try {
      const encrypted = fs.readFileSync(tokenPath);
      return safeStorage.decryptString(encrypted);
    } catch {
      return null;
    }
  });

  ipcMain.handle('auth:set-token', (_event, token: string) => {
    const encrypted = safeStorage.encryptString(token);
    fs.writeFileSync(getTokenPath(), encrypted);
    return true;
  });

  ipcMain.handle('auth:delete-token', () => {
    const tokenPath = getTokenPath();
    if (fs.existsSync(tokenPath)) fs.unlinkSync(tokenPath);
    return true;
  });

  // --- Mini Mode ---
  ipcMain.on('window:mini-toggle', () => {
    const { toggleMiniMode } = require('./window-manager');
    toggleMiniMode();
  });

  // --- Power management ---
  ipcMain.on('power:prevent-sleep', () => {
    if (powerBlockerId === null) {
      powerBlockerId = powerSaveBlocker.start('prevent-app-suspension');
    }
  });

  ipcMain.on('power:allow-sleep', () => {
    if (powerBlockerId !== null && powerSaveBlocker.isStarted(powerBlockerId)) {
      powerSaveBlocker.stop(powerBlockerId);
      powerBlockerId = null;
    }
  });

  // --- Clipboard ---
  ipcMain.handle('clipboard:read', () => clipboard.readText());

  ipcMain.handle('clipboard:write', (_event, text: string) => {
    clipboard.writeText(text);
    return true;
  });
}
