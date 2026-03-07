// 🔥 PHASE 5-C
// Judgment Rollout Engine — SSOT FINAL

import { pgPool } from "../../../db/postgres";

export class JudgmentRolloutEngine {
  /**
   * 🔁 배치 배포
   */
  async deploy(): Promise<void> {
    const { rows: deltas } = await pgPool.query<{
      id: string;
      trigger_hint: string;
      delta: number;
    }>(
      `
      SELECT id, trigger_hint, delta
      FROM judgment_rule_deltas
      WHERE deployed = false
      `
    );

    for (const d of deltas) {
      await this.applyShadow(d.trigger_hint, d.delta);
      await this.applyCanary(d.trigger_hint, d.delta);

      const killed = await this.checkKillSwitch(
        d.trigger_hint
      );
      if (!killed) {
        await this.applyGlobal(d.trigger_hint, d.delta);
      }

      await pgPool.query(
        `UPDATE judgment_rule_deltas SET deployed = true WHERE id = $1`,
        [d.id]
      );
    }
  }

  private async applyShadow(
    trigger: string,
    delta: number
  ) {
    // Shadow = 로그만 (DB 반영 ❌)
    await pgPool.query(
      `
      INSERT INTO instance_logs(event, detail, created_at)
      VALUES ('judgment_shadow', $1, NOW())
      `,
      [{ trigger, delta }]
    );
  }

  private async applyCanary(
    trigger: string,
    delta: number
  ) {
    // Canary = 일부 instance만
    await pgPool.query(
      `
      UPDATE judgment_rules
      SET confidence = confidence + $1
      WHERE trigger_hint = $2
        AND random() < 0.2
      `,
      [delta, trigger]
    );
  }

  private async applyGlobal(
    trigger: string,
    delta: number
  ) {
    await pgPool.query(
      `
      UPDATE judgment_rules
      SET confidence = confidence + $1
      WHERE trigger_hint = $2
      `,
      [delta, trigger]
    );
  }

  /**
   * ☠️ Kill-Switch
   * hard failure 3% 초과 → 즉시 disable
   */
  private async checkKillSwitch(
    trigger: string
  ): Promise<boolean> {
    const { rows } = await pgPool.query<{
      hard: number;
      total: number;
    }>(
      `
      SELECT
        SUM(CASE WHEN type='hard' THEN 1 ELSE 0 END) as hard,
        COUNT(*) as total
      FROM judgment_failures
      WHERE reason = $1
      `,
      [trigger]
    );

    const hard = Number(rows[0]?.hard ?? 0);
    const total = Number(rows[0]?.total ?? 0);

    if (total === 0) return false;

    if (hard / total > 0.03) {
      await pgPool.query(
        `
        UPDATE judgment_rules
        SET status = 'disabled'
        WHERE trigger_hint = $1
        `,
        [trigger]
      );
      return true;
    }

    return false;
  }
}
