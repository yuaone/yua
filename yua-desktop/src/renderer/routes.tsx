import { Routes, Route } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import AppSidebar from './components/sidebar/AppSidebar';
import { ChatOverview } from './components/chat/ChatOverview';
import ChatMain from './components/chat/ChatMain';

function DesktopLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell sidebar={<AppSidebar />}>
      {children}
    </AppShell>
  );
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<DesktopLayout><ChatOverview /></DesktopLayout>} />
      <Route path="/chat" element={<DesktopLayout><ChatOverview /></DesktopLayout>} />
      <Route path="/chat/:threadId" element={<DesktopLayout><ChatMain /></DesktopLayout>} />
    </Routes>
  );
}
