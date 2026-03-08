import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  MessageSquare, Search, Camera, Paperclip, Clipboard,
  Settings, Moon, Sun, Plus,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSidebarStore } from '@/stores/useSidebarStore';
import { useSettingsUI } from '@/stores/useSettingsUI';
import { useThemePreference } from '@/hooks/useThemePreference';

interface Command {
  id: string;
  label: string;
  category: '최근' | '채팅' | '도구' | '설정';
  icon: React.ReactNode;
  action: () => void;
  keywords?: string[];
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { threads } = useSidebarStore();
  const { openSettings } = useSettingsUI();
  const { resolvedMode, setMode } = useThemePreference();

  // Toggle on Cmd/Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
        setQuery('');
        setSelectedIndex(0);
      }
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Build command list
  const commands = useMemo((): Command[] => {
    const cmds: Command[] = [
      {
        id: 'new-chat',
        label: '새 대화 시작',
        category: '채팅',
        icon: <Plus size={16} />,
        action: () => navigate('/chat'),
        keywords: ['new', 'chat', '새', '대화'],
      },
      {
        id: 'search',
        label: '대화 검색',
        category: '채팅',
        icon: <Search size={16} />,
        action: () => {
          /* TODO: focus sidebar search */
        },
        keywords: ['search', '검색', 'find'],
      },
      {
        id: 'screenshot',
        label: '스크린샷 캡처',
        category: '도구',
        icon: <Camera size={16} />,
        action: () => {
          /* TODO: trigger screenshot */
        },
        keywords: ['screenshot', '캡처', '스크린샷'],
      },
      {
        id: 'file-attach',
        label: '파일 첨부',
        category: '도구',
        icon: <Paperclip size={16} />,
        action: () => {
          /* TODO: open file dialog */
        },
        keywords: ['file', '파일', 'attach', '첨부'],
      },
      {
        id: 'clipboard',
        label: '클립보드 내용 보내기',
        category: '도구',
        icon: <Clipboard size={16} />,
        action: () => {
          /* TODO: read clipboard */
        },
        keywords: ['clipboard', '클립보드', 'paste'],
      },
      {
        id: 'theme-toggle',
        label: resolvedMode === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환',
        category: '설정',
        icon: resolvedMode === 'dark' ? <Sun size={16} /> : <Moon size={16} />,
        action: () => setMode(resolvedMode === 'dark' ? 'light' : 'dark'),
        keywords: ['theme', '테마', 'dark', 'light', '다크', '라이트'],
      },
      {
        id: 'settings',
        label: '설정 열기',
        category: '설정',
        icon: <Settings size={16} />,
        action: () => openSettings(),
        keywords: ['settings', '설정', 'preferences'],
      },
    ];

    // Add recent threads as commands
    const recentThreads = (threads ?? []).slice(0, 5);
    for (const t of recentThreads) {
      cmds.push({
        id: `thread-${t.id}`,
        label: t.title || `Thread ${t.id}`,
        category: '최근',
        icon: <MessageSquare size={16} />,
        action: () => navigate(`/chat/${t.id}`),
        keywords: [t.title?.toLowerCase() ?? ''],
      });
    }

    return cmds;
  }, [threads, resolvedMode, navigate, openSettings, setMode]);

  // Fuzzy filter
  const filtered = useMemo(() => {
    if (!query.trim()) return commands;
    const q = query.toLowerCase();
    return commands.filter((cmd) => {
      const haystack = [cmd.label, ...(cmd.keywords ?? [])].join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }, [commands, query]);

  // Group by category
  const grouped = useMemo(() => {
    const groups: Record<string, Command[]> = {};
    const order = ['최근', '채팅', '도구', '설정'];
    for (const cmd of filtered) {
      if (!groups[cmd.category]) groups[cmd.category] = [];
      groups[cmd.category].push(cmd);
    }
    return order
      .filter((cat) => groups[cat]?.length)
      .map((cat) => ({
        category: cat,
        commands: groups[cat],
      }));
  }, [filtered]);

  // Flatten for keyboard nav
  const flatList = useMemo(() => grouped.flatMap((g) => g.commands), [grouped]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, flatList.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const cmd = flatList[selectedIndex];
        if (cmd) {
          cmd.action();
          setOpen(false);
        }
      }
    },
    [flatList, selectedIndex],
  );

  // Reset selection on query change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Scroll selected into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  if (!open) return null;

  let flatIndex = -1;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
        onClick={() => setOpen(false)}
      />

      {/* Palette */}
      <div className="relative z-10 w-[560px] rounded-2xl bg-white dark:bg-[#1e1e1e] shadow-2xl border border-gray-200 dark:border-[var(--line)] overflow-hidden animate-[fadeIn_0.1s_ease-out]">
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-[var(--line)]">
          <Search size={18} className="text-[var(--text-muted)] shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="명령어를 입력하세요..."
            className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none"
          />
          <kbd className="text-[10px] text-[var(--text-muted)] bg-gray-100 dark:bg-white/5 rounded px-1.5 py-0.5">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[360px] overflow-y-auto py-2">
          {grouped.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">
              결과가 없습니다
            </div>
          )}
          {grouped.map(({ category, commands: cmds }) => (
            <div key={category}>
              <div className="px-4 py-1.5 text-[11px] font-semibold tracking-wider text-[var(--text-muted)] uppercase">
                {category}
              </div>
              {cmds.map((cmd) => {
                flatIndex++;
                const idx = flatIndex;
                const isSelected = idx === selectedIndex;
                return (
                  <button
                    key={cmd.id}
                    data-index={idx}
                    onClick={() => {
                      cmd.action();
                      setOpen(false);
                    }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition ${
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400'
                        : 'text-[var(--text-primary)] hover:bg-gray-50 dark:hover:bg-white/5'
                    }`}
                  >
                    <span className={isSelected ? 'text-blue-500' : 'text-[var(--text-muted)]'}>
                      {cmd.icon}
                    </span>
                    <span className="flex-1 text-left">{cmd.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 px-4 py-2 border-t border-gray-100 dark:border-[var(--line)] text-[10px] text-[var(--text-muted)]">
          <span>↑↓ 이동</span>
          <span>Enter 선택</span>
          <span>Esc 닫기</span>
        </div>
      </div>
    </div>
  );
}
