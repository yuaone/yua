// 🔒 Metadata Aggregator — PHASE 12-9-5
// -----------------------------------
// PHASE 13 입력 생성 전용

import { MetadataRepository } from "./metadata.repo";

export type AggregatedSignal = {
  category: string;
  frequency: number;
};

export const MetadataAggregator = {
  async aggregateWorkspace(params: {
    workspaceId: string;
    hours?: number;
  }): Promise<AggregatedSignal[]> {
    const hours = params.hours ?? 24;

    const categories = [
      "JUDGMENT_OUTCOME",
      "FAILURE_SIGNAL",
      "UNCERTAINTY_SIGNAL",
      "VERIFIER_STATS",
      "IMPLICIT_BEHAVIOR",
      "TEMPORAL_STABILITY",
    ];

    const results: AggregatedSignal[] = [];

    for (const category of categories) {
      const rows =
        await MetadataRepository.aggregateRecent({
          workspaceId: params.workspaceId,
          category,
          hours,
        });

      const total = rows.reduce(
        (a, r) => a + Number(r.count),
        0
      );

      results.push({
        category,
        frequency: total,
      });
    }

    return results;
  },
};
