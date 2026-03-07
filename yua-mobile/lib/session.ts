import * as SecureStore from "expo-secure-store";

const SESSION_KEY = "yua.mobile.session.v1";

export type MobileSession = {
  accessToken?: string;
  userId: string;
  firebaseUid?: string;
  email?: string;
  workspaceId?: string;
  role?: string;
  lastMeSyncAt?: number;
  introSeen?: boolean;
};

export async function getSession(): Promise<MobileSession | null> {
  const raw = await SecureStore.getItemAsync(SESSION_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as MobileSession;
    if (!parsed?.userId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function setSession(session: MobileSession): Promise<void> {
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
}

export async function clearSession(): Promise<void> {
  await SecureStore.deleteItemAsync(SESSION_KEY);
}
