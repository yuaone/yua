import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from 'react';

import {
  GoogleAuthProvider,
  signInWithPopup,
  linkWithPopup,
  signOut,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  EmailAuthProvider,
  linkWithCredential,
  type User,
} from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/firebase.client';

import type { AuthContextContract, AuthProfile } from 'yua-shared';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';

/* =========================
   Types
========================= */

type AuthMachineState =
  | 'booting'
  | 'guest'
  | 'guest_booting'
  | 'authed'
  | 'onboarding_required'
  | 'error';

type AuthContextValue = AuthContextContract & {
  state: AuthMachineState;
  error: string | null;
};

/* =========================
   API helpers
========================= */

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ?? 'https://api.yuaone.com';

/**
 * apiUrl (SSOT)
 * Normalises API_BASE + path so /api is never duplicated.
 */
function apiUrl(path: string) {
  const base = String(API_BASE).replace(/\/$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;

  const baseHasApi = /\/api$/.test(base);
  const pathHasApi = /^\/api(\/|$)/.test(p);

  if (baseHasApi && pathHasApi) return `${base}${p.replace(/^\/api/, '')}`;
  if (!baseHasApi && !pathHasApi) return `${base}/api${p}`;
  return `${base}${p}`;
}

/* =========================
   safeStorage helpers
========================= */

async function saveTokenToSafeStorage(token: string): Promise<void> {
  try {
    await window.yuaDesktop?.setSecureToken(token);
  } catch {
    // safeStorage not available — silently ignore
  }
}

async function restoreTokenFromSafeStorage(): Promise<string | null> {
  try {
    return (await window.yuaDesktop?.getSecureToken()) ?? null;
  } catch {
    return null;
  }
}

async function deleteTokenFromSafeStorage(): Promise<void> {
  try {
    await window.yuaDesktop?.deleteSecureToken();
  } catch {
    // ignore
  }
}

/* =========================
   Context
========================= */

const AuthContext = createContext<AuthContextValue | null>(null);

/* =========================
   Provider
========================= */

export function DesktopAuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = getFirebaseAuth();

  const [state, setState] = useState<AuthMachineState>('booting');
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);

  const status = useMemo<'guest' | 'loading' | 'authed'>(() => {
    if (state === 'booting' || state === 'guest_booting') return 'loading';
    if (state === 'authed' || state === 'onboarding_required') return 'authed';
    return 'guest';
  }, [state]);

  const computeAuthedState = useCallback(
    (nextProfile: AuthProfile, user: User | null): AuthMachineState => {
      if (!nextProfile?.workspace?.id) return 'onboarding_required';
      if (!user?.isAnonymous && !nextProfile?.user?.name)
        return 'onboarding_required';
      return 'authed';
    },
    [],
  );

  /* ---------------------------------
   *  Server /me sync (SSOT)
   ---------------------------------- */
  const syncMe = useCallback(
    async (user: User) => {
      await user.getIdToken(true);
      const token = await user.getIdToken();

      // Persist token to safeStorage for next cold boot
      await saveTokenToSafeStorage(token);

      const res = await fetch(apiUrl('/me'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('unauthorized');

      const raw = await res.json();
      const data = raw?.ok
        ? ({
            user: raw.user,
            workspace: raw.workspace,
            role: raw.role,
          } as AuthProfile)
        : (raw as AuthProfile);

      const nextState = computeAuthedState(data, user);
      setProfile(data);
      setError(null);
      setState(nextState);

      // Workspace store sync (SSOT)
      const cur = useWorkspaceStore.getState().activeWorkspaceId;
      const next = data?.workspace?.id ?? null;
      if (next && (!cur || cur !== next)) {
        useWorkspaceStore.getState().setActiveWorkspaceId(next);
      }

      return data;
    },
    [computeAuthedState],
  );

  /* =========================
     Token
  ========================= */

  const getToken = useCallback(async () => {
    const currentUser = auth.currentUser ?? firebaseUser;
    if (!currentUser) return null;
    return currentUser.getIdToken();
  }, [auth, firebaseUser]);

  /* =========================
     authFetch (SSOT)
  ========================= */

  const authFetch = useCallback(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const token = await getToken();
      if (!token) {
        if (import.meta.env.DEV) {
          console.warn('[AUTH_FETCH] token not ready, skipping request');
        }
        return Promise.resolve(new Response(null, { status: 401 }));
      }

      const headers = new Headers(init?.headers ?? {});
      headers.set('Authorization', `Bearer ${token}`);

      // Workspace header (SSOT)
      const ws = useWorkspaceStore.getState().activeWorkspaceId;
      if (ws) headers.set('x-workspace-id', ws);
      if (import.meta.env.DEV) {
        console.log('[AUTH_FETCH][HEADERS]', {
          hasAuth: headers.has('Authorization'),
          workspaceId: ws ?? null,
          url: typeof input === 'string' ? input : 'URL',
        });
      }

      // FormData: never set Content-Type manually (boundary auto-set)
      const body = init?.body as unknown;
      const isFormData =
        typeof FormData !== 'undefined' && body instanceof FormData;

      if (!isFormData) {
        if (!headers.has('Content-Type') && init?.body) {
          headers.set('Content-Type', 'application/json');
        }
      }

      const url = typeof input === 'string' ? apiUrl(input) : input;
      return fetch(url, { ...init, headers });
    },
    [getToken],
  );

  /* =========================
     Firebase onAuthStateChanged + safeStorage restore
  ========================= */

  useEffect(() => {
    // Try restoring a saved token on cold boot (before Firebase resolves)
    let cancelled = false;

    (async () => {
      const savedToken = await restoreTokenFromSafeStorage();
      if (savedToken && !cancelled) {
        // Token exists — Firebase onAuthStateChanged below will handle actual auth.
        // This is just a signal that we had a previous session.
        // Firebase's own persistence (indexedDB) should restore the session automatically.
        // The saved safeStorage token is a backup for cases where Firebase persistence fails.
        if (import.meta.env.DEV) {
          console.log(
            '[DESKTOP_AUTH] safeStorage token found, awaiting Firebase restore...',
          );
        }
      }
    })();

    const unsub = onAuthStateChanged(auth, async (user) => {
      if (cancelled) return;
      setFirebaseUser(user);

      // Logged out
      if (!user) {
        setProfile(null);
        setError(null);
        setState('guest');
        return;
      }

      // Logged in — sync with server
      setError(null);
      setState('booting');

      try {
        await syncMe(user);
      } catch (err) {
        console.error('[DESKTOP_AUTH] /me sync failed', err);
        // Firebase auth succeeded but /me failed (offline, DNS, server down)
        // Allow app entry with minimal profile instead of blocking
        if (!user.isAnonymous) {
          setProfile({
            user: {
              name: user.displayName ?? user.email ?? 'User',
              email: user.email ?? '',
            },
            workspace: null,
            role: null,
          } as any);
          setError(err instanceof Error ? err.message : 'AUTH_SYNC_FAILED');
          setState('onboarding_required');
        } else {
          setProfile(null);
          setError(err instanceof Error ? err.message : 'AUTH_SYNC_FAILED');
          setState('error');
        }
      }
    });

    return () => {
      cancelled = true;
      unsub();
    };
  }, [auth, syncMe]);

  /* =========================
     Guest session
  ========================= */

  const ensureGuestSession = useCallback(async () => {
    if (state === 'booting' || state === 'guest_booting') return;
    if (auth.currentUser || firebaseUser) return;
    setError(null);
    setState('guest_booting');
    try {
      await signInAnonymously(auth);
    } catch (err) {
      const code = (err as { code?: string })?.code ?? '';
      if (code === 'auth/admin-restricted-operation') {
        // anonymous sign-in disabled — stay guest
        setError(null);
        setState('guest');
        return;
      }
      setError(err instanceof Error ? err.message : 'GUEST_BOOT_FAILED');
      setState('error');
      throw err;
    }
  }, [auth, firebaseUser, state]);

  /* =========================
     Actions
  ========================= */

  const signInWithGoogle = useCallback(async () => {
    if (state === 'booting' || state === 'guest_booting') return;

    setError(null);
    setState('booting');
    const provider = new GoogleAuthProvider();
    try {
      if (firebaseUser?.isAnonymous) {
        await linkWithPopup(firebaseUser, provider);
        return;
      }
      await signInWithPopup(auth, provider);
    } catch (err) {
      const code = (err as { code?: string })?.code ?? '';
      // User cancelled — revert to guest silently
      if (
        code === 'auth/popup-closed-by-user' ||
        code === 'auth/cancelled-popup-request' ||
        code === 'auth/popup-blocked'
      ) {
        setState('guest');
        throw err;
      }
      setError(
        err instanceof Error ? err.message : 'GOOGLE_SIGNIN_FAILED',
      );
      setState('error');
      throw err;
    }
  }, [auth, state, firebaseUser]);

  const loginWithEmail = useCallback(
    async (email: string, password: string) => {
      if (state === 'booting' || state === 'guest_booting') return;

      setError(null);
      setState('booting');

      try {
        if (firebaseUser?.isAnonymous) {
          await signOut(auth);
        }
        await signInWithEmailAndPassword(auth, email, password);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'EMAIL_LOGIN_FAILED',
        );
        setState('error');
        throw err;
      }
    },
    [auth, state, firebaseUser],
  );

  type EmailSignupPayload = {
    email: string;
    password: string;
    name: string;
    phone: string;
    birth: string; // YYYY-MM-DD
  };

  const signupWithEmail = useCallback(
    async (payload: EmailSignupPayload) => {
      if (state === 'booting' || state === 'guest_booting') return;

      const { email, password, name, phone, birth } = payload;

      setError(null);
      setState('booting');

      try {
        const cred = firebaseUser?.isAnonymous
          ? await linkWithCredential(
              firebaseUser,
              EmailAuthProvider.credential(email, password),
            )
          : await createUserWithEmailAndPassword(auth, email, password);

        const token = await cred.user.getIdToken(true);

        // Persist token immediately after signup
        await saveTokenToSafeStorage(token);

        const res = await fetch(apiUrl('/me'), {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name,
            phone,
            birth_date: birth,
            auth_provider: 'email',
          }),
        });
        if (!res.ok) {
          throw new Error('ME_PROFILE_SAVE_FAILED');
        }

        // Re-sync to get full profile
        await syncMe(cred.user);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'EMAIL_SIGNUP_FAILED',
        );
        setState('error');
        throw err;
      }
    },
    [auth, state, firebaseUser, syncMe],
  );

  const signOutUser = useCallback(async () => {
    // Clear safeStorage token on logout
    await deleteTokenFromSafeStorage();
    await signOut(auth);
    setFirebaseUser(null);
    setProfile(null);
    setError(null);
    setState('guest');
  }, [auth]);

  /* =========================
     Context Value
  ========================= */

  const value = useMemo<AuthContextValue>(
    () => ({
      state,
      error,
      status,
      profile,
      ensureGuestSession,
      signInWithGoogle,
      loginWithEmail,
      signupWithEmail,
      signOut: signOutUser,
      getToken,
      authFetch,
    }),
    [
      state,
      error,
      status,
      profile,
      ensureGuestSession,
      signInWithGoogle,
      loginWithEmail,
      signupWithEmail,
      signOutUser,
      getToken,
      authFetch,
    ],
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

/* =========================
   Hook
========================= */

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside <DesktopAuthProvider>');
  }
  return ctx;
}
