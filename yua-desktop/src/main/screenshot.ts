import { desktopCapturer, ipcMain, screen } from 'electron';

export function registerScreenshotHandlers(): void {
  // Get available sources for screenshot
  ipcMain.handle('screenshot:get-sources', async () => {
    try {
      const sources = await desktopCapturer.getSources({
        types: ['screen', 'window'],
        thumbnailSize: { width: 1920, height: 1080 },
        fetchWindowIcons: true,
      });

      return sources.map((source) => ({
        id: source.id,
        name: source.name,
        thumbnail: source.thumbnail.toDataURL(),
        appIcon: source.appIcon?.toDataURL() ?? null,
        display_id: source.display_id,
      }));
    } catch {
      return [];
    }
  });

  // Capture a specific source as full screenshot
  ipcMain.handle('screenshot:capture', async (_event, sourceId?: string) => {
    try {
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: screen.getPrimaryDisplay().workAreaSize,
      });

      const source = sourceId
        ? sources.find((s) => s.id === sourceId)
        : sources[0]; // Default to primary screen

      if (!source) return null;

      return {
        dataUrl: source.thumbnail.toDataURL(),
        width: source.thumbnail.getSize().width,
        height: source.thumbnail.getSize().height,
        name: source.name,
      };
    } catch {
      return null;
    }
  });
}
