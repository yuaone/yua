"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";

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
} from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase.client";

import type { AuthContextContract, AuthProfile } from "yua-shared";
import { useWorkspaceStore } from "@/store/store/useWorkspaceStore";
import { disableAutoGuest } from "@/lib/sessionFlags";
import { detectInAppBrowser } from "@/lib/detectInAppBrowser";

/* =========================
   Context
========================= */

const AuthContext = createContext<AuthContextValue | null>(null);

type AuthMachineState =
  | "booting"
  | "guest"
  | "guest_booting"
  | "authed"
  | "onboarding_required"
  | "error";

type AuthContextValue = AuthContextContract & {
  state: AuthMachineState;
  error: string | null;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

  /**
 * apiUrl (SSOT)
 * - NEXT_PUBLIC_API_BASE_URL이
 *   1) http://host:4000      이든
 *   2) http://host:4000/api  이든
 * - 호출은 항상 "/me", "/chat/..." 처럼 "path"만 쓰면 됨
 * - /api 중복은 자동 제거
 */
function apiUrl(path: string) {
  const base = String(API_BASE).replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;

  const baseHasApi = /\/api$/.test(base);
  const pathHasApi = /^\/api(\/|$)/.test(p);

  if (baseHasApi && pathHasApi) return `${base}${p.replace(/^\/api/, "")}`;
  if (!baseHasApi && !pathHasApi) return `${base}/api${p}`;
  return `${base}${p}`;
}

/* =========================
   Provider (SSOT)
========================= */

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const auth = getFirebaseAuth();

  /**
   * status (WEB SSOT)
   * - guest   : 비로그인
   * - loading : 인증/프로필 동기화 중
   * - authed  : 사용 가능
   */
  const [state, setState] = useState<AuthMachineState>("booting");
  const [error, setError] = useState<string | null>(null);

  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);

  const status = useMemo<"guest" | "loading" | "authed">(() => {
    if (state === "booting" || state === "guest_booting") return "loading";
    if (state === "authed" || state === "onboarding_required") return "authed";
    return "guest";
  }, [state]);

  const computeAuthedState = useCallback(
    (nextProfile: AuthProfile, user: User | null): AuthMachineState => {
      if (!nextProfile?.workspace?.id) return "onboarding_required";
      if (!user?.isAnonymous && !nextProfile?.user?.name) return "onboarding_required";
      return "authed";
    },
    []
  );

    /** ---------------------------------
   *  Server /me sync (SSOT)
   *  - onAuthStateChanged에서도 쓰고
   *  - signup profile 저장 후에도 재사용
   ---------------------------------- */
  const syncMe = useCallback(async (user: User) => {
    await user.getIdToken(true);
    const token = await user.getIdToken();

    const res = await fetch(apiUrl("/me"), {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("unauthorized");

    const raw = await res.json();
    // 서버 응답에 ok가 있든 없든 최소 shape만 뽑아 SSOT로 맞춘다
    const data = raw?.ok
      ? ({ user: raw.user, workspace: raw.workspace, role: raw.role } as AuthProfile)
      : (raw as AuthProfile);

    const nextState = computeAuthedState(data, user);
    setProfile(data);
    setError(null);
    setState(nextState);
    // ✅ Workspace Switch SSOT:
    // activeWorkspaceId가 비어있으면 /me의 기본 workspace로 채운다.
    // (WorkspacePanel/TeamPanel이 profile.workspace.id를 직접 믿으면 stale/불일치 헬버그 생김)
    try {
      const cur = useWorkspaceStore.getState().activeWorkspaceId;
      const next = data?.workspace?.id ?? null;
      if (!cur && next) useWorkspaceStore.getState().setActiveWorkspaceId(next);
    } catch {}
    return data;
  }, [computeAuthedState]);

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
   if (process.env.NODE_ENV !== "production") {
     console.warn("[AUTH_FETCH] token not ready, skipping request");
   }
   return Promise.resolve(new Response(null, { status: 401 }));
 }

      const headers = new Headers(init?.headers ?? {});

      headers.set("Authorization", `Bearer ${token}`);

      // ✅ Workspace Switch SSOT: 항상 현재 active workspace를 붙인다.
      // 없으면 서버는 personal로 fallback.
      const ws = useWorkspaceStore.getState().activeWorkspaceId;
      if (ws) headers.set("x-workspace-id", ws);
      if (process.env.NODE_ENV !== "production") {
        console.log("[AUTH_FETCH][HEADERS]", {
          hasAuth: headers.has("Authorization"),
          workspaceId: ws ?? null,
          url: typeof input === "string" ? input : "URL",
        });
      }

      // 🔒 SSOT FIX:
      // FormData 요청에는 Content-Type을 절대 직접 설정하지 않는다.
      // (브라우저가 multipart boundary를 자동으로 설정해야 함)
      const body = init?.body as any;
      const isFormData =
        typeof FormData !== "undefined" &&
        body instanceof FormData;

      if (!isFormData) {
        if (!headers.has("Content-Type") && init?.body) {
          headers.set("Content-Type", "application/json");
        }
      }

      const url = typeof input === "string" ? apiUrl(input) : input;

      return fetch(url, { ...init, headers });
    },
    [getToken]
  );

  /* =========================
     Firebase → Server Profile Sync (🔥 핵심)
  ========================= */

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);

      // 로그아웃
      if (!user) {
        setProfile(null);
        setError(null);
        setState("guest");
        return;
      }

      // 로그인 → 서버 프로필 동기화
      setError(null);
      setState("booting");

      try {
        await syncMe(user);
      } catch (err) {
        console.error("❌ /me sync failed", err);
        setProfile(null);
        setError(err instanceof Error ? err.message : "AUTH_SYNC_FAILED");
        setState("error");
      }
    });

    return () => unsub();
  }, [auth, syncMe]);

  /** 게스트(anonymous) 세션 시작 — /chat을 막지 않기 위한 SSOT */
  const ensureGuestSession = useCallback(async () => {
    if (state === "booting" || state === "guest_booting") return;
    if (auth.currentUser || firebaseUser) return;
    setError(null);
    setState("guest_booting");
    try {
      await signInAnonymously(auth);
    } catch (err) {
      const code = (err as any)?.code ?? "";
      if (code === "auth/admin-restricted-operation") {
        // anonymous sign-in disabled → stay guest, stop auto-guest loop
        disableAutoGuest();
        setError(null);
        setState("guest");
        return;
      }
      setError(err instanceof Error ? err.message : "GUEST_BOOT_FAILED");
      setState("error");
      throw err;
    }
  }, [auth, firebaseUser, state]);

  /* =========================
     Actions
  ========================= */

  const signInWithGoogle = useCallback(async () => {
    if (state === "booting" || state === "guest_booting") return;

    // In-app browser guard
    const inApp = detectInAppBrowser();
    if (inApp.isInApp) {
      const err = new Error("IN_APP_BROWSER");
      (err as any).code = "IN_APP_BROWSER";
      (err as any).inAppResult = inApp;
      throw err;
    }

    setError(null);
    setState("booting");
    const provider = new GoogleAuthProvider();
    try {
      if (firebaseUser?.isAnonymous) {
        await linkWithPopup(firebaseUser, provider);
        return;
      }
      await signInWithPopup(auth, provider);
    } catch (err) {
      setError(err instanceof Error ? err.message : "GOOGLE_SIGNIN_FAILED");
      setState("error");
      throw err;
    }
  }, [auth, state, firebaseUser]);


  const loginWithEmail = useCallback(
    async (email: string, password: string) => {
      if (state === "booting" || state === "guest_booting") return;

      setError(null);
      setState("booting");

      // ⚠️ 기존 계정 로그인은 credential이 이미 사용중일 수 있어서 link로 못 감.
      // v1: 게스트면 signOut 후 로그인 (나중에 merge 전략을 SSOT로 잡자)
      try {
        if (firebaseUser?.isAnonymous) {
          await signOut(auth);
        }

        await signInWithEmailAndPassword(auth, email, password);
      } catch (err) {
        setError(err instanceof Error ? err.message : "EMAIL_LOGIN_FAILED");
        setState("error");
        throw err;
      }
    },
    [auth, state, firebaseUser]
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
      if (state === "booting" || state === "guest_booting") return;

      const { email, password, name, phone, birth } = payload;

      setError(null);
      setState("booting");

      try {
        // ✅ 핵심: anonymous 게스트 → email 계정으로 "업그레이드" (UID 유지)
        const cred = firebaseUser?.isAnonymous
          ? await linkWithCredential(
              firebaseUser,
              EmailAuthProvider.credential(email, password)
            )
          : await createUserWithEmailAndPassword(auth, email, password);

        const token = await cred.user.getIdToken(true);

        const res = await fetch(apiUrl("/me"), {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name,
            phone,
            birth_date: birth,
            auth_provider: "email",
          }),
        });
        if (!res.ok) {
          // 프로필 저장 실패면, UX상 auth는 됐더라도 "가입 완료"가 아님
          throw new Error("ME_PROFILE_SAVE_FAILED");
        }

        // ✅ 저장 후 즉시 /me 재동기화 (modal close/afterLogin이 안정적으로 동작)
        await syncMe(cred.user);
      } catch (err) {
        setError(err instanceof Error ? err.message : "EMAIL_SIGNUP_FAILED");
        setState("error");
        throw err;
      }
    },
    [auth, state, firebaseUser, syncMe]
  );

  const signOutUser = useCallback(async () => {
    await signOut(auth);
    setFirebaseUser(null);
    setProfile(null);
    setError(null);
    setState("guest");
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
    ]
  );

  // ✅ UI는 항상 렌더 (핵심)
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/* =========================
   Hook
========================= */

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return ctx;
}
