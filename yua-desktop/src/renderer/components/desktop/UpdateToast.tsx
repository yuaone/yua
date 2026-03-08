import { useState, useEffect } from 'react';
import { X, Download, RefreshCw } from 'lucide-react';
import { desktop, isDesktop } from '@/lib/desktop-bridge';

type UpdateState = 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'error';

interface DownloadProgress {
  percent: number;
  bytesPerSecond: number;
  transferred: number;
  total: number;
}

export default function UpdateToast() {
  const [state, setState] = useState<UpdateState>('idle');
  const [version, setVersion] = useState('');
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!isDesktop) return;

    const unsubs: (() => void)[] = [];

    // Update available
    const offAvailable = desktop!.onUpdateAvailable?.((info: any) => {
      setVersion(info?.version ?? '');
      setState('available');
      setDismissed(false);
    });
    if (offAvailable) unsubs.push(offAvailable);

    // Status changes (checking, up-to-date)
    const offStatus = desktop!.onUpdateStatus?.((status: string) => {
      if (status === 'checking') {
        setState('checking');
        setDismissed(false);
      } else if (status === 'up-to-date') {
        setState('idle');
      }
    });
    if (offStatus) unsubs.push(offStatus);

    // Download progress
    const offProgress = desktop!.onUpdateProgress?.((prog: unknown) => {
      setState('downloading');
      setProgress(prog as DownloadProgress);
    });
    if (offProgress) unsubs.push(offProgress);

    // Download complete
    const offDownloaded = desktop!.onUpdateDownloaded?.((info: any) => {
      setVersion(info?.version ?? version);
      setState('downloaded');
      setDismissed(false);
    });
    if (offDownloaded) unsubs.push(offDownloaded);

    return () => unsubs.forEach((fn) => fn());
  }, []);

  if (!isDesktop || state === 'idle' || dismissed) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-[slideUp_0.3s_ease-out]">
      <div className="flex items-center gap-3 rounded-xl bg-white dark:bg-[#2a2a2a] shadow-lg border border-gray-200 dark:border-[var(--line)] px-4 py-3 min-w-[320px]">
        {state === 'checking' && (
          <>
            <RefreshCw size={16} className="text-blue-500 animate-spin" />
            <span className="text-sm text-[var(--text-primary)]">
              업데이트 확인 중...
            </span>
          </>
        )}

        {state === 'available' && (
          <>
            <Download size={16} className="text-blue-500" />
            <div className="flex-1">
              <div className="text-sm font-medium text-[var(--text-primary)]">
                새 버전 사용 가능 {version && `(v${version})`}
              </div>
              <div className="text-xs text-[var(--text-muted)] mt-0.5">
                다운로드 중...
              </div>
            </div>
          </>
        )}

        {state === 'downloading' && (
          <>
            <Download size={16} className="text-blue-500" />
            <div className="flex-1">
              <div className="text-sm font-medium text-[var(--text-primary)]">
                업데이트 다운로드 중 {version && `(v${version})`}
              </div>
              <div className="mt-1.5 h-1.5 w-full rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${progress?.percent ?? 0}%` }}
                />
              </div>
              <div className="text-xs text-[var(--text-muted)] mt-0.5">
                {Math.round(progress?.percent ?? 0)}%
              </div>
            </div>
          </>
        )}

        {state === 'downloaded' && (
          <>
            <Download size={16} className="text-green-500" />
            <div className="flex-1">
              <div className="text-sm font-medium text-[var(--text-primary)]">
                업데이트 준비 완료
              </div>
              <div className="text-xs text-[var(--text-muted)] mt-0.5">
                재시작하여 업데이트를 적용합니다
              </div>
            </div>
            <button
              onClick={() => desktop?.installUpdate()}
              className="rounded-lg bg-blue-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-600 transition"
            >
              재시작
            </button>
          </>
        )}

        {state === 'error' && (
          <span className="text-red-500 text-sm">업데이트 확인 실패</span>
        )}

        <button
          onClick={() => setDismissed(true)}
          className="ml-auto rounded-full p-1 hover:bg-gray-100 dark:hover:bg-white/10 transition"
        >
          <X size={14} className="text-[var(--text-muted)]" />
        </button>
      </div>
    </div>
  );
}
