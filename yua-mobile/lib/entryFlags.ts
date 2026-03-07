import AsyncStorage from "@react-native-async-storage/async-storage";

const WELCOME_KEY = "yua.mobile.welcome.seen.v1";
const OVERVIEW_KEY = "yua.mobile.overview.seen.v1";

export async function hasSeenWelcome(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(WELCOME_KEY);
  return raw === "true";
}

export async function setSeenWelcome(seen: boolean): Promise<void> {
  await AsyncStorage.setItem(WELCOME_KEY, seen ? "true" : "false");
}

export async function hasSeenOverview(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(OVERVIEW_KEY);
  return raw === "true";
}

export async function setSeenOverview(seen: boolean): Promise<void> {
  await AsyncStorage.setItem(OVERVIEW_KEY, seen ? "true" : "false");
}
