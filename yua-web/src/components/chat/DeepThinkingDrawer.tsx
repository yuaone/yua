"use client";

import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { X, Check } from "lucide-react";
import type { ThinkingProfile } from "yua-shared/types/thinkingProfile";
import { getThinkingContract } from "yua-shared/types/thinkingProfile";
import type { OverlayChunk } from "@/store/useStreamSessionStore";
import { ActivityKind } from "yua-shared/stream/activity";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAuth } from "@/contexts/AuthContext";
import { deriveStepsFromChunks } from "@/view-models/stepProjection";
import type { StepView } from "@/view-models/stepProjection";
import ToolArtifactRenderer from "./ToolArtifactRenderer";
import QuantAnalysisBlock from "./quant/QuantAnalysisBlock";

 
type DrawerSource = {
  id: string;
  label: string;
  url?: string;
  host?: string;
  preview?: string;
};

function normalizeDrawerSource(input: any): DrawerSource | null {
  if (!input) return null;
  if (typeof input.url !== "string" || !input.url) return null;

  let host: string | undefined;
  try {
    host = input.host ?? new URL(input.url).hostname;
  } catch {
    host = undefined;
  }

  return {
    id: String(input.id ?? input.url),
    label: String(input.label ?? host ?? input.url),
    url: input.url,
    host,
    preview:
      typeof input.preview === "string"
        ? input.preview
        : undefined,
  };
}

function dedupeByHost(
  sources: {
    id: string;
    label: string;
    url: string;
    host?: string | null;
  }[]
) {
  const seen = new Set<string>();
  const out: typeof sources = [];

  for (const s of sources) {
    const key = `${s.host ?? ""}::${s.url ?? ""}`;
    if (!key) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }

  return out;
}

const faviconCache = new Map<string, string>();

function getFavicon(host?: string | null) {
  if (!host) return undefined;
  if (faviconCache.has(host)) {
    return faviconCache.get(host);
  }
  const url = `https://www.google.com/s2/favicons?domain=${host}&sz=32`;
  faviconCache.set(host, url);
  return url;
}

const SourceCard = React.memo(function SourceCard({
  source,
}: {
  source: {
    id: string;
    label: string;
    url: string;
    host?: string | null;
  };
}) {
  const favicon = getFavicon(source.host);

  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
       className="yua-source-card group relative flex items-center gap-2 px-2 py-2 rounded-md hover:bg-white/10 min-w-0"
    >
      <div className="yua-favicon-slot">
        {favicon ? (
          <img
            src={favicon}
            alt=""
            width={16}
            height={16}
            loading="lazy"
            decoding="async"
            className="yua-favicon-img"
          />
        ) : (
          <div className="yua-favicon-fallback" />
        )}
      </div>

     <div className="min-w-0">
        <div className="text-[13px] font-medium text-[var(--text-primary)] truncate">
          {source.label}
        </div>
        {source.host && (
          <div className="text-[11px] text-[var(--text-muted)] truncate">
            {source.host}
          </div>
        )}
      </div>

      {/* 🔥 Hover preview */}
      <div className="absolute left-0 top-full mt-2 hidden group-hover:block bg-[var(--surface-panel)] border border-[var(--line)] shadow-lg rounded-md p-3 w-[280px] z-50 text-[12px] text-[var(--text-secondary)]">
        {source.url}
      </div>
    </a>
  );
  // FIX: closed React.memo properly
});

const SearchSourceGroup = React.memo(function SearchSourceGroup({
  sources,
  groupKey,
}: {
  sources: {
    id: string;
    label: string;
    url: string;
    host?: string | null;
  }[];
  groupKey: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const toggle = () => setExpanded((v) => !v);
 const stableSources = useMemo(() => {
   return dedupeByHost(sources ?? []);
 }, [sources]);

 const LIMIT = 3;
 const visible = expanded
   ? stableSources
   : stableSources.slice(0, LIMIT);
 const hiddenCount = Math.max(0, stableSources.length - LIMIT);

  return (
    <div className="yua-step-source-group" data-group={groupKey}>
      <div
        className="yua-step-source-row"
        data-expanded={expanded ? "true" : "false"}
      >
        {visible.map((s) => {
          const favicon = getFavicon(s.host);
          return (
            <a
              key={s.id}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
               className="yua-step-source-chip"
            >
              {favicon && (
                <img
                  src={favicon}
                  alt=""
                  className="h-3 w-3 rounded-sm"
                />
              )}
              <span className="yua-step-source-label">
                {s.host ?? s.label}
              </span>
            </a>
          );
        })}
        {hiddenCount > 0 && (
          <button
            type="button"
            onClick={toggle}
            aria-expanded={expanded}
            className="yua-step-source-chip yua-step-source-more"
          >
            {expanded ? "접기" : `+ ${hiddenCount}개 더 보기`}
          </button>
        )}
      </div>
    </div>
  );
});

type Props = {
  variant: "mobile" | "desktop";
  open: boolean;
  onClose: () => void;
  messageId: string;
  profile: ThinkingProfile;
  elapsedMs: number;
  finalized: boolean;
  hasText: boolean;
  label?: string | null;
  chunks: OverlayChunk[];
  startedAt?: number | null;
  finalizedAt?: number | null;
};

type UiLang = "ko" | "en";

const LANG_OPTIONS: Array<{ key: UiLang; label: string }> = [
  { key: "en", label: "English" },
  { key: "ko", label: "한국어" },
];

function langLabel(v: UiLang) {
  return LANG_OPTIONS.find((x) => x.key === v)?.label ?? "English";
}

function extractAsciiDiagramBody(input: string): string | null {
  const text = String(input ?? "");
  if (!/[┌┐└┘│─]/.test(text)) return null;

  const fenced = text.match(/^```(?:text)?\n([\s\S]*?)\n```$/);
  const candidate = fenced ? fenced[1] : text;
  if (!/[┌┐└┘│─]/.test(candidate)) return null;

  const lines = candidate.split("\n").filter((l) => l.trim().length > 0);
  if (lines.length < 3) return null;
  const hasTop = lines.some((l) => /┌.*┐/.test(l));
  const hasBottom = lines.some((l) => /└.*┘/.test(l));
  if (!hasTop || !hasBottom) return null;
  return candidate;
}

/** ChatGPT처럼 "4m 16s" */
function formatActivityDuration(ms: number) {
  const sec = Math.max(0, Math.floor(ms / 1000));
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s}s`;
}

export default function DeepThinkingDrawer(props: Props) {
  const { open, elapsedMs, label } = props;
  const { authFetch } = useAuth();
  const [uiLang, setUiLang] = useState<UiLang>("en");
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [translatedByKey, setTranslatedByKey] = useState<Record<string, string>>({});
  const translateCacheRef = useRef<Map<string, string>>(new Map());
  const inflightRef = useRef<Set<string>>(new Set());
  const langMenuRefMobile = useRef<HTMLDivElement | null>(null);
  const langMenuRefDesktop = useRef<HTMLDivElement | null>(null);

  const closeDrawer = () => {
    // 외부 콜백도 존중
    props.onClose?.();
  };
  const effectiveChunks: OverlayChunk[] =
    Array.isArray(props.chunks) && props.chunks.length > 0
      ? props.chunks
      : [];
  const stepViews: StepView[] = useMemo(() => {
    return deriveStepsFromChunks(effectiveChunks);
  }, [effectiveChunks]);
  const startedAt = typeof props.startedAt === "number" ? props.startedAt : null;
  const finalizedAt = typeof props.finalizedAt === "number" ? props.finalizedAt : null;
  const [liveNow, setLiveNow] = useState(Date.now());
  const freeze =
    props.hasText || props.finalized;


  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => e.key === "Escape" && closeDrawer();
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
 // 🔥 타이머 실시간 동기화
  useEffect(() => {
    if (!open) return;
    if (freeze) return;

    const id = setInterval(() => {
      setLiveNow(Date.now());
    }, 1000);

    return () => clearInterval(id);
  }, [open, freeze]);
  

  const contract = getThinkingContract(props.profile);
  const activityLabel =
  typeof (contract.ui as any)?.activityLabel === "string"
    ? (contract.ui as any).activityLabel
    : "활동";

 const displayElapsed =
 props.finalized && finalizedAt != null && startedAt != null
   ? Math.max(0, finalizedAt - startedAt)
     : freeze
     ? elapsedMs
     : liveNow - (startedAt ?? liveNow);

  const activityText = `${activityLabel} · ${formatActivityDuration(displayElapsed)}`;

  const targetLang: "ko" | "en" | null = uiLang === "en" ? null : "ko";

  const hashBody = useCallback((input: string) => {
    let h = 2166136261;
    for (const ch of input) {
      h ^= ch.codePointAt(0) ?? 0;
      h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
    }
    return (h >>> 0).toString(16);
  }, []);

  const translateBody = async (text: string, target: "ko" | "en") => {
    const req: RequestInit = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, target }),
    };
    const res = authFetch
      ? await authFetch("/chat/translate", req)
      : await fetch("/api/chat/translate", { ...req, credentials: "include" });

    if (!res.ok) return text;
    const data = await res.json().catch(() => null);
    if (!data || data.ok !== true || typeof data.text !== "string") return text;
    return data.text;
  };

  const cacheKeyOf = useCallback(
    (stepId: string, bodyText: string, lang: "ko" | "en") =>
      `${props.messageId}:${stepId}:${hashBody(bodyText)}:${lang}`,
    [props.messageId, hashBody]
  );

  const ensureTranslated = useCallback(
    async (step: StepView, bodyText: string) => {
      if (!targetLang) return;
      if (!bodyText.trim()) return;

      const key = cacheKeyOf(step.id, bodyText, targetLang);
      if (inflightRef.current.has(key)) return;

      const cached = translateCacheRef.current.get(key);
      if (cached) {
        setTranslatedByKey((prev) => (prev[key] ? prev : { ...prev, [key]: cached }));
        return;
      }

      inflightRef.current.add(key);
      try {
        const translated = await translateBody(bodyText, targetLang);
        translateCacheRef.current.set(key, translated);
        setTranslatedByKey((prev) => ({ ...prev, [key]: translated }));
      } finally {
        inflightRef.current.delete(key);
      }
    },
    [targetLang, cacheKeyOf]
  );

  const getDisplayBody = (step: StepView, bodyText: string) => {
    if (!targetLang) return bodyText;
    const key = cacheKeyOf(step.id, bodyText, targetLang);
    return translatedByKey[key] ?? bodyText;
  };

  useEffect(() => {
    if (!open) return;
    if (!targetLang) return;
    stepViews.forEach((step) => {
      const bodyText = typeof step.body === "string" ? step.body : "";
      if (!bodyText.trim()) return;
      void ensureTranslated(step, bodyText);
    });
  }, [open, targetLang, stepViews, ensureTranslated]);

  useEffect(() => {
    if (!langMenuOpen) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      const inMobile = langMenuRefMobile.current?.contains(target) ?? false;
      const inDesktop = langMenuRefDesktop.current?.contains(target) ?? false;
      if (!inMobile && !inDesktop) {
        setLangMenuOpen(false);
      }
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [langMenuOpen]);

  // ✅ SSOT: Body는 mobile/desktop 공용 (중복 방지)
  const Body = (
    <div className="flex-1 overflow-y-auto px-4 py-4">
      <div className="mb-3 text-[13px] font-semibold text-[var(--text-primary)]">
        {(contract.ui as any)?.drawerSectionLabel ?? "잘 생각하기"}
      </div>

      {stepViews.length === 0 && !props.finalized ? (
        <div className="space-y-4 animate-yua-skeleton-fade">
          <div className="yua-skeleton-line w-[70%]" />
          <div className="yua-skeleton-line w-[85%]" />
          <div className="yua-skeleton-line w-[60%]" />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="yua-drawer-timeline yua-step-timeline">
            {stepViews.map((step, idx) => {
              const isFirst = idx === 0;
              const isLast = idx === stepViews.length - 1;
              const titleText = typeof step.title === "string" ? step.title : "";
              const hasTitle = titleText.trim().length > 0;
              const isSearch =
                step.kind === ActivityKind.SEARCHING || step.metaTool === "SEARCH";
              const stepSources = step.sources ?? [];
              const hasSources = stepSources.length > 0;
              const bodyText = typeof step.body === "string" ? step.body : "";
              const hasBody = bodyText.trim().length > 0;
              const displayBody = getDisplayBody(step, bodyText);

              if (!hasTitle && !hasBody && !hasSources) return null;

              return (
                <div
                  key={`step-${step.id}-${idx}`}
                  className="yua-drawer-node yua-step-row animate-yua-drawer-segment"
                >
                  <div className="yua-step-rail" aria-hidden="true">
                    {!isFirst ? <span className="yua-step-line yua-step-line-top" /> : null}
                    <span className="yua-step-dot" />
                    {!isLast ? <span className="yua-step-line yua-step-line-bottom" /> : null}
                  </div>

                  <div className="yua-step-content">
                    {hasTitle && !isSearch && (
                      <div className="yua-step-title">{titleText}</div>
                    )}

                    {hasTitle && isSearch && (
                      <div className="yua-step-title yua-step-title-search">
                        {titleText.split(",").map((t, i) => (
                          <span key={i} className="yua-step-query-pill">
                            {t.trim()}
                          </span>
                        ))}
                      </div>
                    )}

                    <div
                      className="yua-step-sources"
                      data-empty={stepSources.length === 0 ? "true" : "false"}
                    >
                      {stepSources.length > 0 ? (
                        <SearchSourceGroup
                          sources={stepSources}
                          groupKey={`step-${step.id}`}
                        />
                      ) : (
                        <span className="yua-step-sources-empty" aria-hidden="true" />
                      )}
                    </div>

                    <div className="yua-step-body">
                      {(() => {
                        // Tool kind: structured code block display
                        const isToolStep =
                          step.kind === ActivityKind.TOOL ||
                          step.kind === ActivityKind.CODE_INTERPRETING ||
                          step.kind === ActivityKind.EXECUTING;
                        if (isToolStep) {
                          const meta = step.meta as Record<string, any> | null;
                          const toolName = titleText || meta?.toolName || null;
                          const rawParams = meta?.params ?? meta?.arguments ?? meta?.input;
                          const rawResult = meta?.result ?? meta?.output;

                          let paramsStr: string | null = null;
                          if (rawParams && typeof rawParams === "object") {
                            paramsStr = JSON.stringify(rawParams, null, 2);
                          } else if (typeof rawParams === "string") {
                            try { paramsStr = JSON.stringify(JSON.parse(rawParams), null, 2); } catch { paramsStr = rawParams; }
                          }

                          let resultStr: string | null = null;
                          if (typeof rawResult === "string") {
                            resultStr = rawResult;
                          } else if (rawResult && typeof rawResult === "object") {
                            resultStr = JSON.stringify(rawResult, null, 2);
                          }

                          // Fallback: parse body as JSON
                          if (!paramsStr && !resultStr && displayBody.trim()) {
                            try { paramsStr = JSON.stringify(JSON.parse(displayBody.trim()), null, 2); } catch { resultStr = displayBody.trim(); }
                          }

                          return (
                            <>
                              {toolName && (
                                <span className="yua-tool-badge">{toolName}</span>
                              )}
                              {paramsStr && (
                                <pre className="yua-tool-params-pre">{paramsStr}</pre>
                              )}
                              {resultStr && (
                                <p className="yua-step-md-p" style={{ marginTop: 4 }}>{resultStr}</p>
                              )}
                            </>
                          );
                        }

                        const ascii = extractAsciiDiagramBody(displayBody);
                        if (ascii) {
                          return <pre className="yua-step-ascii-pre">{ascii}</pre>;
                        }
                        return (
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              p: ({ children }) => <p className="yua-step-md-p">{children}</p>,
                              ul: ({ children }) => <ul className="yua-step-md-ul">{children}</ul>,
                              li: ({ children }) => <li className="yua-step-md-li">{children}</li>,
                              h1: ({ children }) => <p className="yua-step-md-h">{children}</p>,
                              h2: ({ children }) => <p className="yua-step-md-h">{children}</p>,
                              h3: ({ children }) => <p className="yua-step-md-h">{children}</p>,
                              h4: ({ children }) => <p className="yua-step-md-h">{children}</p>,
                              a: ({ href, children }) => {
                                if (!href) return <>{children}</>;

                                const childText =
                                  typeof children === "string"
                                    ? children
                                    : Array.isArray(children)
                                      ? children.join("")
                                      : "";

                                const normalizedHref = href.replace(/[),.;]+$/, "");
                                const isAlreadyInSources = stepSources.some((s) => {
                                  const u = (s.url ?? "").replace(/[),.;]+$/, "");
                                  return u === normalizedHref || u === href;
                                });

                                const isBareUrl =
                                  childText.trim() === href || childText.trim() === normalizedHref;

                                if (isBareUrl || isAlreadyInSources) return null;

                                return (
                                  <a
                                    href={href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="yua-step-md-link"
                                  >
                                    {children}
                                  </a>
                                );
                              },
                            }}
                          >
                            {displayBody}
                          </ReactMarkdown>
                        );
                      })()}
                    </div>

                    {step.artifact && (
                      <ToolArtifactRenderer artifact={step.artifact} />
                    )}

                    {step.kind === ActivityKind.QUANT_ANALYSIS && (
                      <QuantAnalysisBlock
                        data={(step.meta as any)?.quantData ?? null}
                        action={(step.meta as any)?.quantAction}
                        status={step.status}
                        disclaimer={(step.meta as any)?.disclaimer}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {props.finalized && props.hasText && (
        <div className="mt-8 animate-yua-fade-in">
          <div className="flex items-center gap-2 text-[14px] text-[var(--text-secondary)] font-medium">
            <Check size={16} className="text-green-500 shrink-0" />
            <span>생각 완료</span>
          </div>

          <div className="mt-4 mb-6 h-px bg-[var(--line)]" />

          {(() => {
            const allSources = stepViews.flatMap((s) =>
              Array.isArray(s.sources) ? s.sources : []
            );
            const deduped = dedupeByHost(allSources);
            if (deduped.length === 0) return null;
            return (
              <>
                <div className="text-[13px] font-semibold text-[var(--text-muted)] mb-3">
                  전체 출처 · {deduped.length}
                </div>
                <div className="space-y-3">
                  {deduped.map((s) => (
                    <SourceCard key={`${s.host ?? s.url}-${s.url}`} source={s} />
                  ))}
                </div>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );

  const Panel = (
    <>
      {props.variant === "mobile" && (
      <aside
        className="fixed inset-0 z-[60] bg-[var(--surface-panel)] text-[var(--text-secondary)] flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-label={activityText}
      >
        <div className="h-full flex flex-col">
      {/* Header (ChatGPT 위치/형태) */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--line)]">
        <div className="flex items-center gap-2 min-w-0">
          <div className="text-[18px] font-semibold text-[var(--text-primary)] tracking-[-0.015em] truncate">
            {activityText}
          </div>
          <div ref={langMenuRefMobile} className="yua-lang-picker">
            <button
              type="button"
              className="yua-lang-trigger"
              aria-expanded={langMenuOpen}
              onClick={() => setLangMenuOpen((v) => !v)}
            >
              <span className="yua-lang-globe-dot" aria-hidden="true" />
              <span className="yua-lang-trigger-text">{langLabel(uiLang)}</span>
            </button>
            {langMenuOpen && (
              <div className="yua-lang-pocket" role="menu" aria-label="번역 언어 설정">
                {LANG_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    className={`yua-lang-chip ${uiLang === opt.key ? "is-active" : ""}`}
                    onClick={() => {
                      setUiLang(opt.key);
                      setLangMenuOpen(false);
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <button
          onClick={closeDrawer}
          className="h-9 w-9 rounded-full hover:bg-white/10 flex items-center justify-center"
          aria-label="닫기"
        >
          <X size={18} />
        </button>
      </div>

      {/* Body (shared) */}
      {Body}
        </div>
      </aside>
)}
      {/* Desktop Drawer (grid column 안에서 내용만 렌더) */}
      {props.variant === "desktop" && (
      <div className="h-full w-full flex flex-col bg-[var(--surface-panel)] text-[var(--text-secondary)]">
        {/* Header (Desktop) */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--line)]">
          <div className="flex items-center gap-2 min-w-0">
            <div className="text-[16px] font-semibold text-[var(--text-primary)] tracking-[-0.015em] truncate">
              {activityText}
            </div>
            <div ref={langMenuRefDesktop} className="yua-lang-picker">
              <button
                type="button"
                className="yua-lang-trigger"
                aria-expanded={langMenuOpen}
                onClick={() => setLangMenuOpen((v) => !v)}
              >
                <span className="yua-lang-globe-dot" aria-hidden="true" />
                <span className="yua-lang-trigger-text">{langLabel(uiLang)}</span>
              </button>
              {langMenuOpen && (
                <div className="yua-lang-pocket" role="menu" aria-label="번역 언어 설정">
                  {LANG_OPTIONS.map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      className={`yua-lang-chip ${uiLang === opt.key ? "is-active" : ""}`}
                      onClick={() => {
                        setUiLang(opt.key);
                        setLangMenuOpen(false);
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={closeDrawer}
            className="h-9 w-9 rounded-full hover:bg-white/10 flex items-center justify-center"
            aria-label="닫기"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body (shared) */}
        {Body}
      </div>
      )}
    </>
  );
if (!open) return null;
return Panel;
}
