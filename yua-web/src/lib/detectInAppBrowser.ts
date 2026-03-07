// In-app browser detection and external browser redirect
// Google OAuth blocks WebView with 403 disallowed_useragent

const IN_APP_PATTERNS = [
  // Messaging apps
  /KAKAOTALK/i,
  /KAKAO/i,
  /NAVER\(/i,
  /BAND\//i,
  /Line\//i,
  /Telegram/i,
  /WhatsApp/i,
  /WeChat|MicroMessenger/i,
  /Viber/i,

  // Social media
  /Instagram/i,
  /FBAN|FBAV|FB_IAB/i,     // Facebook
  /Twitter/i,
  /Snapchat/i,
  /Pinterest/i,
  /TikTok|BytedanceWebview/i,
  /Threads/i,

  // Korean apps
  /DaumApps/i,
  /everytimeApp/i,
  /CoupangApp/i,
  /toss/i,
  /Whale\//i,              // Naver Whale in-app

  // Generic WebView markers
  /\bwv\b/,                // Android WebView
  /WebView/i,
];

export type InAppBrowserResult = {
  isInApp: boolean;
  appName: string | null;
  platform: "android" | "ios" | "unknown";
};

export function detectInAppBrowser(): InAppBrowserResult {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return { isInApp: false, appName: null, platform: "unknown" };
  }

  const ua = navigator.userAgent || "";

  // Determine platform
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isAndroid = /Android/i.test(ua);
  const platform = isIOS ? "ios" : isAndroid ? "android" : "unknown";

  // Check against patterns
  for (const pattern of IN_APP_PATTERNS) {
    if (pattern.test(ua)) {
      const match = ua.match(pattern);
      return {
        isInApp: true,
        appName: match?.[0] ?? "Unknown App",
        platform,
      };
    }
  }

  // iOS standalone check: UIWebView / WKWebView without Safari
  if (isIOS && !(/Safari/i.test(ua)) && /AppleWebKit/i.test(ua)) {
    return { isInApp: true, appName: "iOS WebView", platform: "ios" };
  }

  // Android: WebView without Chrome version
  if (isAndroid && /wv\b/.test(ua)) {
    return { isInApp: true, appName: "Android WebView", platform: "android" };
  }

  return { isInApp: false, appName: null, platform };
}

export function getExternalBrowserUrl(url?: string): string {
  const targetUrl = url || window.location.href;

  const ua = navigator.userAgent || "";
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isAndroid = /Android/i.test(ua);

  if (isAndroid) {
    // Android: intent:// scheme to open in Chrome
    const intentUrl = targetUrl.replace(/^https?:\/\//, "");
    return `intent://${intentUrl}#Intent;scheme=https;package=com.android.chrome;end`;
  }

  if (isIOS) {
    // iOS: try universal link to Safari
    // x-safari-https:// is not universally supported, so we try window.open as fallback
    return targetUrl;
  }

  return targetUrl;
}

export function openInExternalBrowser(url?: string): void {
  const targetUrl = url || window.location.href;
  const result = detectInAppBrowser();

  if (result.platform === "android") {
    const intentUrl = targetUrl.replace(/^https?:\/\//, "");
    window.location.href = `intent://${intentUrl}#Intent;scheme=https;package=com.android.chrome;end`;
  } else if (result.platform === "ios") {
    // iOS: Copy URL and prompt user, since there's no reliable way to force Safari
    // Try opening in Safari via universal link behavior
    window.location.href = targetUrl;
  } else {
    window.open(targetUrl, "_blank");
  }
}
