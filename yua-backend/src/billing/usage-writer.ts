// 📂 src/billing/usage-writer.ts
import { db } from "../db/firebase";

export interface UsageLogInput {
  instanceId: string;
  engine: string;
  tokenIn?: number;
  tokenOut?: number;
  quantumCycles?: number;
  meta?: Record<string, any>;
}

export async function writeUsageLog(
  instanceId: string,
  data: UsageLogInput
) {
  if (!instanceId) {
    throw new Error("❌ instanceId is required for usage logging");
  }

  const day = new Date().toISOString().slice(0, 10);

  const ref = db
    .collection("instance_usage_logs")
    .doc(instanceId)
    .collection(day)
    .doc();

  await ref.set({
    instanceId,
    engine: data.engine,
    tokenIn: data.tokenIn ?? 0,
    tokenOut: data.tokenOut ?? 0,
    quantumCycles: data.quantumCycles ?? 0,
    meta: data.meta ?? {},
    timestamp: new Date().toISOString(),
  });
}
