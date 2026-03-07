import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY_LAST_SEEN = "notif:lastSeenByThread";
const KEY_SENT = "notif:sentKeys";
const KEY_COOLDOWN = "notif:lastNotifiedAtByThread";
const KEY_BADGE = "notif:badgeCount";

const MAX_SENT_KEYS = 200;
const COOLDOWN_MS = 8000;

type LastSeenMap = Record<string, { at: number; messageId: string }>;
type CooldownMap = Record<string, number>;

async function readJson<T>(key: string, fallback: T): Promise<T> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(key: string, value: unknown) {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export async function setLastSeenForThread(threadId: number, messageId: string, at: number) {
  const map = await readJson<LastSeenMap>(KEY_LAST_SEEN, {});
  map[String(threadId)] = { at, messageId };
  await writeJson(KEY_LAST_SEEN, map);
}

export async function shouldNotifyForMessage(args: {
  threadId: number;
  messageId: string;
  createdAt: number;
  now: number;
}) {
  const [seen, sentKeys, cooldown] = await Promise.all([
    readJson<LastSeenMap>(KEY_LAST_SEEN, {}),
    readJson<string[]>(KEY_SENT, []),
    readJson<CooldownMap>(KEY_COOLDOWN, {}),
  ]);

  const key = `${args.threadId}:${args.messageId}`;
  if (sentKeys.includes(key)) return false;

  const lastSeen = seen[String(args.threadId)];
  if (lastSeen && lastSeen.at >= args.createdAt) return false;

  const lastNotifiedAt = cooldown[String(args.threadId)] ?? 0;
  if (args.now - lastNotifiedAt < COOLDOWN_MS) return false;

  return true;
}

export async function markMessageNotified(threadId: number, messageId: string, at: number) {
  const key = `${threadId}:${messageId}`;
  const [sentKeys, cooldown] = await Promise.all([
    readJson<string[]>(KEY_SENT, []),
    readJson<CooldownMap>(KEY_COOLDOWN, {}),
  ]);

  const nextSent = [key, ...sentKeys.filter((entry) => entry !== key)].slice(0, MAX_SENT_KEYS);
  cooldown[String(threadId)] = at;

  await Promise.all([
    writeJson(KEY_SENT, nextSent),
    writeJson(KEY_COOLDOWN, cooldown),
  ]);
}

export async function getBadgeCount() {
  const count = await readJson<number>(KEY_BADGE, 0);
  return Number.isFinite(count) ? count : 0;
}

export async function setBadgeCount(count: number) {
  await writeJson(KEY_BADGE, Math.max(0, count));
}

export async function incrementBadgeCount() {
  const count = await getBadgeCount();
  const next = count + 1;
  await setBadgeCount(next);
  return next;
}

export async function resetBadgeCount() {
  await setBadgeCount(0);
}
