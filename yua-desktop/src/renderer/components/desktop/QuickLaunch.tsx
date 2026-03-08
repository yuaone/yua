import { useState, useRef, useEffect, useCallback } from 'react';

const COLLAPSED_HEIGHT = 80;
const EXPANDED_HEIGHT = 360;

export default function QuickLaunch() {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const expanded = response.length > 0 || loading;

  // Auto-focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Resize the window when expanded state changes
  useEffect(() => {
    const height = expanded ? EXPANDED_HEIGHT : COLLAPSED_HEIGHT;
    window.yuaDesktop?.quickLaunchResize(height);
  }, [expanded]);

  const handleClose = useCallback(() => {
    window.yuaDesktop?.quickLaunchClose();
  }, []);

  const handleOpenFull = useCallback(() => {
    window.yuaDesktop?.quickLaunchOpenFull();
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
        return;
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        handleOpenFull();
        return;
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!query.trim()) return;
        // TODO: Wire up actual chat streaming in later batch
        setLoading(true);
        // Simulate a placeholder response for now
        setTimeout(() => {
          setResponse(
            '이 기능은 추후 배치에서 실제 채팅 스트리밍과 연결됩니다.',
          );
          setLoading(false);
        }, 1200);
      }
    },
    [query, handleClose, handleOpenFull],
  );

  return (
    <div className="flex flex-col w-full h-full select-none">
      {/* Draggable background — entire window is transparent so we handle it here */}
      <div className="flex flex-col w-full h-full bg-white/80 dark:bg-[#1b1b1b]/90 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden border border-white/20 dark:border-white/10">
        {/* Input area */}
        <div className="flex items-center gap-3 px-5 py-4">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
            <span className="text-white text-sm font-bold">Y</span>
          </div>
          <textarea
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="YUA에게 질문하기..."
            rows={1}
            className="flex-1 bg-transparent text-[15px] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none resize-none leading-relaxed"
            style={{ caretColor: '#6366f1' }}
          />
        </div>

        {/* Response area (expanded) */}
        {expanded && (
          <div className="flex-1 px-5 pb-4 overflow-y-auto">
            <div className="border-t border-gray-200/50 dark:border-white/10 pt-4">
              {loading && !response && (
                <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                  <span>사고 중...</span>
                </div>
              )}
              {response && (
                <div className="text-sm text-gray-900 dark:text-gray-100 leading-relaxed whitespace-pre-wrap">
                  {response}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer hints */}
        <div className="px-5 py-2 text-[11px] text-gray-400 dark:text-gray-500 border-t border-gray-200/30 dark:border-white/5 flex items-center gap-4">
          <span>Shift+Enter: 줄바꿈</span>
          <span>Enter: 전송</span>
          <span>Tab: 전체 앱 열기</span>
          <span>Esc: 닫기</span>
        </div>
      </div>
    </div>
  );
}
