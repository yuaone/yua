import { useState, useCallback } from 'react';
import { ChevronRight, Globe, Bell, Rocket, Keyboard } from 'lucide-react';
import { useAuth } from '@/contexts/DesktopAuthContext';
import { isDesktop } from '@/lib/desktop-bridge';

type Step = 'welcome' | 'login' | 'permissions' | 'tour' | 'done';

const TOUR_ITEMS = [
  {
    icon: '💬',
    title: '사이드바',
    desc: '대화 목록과 프로젝트를 관리하세요. Cmd/Ctrl+B로 토글합니다.',
  },
  {
    icon: '✍️',
    title: '채팅 입력',
    desc: '파일을 드래그하거나 모델을 선택하여 질문하세요.',
  },
  {
    icon: '⚡',
    title: 'Quick Launch',
    desc: 'Opt+Space로 어디서든 빠르게 YUA를 호출하세요.',
  },
  {
    icon: '🧠',
    title: 'Deep Thinking',
    desc: '복잡한 질문에는 사고 모드를 활성화하세요.',
  },
];

export default function Onboarding({
  onComplete,
}: {
  onComplete: () => void;
}) {
  const [step, setStep] = useState<Step>('welcome');
  const [tourIndex, setTourIndex] = useState(0);
  const { signInWithGoogle, loginWithEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const next = useCallback(
    (nextStep: Step) => {
      if (nextStep === 'done') {
        try {
          localStorage.setItem('yua.onboarding.done', '1');
        } catch {
          // ignore
        }
        onComplete();
        return;
      }
      setStep(nextStep);
    },
    [onComplete],
  );

  const handleGoogleLogin = useCallback(async () => {
    setLoginLoading(true);
    setLoginError('');
    try {
      await signInWithGoogle();
      next('permissions');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '';
      if (
        msg.includes('popup-closed-by-user') ||
        msg.includes('cancelled-popup-request') ||
        msg.includes('popup-blocked')
      ) {
        // User closed popup — ignore
      } else {
        setLoginError(msg || '로그인에 실패했습니다.');
      }
    } finally {
      setLoginLoading(false);
    }
  }, [signInWithGoogle, next]);

  const handleEmailLogin = useCallback(async () => {
    if (!email.trim() || !password.trim()) return;
    setLoginLoading(true);
    setLoginError('');
    try {
      await loginWithEmail(email, password);
      next('permissions');
    } catch (e: unknown) {
      const msg =
        e instanceof Error ? e.message : '로그인에 실패했습니다.';
      setLoginError(msg);
    } finally {
      setLoginLoading(false);
    }
  }, [email, password, loginWithEmail, next]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-b from-white via-gray-50/80 to-gray-100/60 dark:from-[#0e0e0e] dark:via-[#111] dark:to-[#161616]">
      {/* Skip button — only on permissions/tour steps (login is required) */}
      {(step === 'permissions' || step === 'tour') && (
        <button
          onClick={() => next('done')}
          className="absolute top-6 right-6 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition"
        >
          건너뛰기
        </button>
      )}

      <div className="w-full max-w-lg px-8">
        {/* ========== Welcome ========== */}
        {step === 'welcome' && (
          <div className="text-center animate-[fadeIn_0.5s_ease-out]">
            {/* Animated gradient sphere logo */}
            <div className="mx-auto mb-10 w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-600 shadow-[0_8px_40px_rgba(99,102,241,0.25)] flex items-center justify-center animate-[fadeIn_0.8s_ease-out]">
              <span className="text-2xl font-bold text-white tracking-tight">Y</span>
            </div>

            <h1 className="text-[34px] font-semibold tracking-[-0.04em] text-[var(--text-primary)] mb-3 leading-tight">
              YUA에 오신 것을 환영합니다
            </h1>
            <p className="text-[15px] text-[var(--text-muted)] mb-12 max-w-xs mx-auto leading-relaxed">
              항상 곁에 있는 AI 비서 &mdash; 브라우저를 열지 않아도, 단축키 하나로.
            </p>

            <button
              onClick={() => next('login')}
              className="inline-flex items-center gap-2 rounded-xl bg-gray-900 dark:bg-white px-8 py-3 text-white dark:text-black text-[15px] font-medium hover:opacity-90 transition-all duration-200 active:scale-[0.97] shadow-lg shadow-black/10"
            >
              시작하기
              <ChevronRight size={18} />
            </button>
          </div>
        )}

        {/* ========== Login ========== */}
        {step === 'login' && (
          <div className="animate-[fadeIn_0.3s_ease-out]">
            <h2 className="text-[26px] font-semibold tracking-[-0.03em] text-[var(--text-primary)] mb-2 text-center">
              로그인
            </h2>
            <p className="text-[14px] text-[var(--text-muted)] mb-8 text-center">
              계정으로 로그인하여 대화를 동기화하세요
            </p>

            <div className="space-y-3">
              <button
                onClick={handleGoogleLogin}
                disabled={loginLoading}
                className="w-full flex items-center justify-center gap-3 rounded-xl border border-black/[0.08] dark:border-white/[0.1] px-4 py-3 text-[14px] font-medium hover:bg-black/[0.02] dark:hover:bg-white/[0.04] transition-all duration-150 active:scale-[0.98] disabled:opacity-50"
              >
                <Globe size={18} />
                Google로 계속하기
              </button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200 dark:border-[var(--line)]" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-gray-50 dark:bg-[#0a0a0a] px-3 text-xs text-[var(--text-muted)]">
                    또는
                  </span>
                </div>
              </div>

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="이메일"
                className="w-full rounded-xl border border-gray-200 dark:border-[var(--line)] bg-white dark:bg-white/5 px-4 py-3 text-sm outline-none focus:border-blue-500 transition"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleEmailLogin();
                }}
                className="w-full rounded-xl border border-gray-200 dark:border-[var(--line)] bg-white dark:bg-white/5 px-4 py-3 text-sm outline-none focus:border-blue-500 transition"
              />

              <button
                onClick={handleEmailLogin}
                disabled={loginLoading || !email.trim() || !password.trim()}
                className="w-full rounded-xl bg-[var(--text-primary)] text-white dark:text-black px-4 py-3 text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
              >
                {loginLoading ? '로그인 중...' : '이메일로 로그인'}
              </button>

              {loginError && (
                <p className="text-xs text-red-500 text-center">
                  {loginError}
                </p>
              )}
            </div>

            {/* 로그인 필수 — 게스트 진입 차단 */}
          </div>
        )}

        {/* ========== Permissions ========== */}
        {step === 'permissions' && (
          <div className="animate-[fadeIn_0.3s_ease-out]">
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2 text-center">
              설정
            </h2>
            <p className="text-sm text-[var(--text-secondary)] mb-8 text-center">
              편의 기능을 활성화하세요
            </p>

            <div className="space-y-3">
              <PermissionItem
                icon={<Bell size={20} />}
                title="알림 허용"
                desc="새 메시지와 업데이트를 알림으로 받습니다"
                onEnable={() => {
                  if (isDesktop) Notification.requestPermission();
                }}
              />
              <PermissionItem
                icon={<Rocket size={20} />}
                title="시작 시 자동 실행"
                desc="컴퓨터를 켜면 YUA가 자동으로 시작됩니다"
                onEnable={() => {
                  // Auto-launch via IPC
                  window.yuaDesktop?.setAutoLaunch?.(true);
                }}
              />
              <PermissionItem
                icon={<Keyboard size={20} />}
                title="Quick Launch 단축키"
                desc="Opt+Space로 어디서든 YUA를 호출합니다"
                defaultEnabled
              />
            </div>

            <button
              onClick={() => next('tour')}
              className="mt-8 w-full rounded-xl bg-blue-500 px-4 py-3 text-white font-medium hover:bg-blue-600 transition"
            >
              다음
            </button>
          </div>
        )}

        {/* ========== Tour ========== */}
        {step === 'tour' && (
          <div className="animate-[fadeIn_0.3s_ease-out]">
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2 text-center">
              빠른 투어
            </h2>
            <p className="text-sm text-[var(--text-secondary)] mb-8 text-center">
              YUA의 핵심 기능을 알아보세요
            </p>

            <div className="rounded-2xl border border-gray-200 dark:border-[var(--line)] bg-white dark:bg-white/5 p-6 text-center min-h-[200px] flex flex-col items-center justify-center">
              <span className="text-4xl mb-4">
                {TOUR_ITEMS[tourIndex].icon}
              </span>
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                {TOUR_ITEMS[tourIndex].title}
              </h3>
              <p className="text-sm text-[var(--text-secondary)] max-w-xs">
                {TOUR_ITEMS[tourIndex].desc}
              </p>
            </div>

            {/* Progress dots */}
            <div className="flex items-center justify-center gap-2 mt-4">
              {TOUR_ITEMS.map((_, i) => (
                <div
                  key={i}
                  className={`h-2 rounded-full transition-all ${
                    i === tourIndex
                      ? 'bg-blue-500 w-6'
                      : 'bg-gray-300 dark:bg-gray-600 w-2'
                  }`}
                />
              ))}
            </div>

            <div className="mt-6 flex gap-3">
              {tourIndex > 0 && (
                <button
                  onClick={() => setTourIndex((i) => i - 1)}
                  className="flex-1 rounded-xl border border-gray-200 dark:border-[var(--line)] px-4 py-3 text-sm font-medium hover:bg-gray-50 dark:hover:bg-white/5 transition"
                >
                  이전
                </button>
              )}
              <button
                onClick={() => {
                  if (tourIndex < TOUR_ITEMS.length - 1) {
                    setTourIndex((i) => i + 1);
                  } else {
                    next('done');
                  }
                }}
                className="flex-1 rounded-xl bg-blue-500 px-4 py-3 text-white font-medium hover:bg-blue-600 transition"
              >
                {tourIndex < TOUR_ITEMS.length - 1
                  ? '다음'
                  : '시작하기'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ========================================
   PermissionItem — toggle row
======================================== */

function PermissionItem({
  icon,
  title,
  desc,
  onEnable,
  defaultEnabled = false,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  onEnable?: () => void;
  defaultEnabled?: boolean;
}) {
  const [enabled, setEnabled] = useState(defaultEnabled);

  return (
    <div className="flex items-center gap-4 rounded-xl border border-gray-200 dark:border-[var(--line)] bg-white dark:bg-white/5 px-4 py-3">
      <div className="text-[var(--text-muted)]">{icon}</div>
      <div className="flex-1">
        <div className="text-sm font-medium text-[var(--text-primary)]">
          {title}
        </div>
        <div className="text-xs text-[var(--text-muted)] mt-0.5">{desc}</div>
      </div>
      <button
        onClick={() => {
          const next = !enabled;
          setEnabled(next);
          if (next) onEnable?.();
        }}
        className={`relative w-11 h-6 rounded-full transition-colors ${
          enabled ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
            enabled ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}
