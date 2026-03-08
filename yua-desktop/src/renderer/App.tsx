import { useState, useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AppRoutes } from './routes';
import { DesktopAuthProvider, useAuth } from './contexts/DesktopAuthContext';
import QuickLaunch from './components/desktop/QuickLaunch';
import MiniMode from './components/desktop/MiniMode';
import UpdateToast from './components/desktop/UpdateToast';
import { NetworkBanner } from './components/desktop/NetworkBanner';
import CommandPalette from './components/desktop/CommandPalette';
import ScreenshotOverlay from './components/desktop/ScreenshotOverlay';
import Onboarding from './components/desktop/Onboarding';
import LoginGate from './components/desktop/LoginGate';
import { isDesktop } from '@/lib/desktop-bridge';

// Quick Launch is loaded as a separate BrowserWindow with hash #/quick-launch.
// Mini Mode is loaded as a separate BrowserWindow with hash #/mini.
// We detect them here and render the appropriate component without AppShell.
const isQuickLaunch = window.location.hash === '#/quick-launch';
const isMiniMode = window.location.hash === '#/mini';

export default function App() {
  const [showOnboarding, setShowOnboarding] = useState(() => {
    try {
      return localStorage.getItem('yua.onboarding.done') !== '1';
    } catch {
      return true;
    }
  });
  const [screenshotOpen, setScreenshotOpen] = useState(false);

  useEffect(() => {
    if (!isDesktop) return;
    const unsub = window.yuaDesktop?.onScreenshotCapture?.(() => {
      setScreenshotOpen(true);
    });
    return () => {
      unsub?.();
    };
  }, []);

  // Block Backspace from navigating back (Electron frameless window quirk)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Backspace') return;
      const tag = (e.target as HTMLElement)?.tagName;
      const editable = (e.target as HTMLElement)?.isContentEditable;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || editable) return;
      e.preventDefault();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  if (isQuickLaunch) {
    return <QuickLaunch />;
  }

  if (isMiniMode) {
    return <MiniMode />;
  }

  return (
    <BrowserRouter>
      <DesktopAuthProvider>
        {showOnboarding ? (
          <Onboarding onComplete={() => setShowOnboarding(false)} />
        ) : (
          <LoginGate>
            <div className="app-shell">
              <AppRoutes />
            </div>
            <NetworkBanner />
            <UpdateToast />
            <CommandPalette />
            <ScreenshotOverlay
              open={screenshotOpen}
              onClose={() => setScreenshotOpen(false)}
              onCapture={(dataUrl) => {
                // TODO: attach to chat input via store
                console.log('[screenshot] Captured, size:', dataUrl.length);
              }}
            />
          </LoginGate>
        )}
      </DesktopAuthProvider>
    </BrowserRouter>
  );
}
