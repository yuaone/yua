// 🔒 Metadata Repository — PHASE 12-9-5
// -----------------------------------

import { pgPool } from "../../db/postgres";
import type { MetadataEvent } from "./metadata.types";

export const MetadataRepository = {
  async insertEvent(event: MetadataEvent): Promise<void> {
    await pgPool.query(
      `
      INSERT INTO workspace_metadata_events
        (workspace_id, category, payload, created_at)
      VALUES ($1, $2, $3, $4)
      `,
      [
        event.workspaceId,
        event.category,
        event.payload,
        event.createdAt ?? new Date(),
      ]
    );
  },

  async aggregateRecent(params: {
    workspaceId: string;
    category: string;
    hours: number;
  }): Promise<any[]> {
    const { rows } = await pgPool.query(
      `
      SELECT
        payload,
        COUNT(*) AS count
      FROM workspace_metadata_events
      WHERE workspace_id = $1
        AND category = $2
        AND created_at >= NOW() - ($3 || ' hours')::interval
      GROUP BY payload
      `,
      [params.workspaceId, params.category, params.hours]
    );

    return rows;
  },
};
