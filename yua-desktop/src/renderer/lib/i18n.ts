import { useState, useEffect, useCallback } from "react";

/* ─────────────────────────────────────────────
   Lightweight i18n — no external deps
   ───────────────────────────────────────────── */

export type Locale = "ko" | "en" | "ja";

const translations: Record<Locale, Record<string, string>> = {
  ko: {
    // Common
    "app.name": "YUA",
    "common.send": "보내기",
    "common.stop": "중지",
    "common.cancel": "취소",
    "common.close": "닫기",
    "common.save": "저장",
    "common.delete": "삭제",
    "common.edit": "수정",
    "common.settings": "설정",
    "common.search": "검색",
    "common.loading": "로딩 중...",

    // Chat
    "chat.new": "새 대화",
    "chat.input_placeholder": "메시지를 입력하세요...",
    "chat.no_chats": "아직 대화가 없습니다.",
    "chat.thinking": "사고 중...",
    "chat.disclaimer": "YUA는 실수를 할 수 있습니다.",
    "chat.file_drop": "파일을 여기에 놓으세요",

    // Sidebar
    "sidebar.pinned": "PINNED",
    "sidebar.today": "오늘",
    "sidebar.yesterday": "어제",
    "sidebar.this_week": "이번 주",
    "sidebar.this_month": "이번 달",
    "sidebar.older": "이전",

    // Tray
    "tray.new_chat": "새 대화",
    "tray.quick_question": "빠른 질문",
    "tray.screenshot": "스크린샷 캡처",
    "tray.always_on_top": "항상 위에 표시",
    "tray.launch_at_login": "시작 시 실행",
    "tray.settings": "설정...",
    "tray.quit": "YUA 종료",
    "tray.mini_mode": "미니 모드",

    // Settings
    "settings.personalization": "개인 맞춤 설정",
    "settings.notifications": "알림",
    "settings.data": "데이터 제어",
    "settings.security": "보안",
    "settings.workspace": "워크스페이스",
    "settings.billing": "Billing",
    "settings.memory": "메모리",
    "settings.desktop": "데스크톱",
    "settings.about": "정보",
    "settings.theme": "테마",
    "settings.theme_light": "라이트",
    "settings.theme_dark": "다크",
    "settings.theme_system": "시스템",
    "settings.language": "언어",

    // Quick Launch
    "quicklaunch.placeholder": "YUA에게 질문하기...",
    "quicklaunch.hint_shift_enter": "Shift+Enter: 줄바꿈",
    "quicklaunch.hint_enter": "Enter: 전송",
    "quicklaunch.hint_tab": "Tab: 전체 앱 열기",

    // Desktop
    "desktop.always_on_top": "항상 위에 표시",
    "desktop.auto_update": "자동 업데이트",
    "desktop.check_update": "업데이트 확인",
    "desktop.mini_quick_question": "빠른 질문을 해보세요",

    // Update
    "update.checking": "업데이트 확인 중...",
    "update.available": "새 버전 사용 가능",
    "update.downloading": "다운로드 중...",
    "update.ready": "업데이트 준비 완료",
    "update.restart": "재시작",
    "update.failed": "업데이트 확인 실패",

    // Onboarding
    "onboarding.welcome": "YUA에 오신 것을 환영합니다",
    "onboarding.welcome_desc":
      "항상 곁에 있는 AI 비서 — 브라우저를 열지 않아도, 단축키 하나로.",
    "onboarding.start": "시작하기",
    "onboarding.skip": "건너뛰기",
    "onboarding.login": "로그인",
    "onboarding.login_desc": "계정으로 로그인하여 대화를 동기화하세요",
    "onboarding.login_later": "나중에 로그인하기",
    "onboarding.permissions": "설정",
    "onboarding.tour": "빠른 투어",

    // Offline
    "offline.message": "인터넷에 연결되지 않았습니다",

    // Command Palette
    "palette.placeholder": "명령어를 입력하세요...",
    "palette.no_results": "결과가 없습니다",
    "palette.category_recent": "최근",
    "palette.category_chat": "채팅",
    "palette.category_tools": "도구",
    "palette.category_settings": "설정",

    // Screenshot
    "screenshot.title": "스크린샷 캡처",
    "screenshot.attach": "첨부",
    "screenshot.drag_hint": "드래그하여 영역을 선택하세요",
  },

  en: {
    "app.name": "YUA",
    "common.send": "Send",
    "common.stop": "Stop",
    "common.cancel": "Cancel",
    "common.close": "Close",
    "common.save": "Save",
    "common.delete": "Delete",
    "common.edit": "Edit",
    "common.settings": "Settings",
    "common.search": "Search",
    "common.loading": "Loading...",

    "chat.new": "New Chat",
    "chat.input_placeholder": "Type a message...",
    "chat.no_chats": "No chats yet.",
    "chat.thinking": "Thinking...",
    "chat.disclaimer": "YUA can make mistakes.",
    "chat.file_drop": "Drop files here",

    "sidebar.pinned": "PINNED",
    "sidebar.today": "Today",
    "sidebar.yesterday": "Yesterday",
    "sidebar.this_week": "This Week",
    "sidebar.this_month": "This Month",
    "sidebar.older": "Older",

    "tray.new_chat": "New Chat",
    "tray.quick_question": "Quick Question",
    "tray.screenshot": "Screenshot Capture",
    "tray.always_on_top": "Always on Top",
    "tray.launch_at_login": "Launch at Login",
    "tray.settings": "Settings...",
    "tray.quit": "Quit YUA",
    "tray.mini_mode": "Mini Mode",

    "settings.personalization": "Personalization",
    "settings.notifications": "Notifications",
    "settings.data": "Data Control",
    "settings.security": "Security",
    "settings.workspace": "Workspace",
    "settings.billing": "Billing",
    "settings.memory": "Memory",
    "settings.desktop": "Desktop",
    "settings.about": "About",
    "settings.theme": "Theme",
    "settings.theme_light": "Light",
    "settings.theme_dark": "Dark",
    "settings.theme_system": "System",
    "settings.language": "Language",

    "quicklaunch.placeholder": "Ask YUA anything...",
    "quicklaunch.hint_shift_enter": "Shift+Enter: New line",
    "quicklaunch.hint_enter": "Enter: Send",
    "quicklaunch.hint_tab": "Tab: Open full app",

    "desktop.always_on_top": "Always on Top",
    "desktop.auto_update": "Auto Update",
    "desktop.check_update": "Check for Updates",
    "desktop.mini_quick_question": "Ask a quick question",

    "update.checking": "Checking for updates...",
    "update.available": "New version available",
    "update.downloading": "Downloading...",
    "update.ready": "Update ready",
    "update.restart": "Restart",
    "update.failed": "Update check failed",

    "onboarding.welcome": "Welcome to YUA",
    "onboarding.welcome_desc":
      "Your AI assistant — always ready, just a shortcut away.",
    "onboarding.start": "Get Started",
    "onboarding.skip": "Skip",
    "onboarding.login": "Login",
    "onboarding.login_desc": "Sign in to sync your conversations",
    "onboarding.login_later": "Login later",
    "onboarding.permissions": "Setup",
    "onboarding.tour": "Quick Tour",

    "offline.message": "No internet connection",

    "palette.placeholder": "Type a command...",
    "palette.no_results": "No results",
    "palette.category_recent": "Recent",
    "palette.category_chat": "Chat",
    "palette.category_tools": "Tools",
    "palette.category_settings": "Settings",

    "screenshot.title": "Screenshot Capture",
    "screenshot.attach": "Attach",
    "screenshot.drag_hint": "Drag to select a region",
  },

  ja: {
    "app.name": "YUA",
    "common.send": "送信",
    "common.stop": "停止",
    "common.cancel": "キャンセル",
    "common.close": "閉じる",
    "common.save": "保存",
    "common.delete": "削除",
    "common.edit": "編集",
    "common.settings": "設定",
    "common.search": "検索",
    "common.loading": "読み込み中...",

    "chat.new": "新しい会話",
    "chat.input_placeholder": "メッセージを入力...",
    "chat.no_chats": "まだ会話がありません。",
    "chat.thinking": "思考中...",
    "chat.disclaimer": "YUAは間違えることがあります。",
    "chat.file_drop": "ファイルをここにドロップ",

    "sidebar.pinned": "ピン留め",
    "sidebar.today": "今日",
    "sidebar.yesterday": "昨日",
    "sidebar.this_week": "今週",
    "sidebar.this_month": "今月",
    "sidebar.older": "それ以前",

    "tray.new_chat": "新しい会話",
    "tray.quick_question": "クイック質問",
    "tray.screenshot": "スクリーンショット",
    "tray.always_on_top": "常に最前面",
    "tray.launch_at_login": "ログイン時に起動",
    "tray.settings": "設定...",
    "tray.quit": "YUAを終了",
    "tray.mini_mode": "ミニモード",

    "settings.personalization": "パーソナライズ",
    "settings.notifications": "通知",
    "settings.data": "データ管理",
    "settings.security": "セキュリティ",
    "settings.workspace": "ワークスペース",
    "settings.billing": "課金",
    "settings.memory": "メモリ",
    "settings.desktop": "デスクトップ",
    "settings.about": "情報",
    "settings.theme": "テーマ",
    "settings.theme_light": "ライト",
    "settings.theme_dark": "ダーク",
    "settings.theme_system": "システム",
    "settings.language": "言語",

    "quicklaunch.placeholder": "YUAに質問する...",
    "quicklaunch.hint_shift_enter": "Shift+Enter: 改行",
    "quicklaunch.hint_enter": "Enter: 送信",
    "quicklaunch.hint_tab": "Tab: アプリを開く",

    "desktop.always_on_top": "常に最前面",
    "desktop.auto_update": "自動更新",
    "desktop.check_update": "更新を確認",
    "desktop.mini_quick_question": "クイック質問をしてみてください",

    "update.checking": "更新を確認中...",
    "update.available": "新しいバージョンが利用可能",
    "update.downloading": "ダウンロード中...",
    "update.ready": "更新準備完了",
    "update.restart": "再起動",
    "update.failed": "更新確認に失敗",

    "onboarding.welcome": "YUAへようこそ",
    "onboarding.welcome_desc":
      "いつでもそばにいるAIアシスタント — ショートカットひとつで。",
    "onboarding.start": "始める",
    "onboarding.skip": "スキップ",
    "onboarding.login": "ログイン",
    "onboarding.login_desc": "ログインして会話を同期しましょう",
    "onboarding.login_later": "後でログイン",
    "onboarding.permissions": "設定",
    "onboarding.tour": "クイックツアー",

    "offline.message": "インターネットに接続されていません",

    "palette.placeholder": "コマンドを入力...",
    "palette.no_results": "結果がありません",
    "palette.category_recent": "最近",
    "palette.category_chat": "チャット",
    "palette.category_tools": "ツール",
    "palette.category_settings": "設定",

    "screenshot.title": "スクリーンショット",
    "screenshot.attach": "添付",
    "screenshot.drag_hint": "ドラッグして領域を選択",
  },
};

/* ─── runtime state ─── */

let currentLocale: Locale = "ko";
const listeners = new Set<() => void>();

function notifyListeners(): void {
  listeners.forEach((fn) => fn());
}

export function setLocale(locale: Locale): void {
  currentLocale = locale;
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("yua.locale", locale);
  } catch {
    // ignore
  }
}

export function getLocale(): Locale {
  return currentLocale;
}

export function initLocale(): void {
  if (typeof window === "undefined") return;
  try {
    const saved = localStorage.getItem("yua.locale") as Locale | null;
    if (saved && translations[saved]) {
      currentLocale = saved;
      return;
    }
  } catch {
    // ignore
  }

  // Auto-detect from browser/OS language
  const lang = navigator.language?.slice(0, 2) ?? "ko";
  if (lang === "ja") currentLocale = "ja";
  else if (lang === "en") currentLocale = "en";
  else currentLocale = "ko"; // Default to Korean
}

/** Translate a key. Falls back to Korean, then returns raw key. */
export function t(key: string): string {
  return translations[currentLocale]?.[key] ?? translations.ko[key] ?? key;
}

/* ─── React hook ─── */

export function useLocale() {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const handler = () => forceUpdate((n) => n + 1);
    listeners.add(handler);
    return () => {
      listeners.delete(handler);
    };
  }, []);

  const changeLocale = useCallback((locale: Locale) => {
    setLocale(locale);
    notifyListeners();
  }, []);

  return {
    locale: currentLocale,
    t,
    setLocale: changeLocale,
    availableLocales: ["ko", "en", "ja"] as Locale[],
  };
}

// Initialize on module load
initLocale();
