import { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';

export function NetworkBanner() {
  const [online, setOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  if (online) return null;

  return (
    <div className="fixed top-12 left-0 right-0 z-50 flex items-center justify-center gap-2 bg-amber-600 px-4 py-1.5 text-xs font-medium text-white">
      <WifiOff size={14} />
      <span>인터넷에 연결되지 않았습니다</span>
    </div>
  );
}
