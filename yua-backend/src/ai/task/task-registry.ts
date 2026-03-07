// 📂 src/ai/task/task-registry.ts
// 🔥 Task Registry — DB/JSON 하이브리드

import fs from "fs";
import path from "path";
import { TaskDefinition } from "./task-automation-engine";

const file = path.join(process.cwd(), "task-registry.json");

export const TaskRegistry = {
  async getAll(): Promise<TaskDefinition[]> {
    if (!fs.existsSync(file)) return [];
    const raw = fs.readFileSync(file, "utf8");
    return JSON.parse(raw || "[]");
  },

  async save(task: TaskDefinition) {
    const list = await this.getAll();
    const exist = list.find((x) => x.id === task.id);

    if (exist) {
      Object.assign(exist, task);
    } else {
      list.push(task);
    }

    fs.writeFileSync(file, JSON.stringify(list, null, 2));
  },

  async disable(id: string) {
    const list = await this.getAll();
    const updated = list.map((t) =>
      t.id === id ? { ...t, enabled: false } : t
    );
    fs.writeFileSync(file, JSON.stringify(updated, null, 2));
  },
};
