import type { AuthUser } from "yua-shared/auth/auth-types";

export type AuthMachineState =
  | "booting"
  | "guest"
  | "guest_booting"
  | "authed"
  | "onboarding_required"
  | "error";

/**
 * MobileAuthProfile is a looser version of yua-shared AuthProfile.
 * During auth flow (booting, onboarding), fields may be partially populated.
 * Once fully authed, this aligns with AuthProfile from yua-shared (SSOT).
 */
export type MobileAuthProfile = {
  user?: Partial<AuthUser> | null;
  workspace?: { id?: string; name?: string; plan?: string } | null;
  role?: string | null;
  workspaces?: { id: string; name: string; plan?: string }[];
};

export type EmailSignupPayload = {
  email: string;
  password: string;
  name: string;
  phone: string;
  birth: string;
  provider?: "email" | "google";
};

export type MobileOnboardingPayload = {
  name: string;
  phone?: string;
  birth?: string;
  provider?: "email" | "google";
};
