// 📂 src/ai/task/task-automation-engine.ts
// 🔥 Task Automation Engine — ENTERPRISE FINAL (2025.11)
// -------------------------------------------------------------------
// ✔ Cron-like Scheduler (초/분/시간/요일 단위)
// ✔ AutoAgentEngine / ResearchEngine / DocEngine 조합 자동 실행
// ✔ DB 저장형 스케줄 + 메모리 캐시 스케줄
// ✔ AuditEngine 연동
// ✔ Simple JSON 기반 Task 정의
// -------------------------------------------------------------------

import { TaskRegistry } from "./task-registry";
import { TaskRunner } from "./task-runner";
import { AuditEngine } from "../audit/audit-engine";

export interface TaskDefinition {
  id: string;
  cron: string;     // 예: "*/10 * * * *" (10분마다)
  action: string;   // 예: "research_summary"
  payload?: any;
  enabled: boolean;
}

export const TaskAutomationEngine = {
  tasks: [] as TaskDefinition[],
  interval: null as any,

  // -------------------------------------------------------
  // 1) 초기 로드 (DB or JSON)
  // -------------------------------------------------------
  async loadTasks() {
    const list = await TaskRegistry.getAll();
    this.tasks = list.filter((t) => t.enabled);
  },

  // -------------------------------------------------------
  // 2) Cron 검사
  // -------------------------------------------------------
  cronMatch(cron: string, date: Date): boolean {
    // "분 시 일 월 요일" 단순 파서 (엔터프라이즈용 확장 가능)
    const [min, hour, day, month, week] = cron.split(" ");

    const checks = [
      this.matchField(min, date.getMinutes()),
      this.matchField(hour, date.getHours()),
      this.matchField(day, date.getDate()),
      this.matchField(month, date.getMonth() + 1),
      this.matchField(week, date.getDay()),
    ];

    return checks.every(Boolean);
  },

  matchField(field: string, value: number): boolean {
    if (field === "*") return true;
    if (field.startsWith("*/")) {
      const step = Number(field.replace("*/", ""));
      return value % step === 0;
    }
    return Number(field) === value;
  },

  // -------------------------------------------------------
  // 3) Task 실행기
  // -------------------------------------------------------
  async execute(task: TaskDefinition) {
    const result = await TaskRunner.run(task.action, task.payload);

    await AuditEngine.record({
  route: "/task_automation",
  method: "execute",
  userId: 0,
  extra: {
    taskId: task.id,
    action: task.action,
    payload: task.payload,
    result,
  },
});


    return result;
  },

  // -------------------------------------------------------
  // 4) 스케줄러 시작
  // -------------------------------------------------------
  start() {
    if (this.interval) return;

    this.interval = setInterval(async () => {
      const now = new Date();
      for (const t of this.tasks) {
        if (this.cronMatch(t.cron, now)) {
          await this.execute(t);
        }
      }
    }, 1000 * 30); // 30초마다 검사
  },

  // -------------------------------------------------------
  // 5) Task 추가
  // -------------------------------------------------------
  async add(task: TaskDefinition) {
    await TaskRegistry.save(task);
    await this.loadTasks();
  },

  // -------------------------------------------------------
  // 6) Task 삭제/비활성화
  // -------------------------------------------------------
  async remove(id: string) {
    await TaskRegistry.disable(id);
    await this.loadTasks();
  },
};
