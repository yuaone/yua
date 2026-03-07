import { AuthProfile } from "./auth-types";

/* =========================
   Status
========================= */

export type AuthStatus = "loading" | "authed" | "guest";

/* =========================
   Auth Context Contract
========================= */

export interface AuthContextContract {
  /* ===== State ===== */
  status: AuthStatus;
  profile: AuthProfile | null;

  ensureGuestSession(): Promise<void>;

  /* ===== OAuth ===== */
  signInWithGoogle(): Promise<void>;

  /* ===== Email Auth ===== */
  loginWithEmail(email: string, password: string): Promise<void>;

  signupWithEmail(payload: {
    email: string;
    password: string;
    name: string;
    phone: string;
    birth: string; // YYYY-MM-DD
  }): Promise<void>;

  /* ===== Session ===== */
  signOut(): Promise<void>;

  /* ===== Token / Fetch ===== */
  getToken(): Promise<string | null>;

  authFetch(
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response>;
}
