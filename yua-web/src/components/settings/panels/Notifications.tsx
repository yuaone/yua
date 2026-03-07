import { useEffect, useState } from "react";

export default function Notifications() {
  const STORAGE_KEY = "yua.notifications";
  const [states, setStates] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Record<string, boolean>;
      setStates(parsed || {});
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(states));
    } catch {
      // ignore
    }
  }, [states]);

  const rows = [
    {
      id: "messageCompleted",
      title: "메시지 완료 알림",
      desc: "Assistant 응답이 완료되면 알려줍니다.",
    },
    {
      id: "projectUpdates",
      title: "프로젝트 업데이트",
      desc: "프로젝트/스레드 변경을 알려줍니다.",
    },
    {
      id: "systemNotices",
      title: "시스템 공지",
      desc: "서비스 공지와 중요한 시스템 메시지를 받습니다.",
    },
  ];

  return (
    <div className="max-w-2xl space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">
          알림
        </h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-[var(--text-secondary)]">
          알림 및 시스템 메시지 수신 방식을 관리합니다.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-[var(--text-primary)]">
          수신 설정
        </h2>
        <div className="space-y-2">
          {rows.map((row) => (
            <label
              key={row.title}
              className="flex items-center justify-between rounded-lg border px-4 py-3 text-sm dark:border-[var(--line)]"
            >
              <div>
                <div className="font-medium text-[var(--text-primary)]">
                  {row.title}
                </div>
                <div className="mt-1 text-xs text-gray-500 dark:text-[var(--text-secondary)]">
                  {row.desc}
                </div>
              </div>
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={Boolean(states[row.id])}
                onChange={(e) =>
                  setStates((prev) => ({
                    ...prev,
                    [row.id]: e.target.checked,
                  }))
                }
              />
            </label>
          ))}
        </div>
        <p className="text-xs text-gray-400 dark:text-[var(--text-muted)]">
          현재는 UI만 제공됩니다. 실제 알림 수신은 추후 연동됩니다.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-[var(--text-primary)]">
          권한 상태
        </h2>
        <div className="rounded-lg border px-4 py-4 text-sm text-gray-600 dark:text-[var(--text-secondary)] dark:border-[var(--line)]">
          브라우저 알림 권한은 추후 연결됩니다.
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-[var(--text-primary)]">
          모바일 연동
        </h2>
        <div className="rounded-lg border px-4 py-4 text-sm text-gray-600 dark:text-[var(--text-secondary)] dark:border-[var(--line)]">
          모바일 앱에서 푸시 알림 설정을 제공할 예정입니다.
        </div>
      </section>
    </div>
  );
}
