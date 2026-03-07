import Constants from "expo-constants";
const CHANNEL_ID = "chat-updates";

let cachedNotifications: typeof import("expo-notifications") | null = null;

function isExpoGo(): boolean {
  return Constants.appOwnership === "expo";
}

async function getNotifications() {
  if (isExpoGo()) return null;
  if (cachedNotifications) return cachedNotifications;
  try {
    cachedNotifications = await import("expo-notifications");
    return cachedNotifications;
  } catch {
    return null;
  }
}

export async function initMobileNotifications() {
  // Expo Go에서는 notifications 초기화 금지 (SDK53+)
  const Notifications = await getNotifications();
  if (!Notifications) return;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    }),
  });

  await ensureNotificationPermissions();
  await ensureAndroidChannel();
}

export async function ensureNotificationPermissions() {
  const Notifications = await getNotifications();
  if (!Notifications) return null;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted || current.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
    return current;
  }
  return Notifications.requestPermissionsAsync();
}

async function ensureAndroidChannel() {
  const Notifications = await getNotifications();
  if (!Notifications) return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: "Chat Updates",
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: undefined,
    enableVibrate: false,
    showBadge: true,
  });
}

export async function sendLocalChatNotification(args: {
  title: string;
  body: string;
  badge?: number;
  data?: Record<string, unknown>;
}) {
  const Notifications = await getNotifications();
  if (!Notifications) return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: args.title,
      body: args.body,
      data: args.data ?? {},
      sound: undefined,
      badge: args.badge,
    },
    trigger: null,
  });
}

export async function setAppBadgeCount(count: number) {
  const Notifications = await getNotifications();
  if (!Notifications) return;
  try {
    await Notifications.setBadgeCountAsync(count);
  } catch {
    // ignore badge failures on unsupported launchers
  }
}

export async function addNotificationResponseListener(
  handler: (response: import("expo-notifications").NotificationResponse) => void
) {
  const Notifications = await getNotifications();
  if (!Notifications) return { remove: () => {} };
  return Notifications.addNotificationResponseReceivedListener(handler);
}

export async function getInitialNotificationResponse() {
  const Notifications = await getNotifications();
  if (!Notifications) return null;
  return Notifications.getLastNotificationResponseAsync();
}
