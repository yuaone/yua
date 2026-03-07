  // 📂 src/ai/time/time-axis-resolver.ts
  import { formatDate, daysBetween } from "../../utils/date-utils";

  export type TimeRelation = "PAST" | "TODAY" | "FUTURE" | "UNKNOWN";

  export interface TimeAxis {
    serverNow: string;
    targetDate?: string;
    relation: TimeRelation;
    daysDiff?: number;
  }

  export function resolveTimeAxis(args: {
    serverNow: Date;
    dateHint?: { raw: string; kind: "exact" | "range" | "year" };
  }): TimeAxis {
    if (!args.dateHint || args.dateHint.kind !== "exact") {
      return {
        serverNow: formatDate(args.serverNow),
        relation: "UNKNOWN",
      };
    }

    const diff = daysBetween(
      formatDate(args.serverNow),
      args.dateHint.raw
    );

    return {
      serverNow: formatDate(args.serverNow),
      targetDate: args.dateHint.raw,
      relation:
        diff > 0 ? "FUTURE" :
        diff === 0 ? "TODAY" :
        "PAST",
      daysDiff: diff,
    };
  }
