import { app, BrowserWindow } from 'electron';

export interface DeepLinkRoute {
  action: 'auth' | 'chat' | 'new' | 'settings' | 'unknown';
  params: Record<string, string>;
}

/**
 * Parse a yua:// deep link URL into a structured route.
 *
 * Examples:
 *   yua://auth?code=xxx        → { action: 'auth', params: { code: 'xxx' } }
 *   yua://chat/abc123          → { action: 'chat', params: { threadId: 'abc123' } }
 *   yua://new                  → { action: 'new', params: {} }
 *   yua://settings             → { action: 'settings', params: {} }
 */
export function parseDeepLink(url: string): DeepLinkRoute {
  try {
    const parsed = new URL(url);
    // For custom protocols like yua://auth, the hostname is 'auth'
    // and pathname is '/' (or '/threadId' for yua://chat/threadId).
    const pathname = parsed.hostname || parsed.pathname.replace(/^\/+/, '');
    const params: Record<string, string> = {};
    parsed.searchParams.forEach((v, k) => {
      params[k] = v;
    });

    if (pathname === 'auth') {
      return { action: 'auth', params };
    }

    if (pathname === 'chat') {
      // yua://chat/threadId → pathname after hostname is '/threadId'
      const threadId = parsed.pathname.replace(/^\/+/, '') || '';
      return { action: 'chat', params: { ...params, threadId } };
    }

    if (pathname.startsWith('chat/')) {
      const threadId = pathname.split('/')[1] ?? '';
      return { action: 'chat', params: { ...params, threadId } };
    }

    if (pathname === 'new') {
      return { action: 'new', params };
    }

    if (pathname === 'settings') {
      return { action: 'settings', params };
    }

    return { action: 'unknown', params: { raw: url } };
  } catch {
    return { action: 'unknown', params: { raw: url } };
  }
}

/**
 * Handle an incoming deep link URL — focus the window and forward
 * both the raw URL and the parsed route to the renderer process.
 */
export function handleDeepLink(
  url: string,
  mainWindow: BrowserWindow | null,
): void {
  const route = parseDeepLink(url);

  if (!mainWindow || mainWindow.isDestroyed()) return;

  // Bring the window to the foreground
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();

  // Send both the raw URL and the parsed route to the renderer
  mainWindow.webContents.send('deep-link', url);
  mainWindow.webContents.send('deep-link:route', route);
}

/**
 * Wire up OS-level deep link events.
 * macOS delivers URLs via the `open-url` app event.
 * Windows/Linux deliver them via `second-instance` argv (handled in main/index.ts).
 */
export function setupDeepLinkHandlers(mainWindow: BrowserWindow): void {
  // macOS: open-url fires when the app is already running and the OS
  // opens a yua:// link.
  app.on('open-url', (event: Electron.Event, url: string) => {
    event.preventDefault();
    handleDeepLink(url, mainWindow);
  });
}
