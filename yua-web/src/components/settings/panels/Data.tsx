export default function DataPanel() {
  return (
    <div className="max-w-2xl space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">
          데이터 제어
        </h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-[var(--text-secondary)]">
          데이터 사용 및 저장 방식을 관리합니다.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-[var(--text-primary)]">
          보기 설정
        </h2>
        <label className="flex items-center justify-between rounded-lg border px-4 py-3 text-sm dark:border-[var(--line)]">
          <div>
            <div className="font-medium text-[var(--text-primary)]">최근 대화만 표시</div>
            <div className="mt-1 text-xs text-gray-500 dark:text-[var(--text-secondary)]">
              목록에서 최근 대화만 보이도록 정리합니다.
            </div>
          </div>
          <input type="checkbox" className="h-4 w-4" />
        </label>
        <p className="text-xs text-gray-400 dark:text-[var(--text-muted)]">
          현재는 UI만 제공됩니다. 실제 필터링은 추후 연동됩니다.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-[var(--text-primary)]">
          데이터 관리
        </h2>
        <div className="space-y-2">
          <button
            type="button"
            disabled
            className="w-full rounded-lg border px-4 py-3 text-left text-sm text-gray-500 dark:text-[var(--text-secondary)] dark:border-[var(--line)] opacity-60"
          >
            데이터 내보내기 (준비 중)
          </button>
          <button
            type="button"
            disabled
            className="w-full rounded-lg border px-4 py-3 text-left text-sm text-gray-500 dark:text-[var(--text-secondary)] dark:border-[var(--line)] opacity-60"
          >
            대화 기록 삭제 (준비 중)
          </button>
          <button
            type="button"
            disabled
            className="w-full rounded-lg border px-4 py-3 text-left text-sm text-gray-500 dark:text-[var(--text-secondary)] dark:border-[var(--line)] opacity-60"
          >
            프로젝트 데이터 삭제 (준비 중)
          </button>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-[var(--text-primary)]">
          데이터 처리 안내
        </h2>
        <div className="rounded-lg border px-4 py-4 text-sm text-gray-600 dark:text-[var(--text-secondary)] dark:border-[var(--line)]">
          자세한 내용은 개인정보처리방침과 이용약관을 확인하세요.
        </div>
      </section>
    </div>
  );
}
