import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ThinkingProfile, DeepVariant } from "yua-shared/types/thinkingProfile";

const KEY = "yua:thinkingProfile";
const DEEP_KEY = "yua:deepVariant";

export async function getMobileThinkingProfile(): Promise<ThinkingProfile> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw === "FAST" || raw === "NORMAL" || raw === "DEEP") return raw;
  } catch {
    // ignore
  }
  return "NORMAL";
}

export async function setMobileThinkingProfile(p: ThinkingProfile): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, p);
  } catch {
    // ignore
  }
}

export async function getMobileDeepVariant(): Promise<DeepVariant> {
  try {
    const raw = await AsyncStorage.getItem(DEEP_KEY);
    if (raw === "STANDARD" || raw === "EXPANDED") return raw;
  } catch {
    // ignore
  }
  return "STANDARD";
}

export async function setMobileDeepVariant(v: DeepVariant): Promise<void> {
  try {
    await AsyncStorage.setItem(DEEP_KEY, v);
  } catch {
    // ignore
  }
}
