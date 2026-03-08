import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import {
  EmailAuthProvider,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  linkWithCredential,
  onIdTokenChanged,
  signInAnonymously,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";

import { setMobileTokenProvider } from "@/lib/auth/mobileTokenProvider";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase.client";
import { clearSession, getSession, setSession } from "@/lib/session";
import type {
  AuthMachineState,
  EmailSignupPayload,
  MobileOnboardingPayload,
  MobileAuthProfile,
} from "@/lib/auth/mobileAuth.types";

const API_BASE = (process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:4000").replace(/\/+$/, "");

function resolveApiUrl(path: string) {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (normalized.startsWith("/api/")) return `${API_BASE}${normalized}`;
  return `${API_BASE}/api${normalized}`;
}

type MobileAuthContextValue = {
  state: AuthMachineState;
  status: "guest" | "loading" | "authed";
  profile: MobileAuthProfile | null;
  error: string | null;
  ready: boolean;
  isFirebaseReady: boolean;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  signupWithEmail: (payload: EmailSignupPayload) => Promise<void>;
  completeOnboarding: (payload: MobileOnboardingPayload) => Promise<MobileAuthProfile>;
  signOutUser: () => Promise<void>;
  signOut: () => Promise<void>;
  authFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  signInWithGoogle: () => Promise<void>;
  signInWithGoogleToken: (idToken: string) => Promise<void>;
  ensureGuestSession: () => Promise<void>;
  syncMe: (user?: User | null) => Promise<MobileAuthProfile | null>;
  getToken: (forceRefresh?: boolean) => Promise<string | null>;
};

const MobileAuthContext = createContext<MobileAuthContextValue | null>(null);

export function MobileAuthProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<AuthMachineState>("booting");
  const [profile, setProfile] = useState<MobileAuthProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const auth = getFirebaseAuth();
  const isFirebaseReady = isFirebaseConfigured() && Boolean(auth);
  const status = useMemo<"guest" | "loading" | "authed">(() => {
    if (state === "booting" || state === "guest_booting") return "loading";
    if (state === "authed" || state === "onboarding_required") return "authed";
    return "guest";
  }, [state]);

  const computeAuthedState = useCallback(
    (nextProfile: MobileAuthProfile, user: User | null) => {
      if (!nextProfile?.workspace?.id) return "onboarding_required";
      if (!user?.isAnonymous && !nextProfile?.user?.name?.trim()) return "onboarding_required";
      return "authed";
    },
    []
  );

  const getToken = useCallback(
    async (forceRefresh = false) => {
      if (!auth?.currentUser) {
        const cached = await getSession();
        return cached?.accessToken ?? null;
      }
      return auth.currentUser.getIdToken(forceRefresh);
    },
    [auth]
  );

  // Dedup: prevent concurrent syncMe calls (race between onIdTokenChanged + signInWithGoogleToken)
  const syncMeInFlightRef = useRef<Promise<MobileAuthProfile | null> | null>(null);

  const syncMeCore = useCallback(
    async (user?: User | null): Promise<MobileAuthProfile | null> => {
      const current = user ?? auth?.currentUser;
      if (!current) {
        setProfile(null);
        setState("guest");
        return null;
      }

      const token = await current.getIdToken(true);

      // Timeout: 10s — prevent infinite hang when server unreachable
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);

      let res: Response;
      try {
        res = await fetch(resolveApiUrl("/me"), {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
          signal: controller.signal,
        });
      } catch (fetchErr: any) {
        clearTimeout(timeout);
        if (fetchErr?.name === "AbortError") {
          throw new Error("ME_SYNC_TIMEOUT");
        }
        throw fetchErr;
      }
      clearTimeout(timeout);

      if (!res.ok) {
        throw new Error(`ME_SYNC_FAILED:${res.status}`);
      }

      const raw = await res.json();
      const next: MobileAuthProfile = raw?.ok
        ? {
            user: raw.user,
            workspace: raw.workspace,
            role: raw.role,
            workspaces: raw.workspaces,
          }
        : raw;

      await setSession({
        accessToken: token,
        userId: String(next?.user?.id ?? current.uid),
        firebaseUid: current.uid,
        email: current.email ?? undefined,
        workspaceId: next?.workspace?.id,
        role: next?.role ?? undefined,
        lastMeSyncAt: Date.now(),
      });

      setProfile(next);
      setState(computeAuthedState(next, current));
      setError(null);
      return next;
    },
    [auth, computeAuthedState]
  );

  const syncMe = useCallback(
    async (user?: User | null): Promise<MobileAuthProfile | null> => {
      // If a syncMe is already in progress, return existing promise (dedup)
      if (syncMeInFlightRef.current) {
        return syncMeInFlightRef.current;
      }
      const promise = syncMeCore(user).finally(() => {
        syncMeInFlightRef.current = null;
      });
      syncMeInFlightRef.current = promise;
      return promise;
    },
    [syncMeCore]
  );

  const loginWithEmail = useCallback(
    async (email: string, password: string) => {
      const firebaseAuth = auth;
      if (!firebaseAuth) {
        throw new Error("FIREBASE_NOT_CONFIGURED");
      }
      setState("booting");
      setError(null);

      if (firebaseAuth.currentUser?.isAnonymous) {
        await signOut(firebaseAuth);
      }
      await signInWithEmailAndPassword(firebaseAuth, email, password);
      await syncMe(firebaseAuth.currentUser);
    },
    [auth, syncMe]
  );

  const signupWithEmail = useCallback(
    async (payload: EmailSignupPayload) => {
      const firebaseAuth = auth;
      if (!firebaseAuth) {
        throw new Error("FIREBASE_NOT_CONFIGURED");
      }

      setState("booting");
      setError(null);

      const cred = firebaseAuth.currentUser?.isAnonymous
        ? await linkWithCredential(
            firebaseAuth.currentUser,
            EmailAuthProvider.credential(payload.email, payload.password)
          )
        : await createUserWithEmailAndPassword(firebaseAuth, payload.email, payload.password);
      const token = await cred.user.getIdToken(true);

      const profileRes = await fetch(resolveApiUrl("/me"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          name: payload.name,
          phone: payload.phone,
          birth_date: payload.birth,
          auth_provider: payload.provider ?? "email",
        }),
      });

      if (!profileRes.ok) {
        throw new Error("ME_PROFILE_SAVE_FAILED");
      }

      await syncMe(cred.user);
    },
    [auth, syncMe]
  );

  const signOutUser = useCallback(async () => {
    const firebaseAuth = auth;
    if (firebaseAuth?.currentUser) {
      await signOut(firebaseAuth);
    }
    await clearSession();
    setProfile(null);
    setState("guest");
    setError(null);
  }, [auth]);

  const completeOnboarding = useCallback(
    async (payload: MobileOnboardingPayload): Promise<MobileAuthProfile> => {
      const firebaseAuth = auth;
      const current = firebaseAuth?.currentUser;
      if (!firebaseAuth || !current) {
        throw new Error("AUTH_REQUIRED");
      }

      const token = await current.getIdToken(true);
      const body: Record<string, string> = {
        name: payload.name,
      };
      if (payload.phone) {
        body.phone = payload.phone;
      }
      if (payload.birth) {
        body.birth_date = payload.birth;
      }
      if (payload.provider) {
        body.auth_provider = payload.provider;
      }

      const res = await fetch(resolveApiUrl("/me"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        throw new Error(`ONBOARDING_SAVE_FAILED:${res.status}`);
      }

      const next = await syncMe(current);
      if (!next) {
        throw new Error("AUTH_SYNC_FAILED");
      }
      return next;
    },
    [auth, syncMe]
  );

  const authFetch = useCallback(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const token = await getToken();
      if (!token) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("[MOBILE_AUTH_FETCH] token not ready, skipping request");
        }
        return new Response(null, { status: 401 });
      }

      const headers = new Headers(init?.headers ?? {});
      headers.set("Authorization", `Bearer ${token}`);
      const ws = profile?.workspace?.id;
      if (ws) {
        headers.set("x-workspace-id", ws);
      }

      const body = init?.body as unknown;
      const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
      if (!isFormData && body && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
      }

      const url = typeof input === "string" ? resolveApiUrl(input) : input;
      return fetch(url, { ...init, headers });
    },
    [getToken, profile?.workspace?.id]
  );

  const signInWithGoogleToken = useCallback(
    async (idToken: string) => {
      const firebaseAuth = auth;
      if (!firebaseAuth) {
        throw new Error("FIREBASE_NOT_CONFIGURED");
      }
      if (!idToken) {
        throw new Error("GOOGLE_TOKEN_MISSING");
      }
      setError(null);
      setState("booting");

      const credential = GoogleAuthProvider.credential(idToken);
      try {
        if (firebaseAuth.currentUser?.isAnonymous) {
          await linkWithCredential(firebaseAuth.currentUser, credential);
        } else {
          await signInWithCredential(firebaseAuth, credential);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (message.includes("auth/credential-already-in-use")) {
          await signOut(firebaseAuth);
          await signInWithCredential(firebaseAuth, credential);
        } else {
          setError(message);
          setState("error");
          throw err;
        }
      }

      // syncMe is handled by onIdTokenChanged listener — wait for it to complete
      // The dedup ref ensures only one syncMe runs even if both paths trigger it
      await syncMe(firebaseAuth.currentUser);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [auth, syncMe]
  );

  const signInWithGoogle = useCallback(async () => {
    throw new Error("GOOGLE_SIGNIN_USE_PANEL");
  }, []);

  const ensureGuestSession = useCallback(async () => {
    const firebaseAuth = auth;
    if (!firebaseAuth) return;
    if (state === "booting" || state === "guest_booting") return;
    if (firebaseAuth.currentUser) return;
    setError(null);
    setState("guest_booting");
    try {
      await signInAnonymously(firebaseAuth);
    } catch (err) {
      setError(err instanceof Error ? err.message : "GUEST_BOOT_FAILED");
      setState("error");
      throw err;
    }
  }, [auth, state]);

  useEffect(() => {
    return setMobileTokenProvider(() => getToken());
  }, [getToken]);

  useEffect(() => {
    if (!auth) {
      void (async () => {
        const cached = await getSession();
        if (cached?.userId) {
          setProfile({
            user: {
              id: cached.userId ?? "",
              email: cached.email,
            },
            workspace: cached.workspaceId ? { id: cached.workspaceId } : null,
            role: cached.role,
          });
          setState(cached.workspaceId ? "authed" : "onboarding_required");
        } else {
          setState("guest");
        }
        setReady(true);
      })();
      return;
    }

    let resolved = false;

    // Timeout: if Firebase doesn't respond within 5s, fall back to cached session
    const timeout = setTimeout(async () => {
      if (resolved) return;
      resolved = true;
      const cached = await getSession();
      if (cached?.userId) {
        setProfile({
          user: {
            id: cached.userId ?? "",
            email: cached.email,
          },
          workspace: cached.workspaceId ? { id: cached.workspaceId } : null,
          role: cached.role,
        });
        setState(cached.workspaceId ? "authed" : "onboarding_required");
      } else {
        setState("guest");
      }
      setReady(true);
    }, 5000);

    const unsub = onIdTokenChanged(auth, async (user) => {
      resolved = true;
      clearTimeout(timeout);
      try {
        if (!user) {
          setState("guest");
          setProfile(null);
          await clearSession();
          setReady(true);
          return;
        }

        setError(null);
        setState("booting");
        await syncMe(user);
      } catch (err) {
        setError(err instanceof Error ? err.message : "AUTH_SYNC_FAILED");
        setState("error");
      } finally {
        setReady(true);
      }
    });

    return () => {
      clearTimeout(timeout);
      unsub();
    };
  }, [auth, syncMe]);

  const value = useMemo<MobileAuthContextValue>(
    () => ({
      state,
      status,
      profile,
      error,
      ready,
      isFirebaseReady,
      loginWithEmail,
      signupWithEmail,
      completeOnboarding,
      signOutUser,
      signOut: signOutUser,
      authFetch,
      signInWithGoogle,
      signInWithGoogleToken,
      ensureGuestSession,
      syncMe,
      getToken,
    }),
    [
      state,
      status,
      profile,
      error,
      ready,
      isFirebaseReady,
      loginWithEmail,
      signupWithEmail,
      completeOnboarding,
      signOutUser,
      authFetch,
      signInWithGoogle,
      signInWithGoogleToken,
      ensureGuestSession,
      syncMe,
      getToken,
    ]
  );

  return <MobileAuthContext.Provider value={value}>{children}</MobileAuthContext.Provider>;
}

export function useMobileAuth() {
  const ctx = useContext(MobileAuthContext);
  if (!ctx) {
    throw new Error("useMobileAuth must be used within <MobileAuthProvider>");
  }
  return ctx;
}
