import React, { useState, useCallback } from 'react';
import { Globe } from 'lucide-react';
import { useAuth } from '@/contexts/DesktopAuthContext';
import TitleBar from '@/components/desktop/TitleBar';

/**
 * LoginGate — blocks app access until user is authenticated.
 * Shows a login screen when status is 'guest' or 'loading'.
 */
export default function LoginGate({ children }: { children: React.ReactNode }) {
  const { status, signInWithGoogle, loginWithEmail, signupWithEmail } = useAuth();

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [birth, setBirth] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogle = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      await signInWithGoogle();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '';
      // Ignore user-initiated cancellations
      if (
        msg.includes('popup-closed-by-user') ||
        msg.includes('cancelled-popup-request') ||
        msg.includes('popup-blocked')
      ) {
        // User closed the popup — not an error
      } else {
        setError(msg || '로그인에 실패했습니다.');
      }
    } finally {
      setLoading(false);
    }
  }, [signInWithGoogle]);

  const handleEmailLogin = useCallback(async () => {
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    setError('');
    try {
      await loginWithEmail(email, password);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [email, password, loginWithEmail]);

  const handleSignup = useCallback(async () => {
    if (!email.trim() || !password.trim() || !name.trim()) return;
    setLoading(true);
    setError('');
    try {
      await signupWithEmail({ email, password, name, phone, birth });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '회원가입에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [email, password, name, phone, birth, signupWithEmail]);

  // Loading state — show spinner
  if (status === 'loading') {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-[var(--app-bg)]">
        <TitleBar />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 rounded-full border-2 border-gray-300 border-t-gray-800 dark:border-gray-600 dark:border-t-gray-200 animate-spin" />
            <p className="text-[13px] text-[var(--text-muted)]">로딩 중...</p>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated — show app
  if (status === 'authed') {
    return <>{children}</>;
  }

  // Guest — show login screen
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gradient-to-b from-white via-gray-50/80 to-gray-100/60 dark:from-[#0e0e0e] dark:via-[#111] dark:to-[#161616]">
      <TitleBar />
      <div className="flex-1 flex items-center justify-center">
      <div className="w-full max-w-sm px-8">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-600 shadow-lg shadow-blue-500/20 flex items-center justify-center">
            <span className="text-xl font-bold text-white">Y</span>
          </div>
        </div>

        <h2 className="text-[24px] font-semibold tracking-[-0.03em] text-[var(--text-primary)] mb-1 text-center">
          {mode === 'login' ? 'YUA에 로그인' : '계정 만들기'}
        </h2>
        <p className="text-[13px] text-[var(--text-muted)] mb-8 text-center">
          {mode === 'login'
            ? '계정으로 로그인하여 시작하세요'
            : '새 계정을 만들어 YUA를 시작하세요'}
        </p>

        <div className="space-y-3">
          {/* Google */}
          <button
            onClick={handleGoogle}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 rounded-xl border border-black/[0.08] dark:border-white/[0.1] px-4 py-3 text-[14px] font-medium hover:bg-black/[0.02] dark:hover:bg-white/[0.04] transition-all duration-150 active:scale-[0.98] disabled:opacity-50"
          >
            <Globe size={18} />
            Google로 계속하기
          </button>

          {/* Divider */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-black/[0.06] dark:border-white/[0.08]" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-gray-50 dark:bg-[#111] px-3 text-[11px] text-[var(--text-muted)]">
                또는
              </span>
            </div>
          </div>

          {/* Signup extra fields */}
          {mode === 'signup' && (
            <>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="이름"
                className="w-full rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-white/[0.04] px-4 py-3 text-[14px] outline-none focus:border-blue-500 transition"
              />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="전화번호 (선택)"
                className="w-full rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-white/[0.04] px-4 py-3 text-[14px] outline-none focus:border-blue-500 transition"
              />
              <input
                type="date"
                value={birth}
                onChange={(e) => setBirth(e.target.value)}
                placeholder="생년월일 (선택)"
                className="w-full rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-white/[0.04] px-4 py-3 text-[14px] outline-none focus:border-blue-500 transition"
              />
            </>
          )}

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="이메일"
            className="w-full rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-white/[0.04] px-4 py-3 text-[14px] outline-none focus:border-blue-500 transition"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                mode === 'login' ? handleEmailLogin() : handleSignup();
              }
            }}
            className="w-full rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-white/[0.04] px-4 py-3 text-[14px] outline-none focus:border-blue-500 transition"
          />

          <button
            onClick={mode === 'login' ? handleEmailLogin : handleSignup}
            disabled={loading || !email.trim() || !password.trim() || (mode === 'signup' && !name.trim())}
            className="w-full rounded-xl bg-gray-900 dark:bg-white text-white dark:text-black px-4 py-3 text-[14px] font-medium hover:opacity-90 transition-all duration-150 active:scale-[0.98] disabled:opacity-40"
          >
            {loading
              ? '처리 중...'
              : mode === 'login'
                ? '이메일로 로그인'
                : '회원가입'}
          </button>

          {error && (
            <p className="text-[12px] text-red-500 text-center">{error}</p>
          )}
        </div>

        <button
          onClick={() => {
            setMode(mode === 'login' ? 'signup' : 'login');
            setError('');
          }}
          className="mt-6 w-full text-center text-[13px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition"
        >
          {mode === 'login' ? '계정이 없으신가요? 회원가입' : '이미 계정이 있으신가요? 로그인'}
        </button>
      </div>
      </div>
    </div>
  );
}
