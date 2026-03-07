type ActivityOp = "ADD" | "PATCH" | "END";

type ActivityItem = {
  id: string;
  kind?: string;
  status?: string;
  title?: string;
  body?: string;
  inlineSummary?: string;
  at?: number;
  meta?: Record<string, unknown>;
  [key: string]: unknown;
};

export type ActivityPayload = {
  op: ActivityOp;
  item: ActivityItem;
};

type AggregateState = {
  id: string;
  kind?: string;
  status?: string;
  title?: string;
  body?: string;
  inlineSummary?: string;
  at?: number;
  meta: Record<string, unknown>;
  sources?: unknown[];
};

function pickSources(meta?: Record<string, unknown>): unknown[] | undefined {
  const raw = meta?.sources;
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  return raw;
}

function hasNonEmptyText(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

export class ActivityAggregator {
  private readonly byId = new Map<string, AggregateState>();
  private readonly lastEmitHash = new Map<string, string>();

  merge(payload: ActivityPayload): ActivityPayload[] {
    const id = payload?.item?.id;
    if (!hasNonEmptyText(id)) return [payload];

    const prev = this.byId.get(id);
    const next: AggregateState = {
      id,
      kind: payload.item.kind ?? prev?.kind,
      status: payload.item.status ?? prev?.status,
      title:
        hasNonEmptyText(payload.item.title) ? payload.item.title : prev?.title,
      body:
        typeof payload.item.body === "string"
          ? payload.item.body
          : prev?.body,
      inlineSummary:
        hasNonEmptyText(payload.item.inlineSummary)
          ? payload.item.inlineSummary
          : prev?.inlineSummary,
      at: payload.item.at ?? prev?.at,
      meta: {
        ...(prev?.meta ?? {}),
        ...(payload.item.meta ?? {}),
      },
      sources: pickSources(payload.item.meta) ?? prev?.sources,
    };

    if (next.sources) {
      next.meta = { ...next.meta, sources: next.sources };
    }

    this.byId.set(id, next);

    if (payload.op === "END") {
      const out: ActivityPayload[] = [];
      const mergedPatch = this.buildMergedPatch(next);
      if (mergedPatch) out.push(mergedPatch);
      out.push({
        op: "END",
        item: {
          id: next.id,
          kind: payload.item.kind ?? next.kind,
          status: payload.item.status ?? next.status,
          at: payload.item.at ?? next.at,
          meta: payload.item.meta ?? next.meta,
        },
      });
      this.byId.delete(id);
      this.lastEmitHash.delete(id);
      return out;
    }

    if (payload.op === "ADD" && this.isTitleOnly(next)) {
      return [
        {
          op: "ADD",
          item: {
            id: next.id,
            kind: next.kind,
            status: next.status,
            title: next.title,
            at: next.at,
            meta: next.meta,
          },
        },
      ];
    }

    const merged = this.buildMergedPatch(next);
    if (!merged) return [];

    const hash = JSON.stringify({
      op: merged.op,
      id: merged.item.id,
      kind: merged.item.kind,
      status: merged.item.status,
      title: merged.item.title,
      body: merged.item.body,
      inlineSummary: merged.item.inlineSummary,
    });
    const prevHash = this.lastEmitHash.get(next.id);
    if (prevHash === hash) return [];

    this.lastEmitHash.set(next.id, hash);
    return [merged];
  }

  private isTitleOnly(state: AggregateState): boolean {
    const hasTitle = hasNonEmptyText(state.title);
    const hasBody = hasNonEmptyText(state.body);
    const hasSources = Array.isArray(state.sources) && state.sources.length > 0;
    return hasTitle && !hasBody && !hasSources;
  }

  private buildMergedPatch(state: AggregateState): ActivityPayload | null {
    const hasTitle = hasNonEmptyText(state.title);
    const hasBody = hasNonEmptyText(state.body);
    const hasSources = Array.isArray(state.sources) && state.sources.length > 0;
    const hasStatus = hasNonEmptyText(state.status);

    if (!hasTitle && !hasBody && !hasSources && !hasStatus) {
      return null;
    }

    const item: ActivityItem = {
      id: state.id,
      kind: state.kind,
      status: state.status,
      at: state.at,
      meta: state.meta,
    };

    if (hasTitle) item.title = state.title;
    if (typeof state.body === "string") item.body = state.body;
    if (hasNonEmptyText(state.inlineSummary)) item.inlineSummary = state.inlineSummary;

    return {
      op: "PATCH",
      item,
    };
  }
}
