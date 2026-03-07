"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  User,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from "firebase/auth";

import { useChatStore } from "@/store/useChatStore";

/* =========================
   API BASE URL
========================= */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://34.50.27.221:4000";

/* =========================
   Types
========================= */

export type AuthStatus = "loading" | "authed" | "guest";

export type AuthUser = {
  firebaseUid: string;
  email: string | null;
};

export type AuthProfile = {
  uid: string;
  email: string | null;
  tier: "free" | "pro" | "business" | "enterprise";
  role?: "user" | "admin";
  instanceId?: string;
  apiKey?: string;
};

type AuthContextValue = {
  status: AuthStatus;
  firebaseUser: User | null;
  user: AuthUser | null;
  profile: AuthProfile | null;

  refreshProfile: () => Promise<void>;

  loginWithEmail: (email: string, password: string) => Promise<void>;
  signupWithEmail: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;

  getToken: () => Promise<string | null>;
  authFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/* =========================
   Firebase Init
========================= */

function ensureFirebaseClient(): FirebaseApp {
  if (getApps().length > 0) return getApps()[0]!;

  return initializeApp({
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  });
}

/* =========================
   Provider
========================= */

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const chatReset = useChatStore((s) => s.reset);
  const setAuthFetch = useChatStore((s) => s.setAuthFetch);

  const [status, setStatus] = useState<AuthStatus>("loading");
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);

  /* ---------------------------------
     Firebase Auth State
  --------------------------------- */
  useEffect(() => {
    ensureFirebaseClient();
    const auth = getAuth();

    const unsub = onAuthStateChanged(auth, (u) => {
      setFirebaseUser(u);

      if (!u) {
        setUser(null);
        setProfile(null);
        setStatus("guest");
        return;
      }

      setUser({
        firebaseUid: u.uid,
        email: u.email,
      });

      setStatus("authed");
    });

    return () => unsub();
  }, []);

  /* ---------------------------------
     Token
  --------------------------------- */
  const getToken = useCallback(async () => {
    const u = getAuth().currentUser;
    if (!u) return null;
    try {
      return await u.getIdToken(true);
    } catch {
      return null;
    }
  }, []);

  /* ---------------------------------
     authFetch (🔥 token-only stable)
  --------------------------------- */
  const authFetch = useCallback(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const token = await getToken();
      const headers = new Headers(init?.headers);

      if (token) headers.set("Authorization", `Bearer ${token}`);
      if (profile?.apiKey) headers.set("x-api-key", profile.apiKey);

      if (!headers.has("Content-Type") && init?.body) {
        headers.set("Content-Type", "application/json");
      }

      const url =
        typeof input === "string"
          ? `${API_BASE_URL}${input.startsWith("/") ? input : `/${input}`}`
          : input;

      return fetch(url, { ...init, headers });
    },
    [getToken, profile?.apiKey]
  );

  /* ---------------------------------
     🔥 ChatStore authFetch injection
     (token 기준, status 제거)
  --------------------------------- */
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const token = await getToken();
      if (cancelled) return;

      if (token) {
        setAuthFetch(authFetch);
      } else {
        setAuthFetch(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authFetch, getToken, setAuthFetch]);

  /* ---------------------------------
     Profile (/me) — 실패해도 OK
  --------------------------------- */
  const refreshProfile = useCallback(async () => {
    try {
      const res = await authFetch("/me");
      if (!res.ok) return;
      const data = await res.json();
      setProfile(data);
    } catch {
      // 🔇 profile 실패는 무시 (SSOT)
    }
  }, [authFetch]);

  useEffect(() => {
    if (status !== "authed") return;
    refreshProfile();
  }, [status, refreshProfile]);

  /* ---------------------------------
     Auth Actions
  --------------------------------- */
  const loginWithEmail = useCallback(async (email: string, password: string) => {
    ensureFirebaseClient();
    await signInWithEmailAndPassword(getAuth(), email, password);
  }, []);

  const signupWithEmail = useCallback(async (email: string, password: string) => {
    ensureFirebaseClient();
    await createUserWithEmailAndPassword(getAuth(), email, password);
  }, []);

  const logout = useCallback(async () => {
    ensureFirebaseClient();
    await signOut(getAuth());
    setUser(null);
    setProfile(null);
    setStatus("guest");
    chatReset(); // 🔥 ONLY HERE
  }, [chatReset]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      firebaseUser,
      user,
      profile,
      loginWithEmail,
      signupWithEmail,
      logout,
      getToken,
      authFetch,
      refreshProfile,
    }),
    [
      status,
      firebaseUser,
      user,
      profile,
      loginWithEmail,
      signupWithEmail,
      logout,
      getToken,
      authFetch,
      refreshProfile,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/* =========================
   Hook
========================= */

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within <AuthProvider />");
  }
  return ctx;
}
