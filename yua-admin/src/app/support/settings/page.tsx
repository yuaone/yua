"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";

/* ---------- Types ---------- */

interface EscalationRule {
  id: number;
  condition_type: string;
  condition_value: string;
  action: string;
  is_active: boolean;
  created_at: string;
}

interface AutoSendConfig {
  enabled: boolean;
  confidenceThreshold: number; // 0-1
}

interface FAQStats {
  totalCount: number;
  mostUsed: Array<{ question: string; hitCount: number }>;
}

/* ---------- Config ---------- */

const CONDITION_TYPES = [
  { value: "category", label: "카테고리" },
  { value: "priority", label: "우선순위" },
  { value: "keyword", label: "키워드 포함" },
  { value: "ai_confidence_below", label: "AI 신뢰도 미만" },
  { value: "response_time_over", label: "응답 시간 초과(초)" },
] as const;

const ACTIONS = [
  { value: "escalate_admin", label: "관리자에게 에스컬레이션" },
  { value: "escalate_senior", label: "시니어 담당자에게 에스컬레이션" },
  { value: "auto_reply", label: "자동 답변 전송" },
  { value: "notify_slack", label: "Slack 알림" },
] as const;

/* ---------- Component ---------- */

export default function SupportSettingsPage() {
  const [rules, setRules] = useState<EscalationRule[]>([]);
  const [autoSend, setAutoSend] = useState<AutoSendConfig>({ enabled: false, confidenceThreshold: 0.85 });
  const [faqStats, setFaqStats] = useState<FAQStats>({ totalCount: 0, mostUsed: [] });
  const [loading, setLoading] = useState(true);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState<EscalationRule | null>(null);
  const [form, setForm] = useState({ condition_type: "category", condition_value: "", action: "escalate_admin" });
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);

    // TODO: Replace with real API calls
    // const rulesRes = await adminFetch<{rules: EscalationRule[]}>("/admin/support/escalation-rules");
    // const configRes = await adminFetch<AutoSendConfig>("/admin/support/auto-send-config");
    // const faqRes = await adminFetch<FAQStats>("/admin/support/faq-stats");

    const mockRules: EscalationRule[] = [
      { id: 1, condition_type: "priority", condition_value: "urgent", action: "escalate_senior", is_active: true, created_at: "2026-03-01T00:00:00Z" },
      { id: 2, condition_type: "category", condition_value: "billing", action: "escalate_admin", is_active: true, created_at: "2026-03-02T00:00:00Z" },
      { id: 3, condition_type: "ai_confidence_below", condition_value: "0.6", action: "escalate_admin", is_active: true, created_at: "2026-03-03T00:00:00Z" },
      { id: 4, condition_type: "keyword", condition_value: "환불", action: "notify_slack", is_active: false, created_at: "2026-03-04T00:00:00Z" },
      { id: 5, condition_type: "response_time_over", condition_value: "300", action: "escalate_senior", is_active: true, created_at: "2026-03-05T00:00:00Z" },
    ];

    const mockFaqStats: FAQStats = {
      totalCount: 47,
      mostUsed: [
        { question: "요금제는 어떻게 변경하나요?", hitCount: 234 },
        { question: "비밀번호를 잊어버렸어요", hitCount: 189 },
        { question: "API 키는 어디서 발급하나요?", hitCount: 156 },
      ],
    };

    setTimeout(() => {
      setRules(mockRules);
      setAutoSend({ enabled: true, confidenceThreshold: 0.85 });
      setFaqStats(mockFaqStats);
      setLoading(false);
    }, 300);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveRule = async () => {
    if (!form.condition_value.trim()) return;
    setSaving(true);

    // TODO: Replace with real API
    // if (editingRule) {
    //   await adminFetch(`/admin/support/escalation-rules/${editingRule.id}`, { method: "PATCH", body: JSON.stringify(form) });
    // } else {
    //   await adminFetch("/admin/support/escalation-rules", { method: "POST", body: JSON.stringify(form) });
    // }

    if (editingRule) {
      setRules(rules.map((r) => r.id === editingRule.id ? { ...r, ...form } : r));
    } else {
      const newRule: EscalationRule = {
        id: Date.now(),
        ...form,
        is_active: true,
        created_at: new Date().toISOString(),
      };
      setRules([...rules, newRule]);
    }

    setShowForm(false);
    setEditingRule(null);
    setForm({ condition_type: "category", condition_value: "", action: "escalate_admin" });
    setSaving(false);
  };

  const handleDeleteRule = async (id: number) => {
    if (!confirm("이 규칙을 삭제하시겠습니까?")) return;

    // TODO: await adminFetch(`/admin/support/escalation-rules/${id}`, { method: "DELETE" });
    setRules(rules.filter((r) => r.id !== id));
  };

  const handleToggleRule = async (id: number) => {
    // TODO: await adminFetch(`/admin/support/escalation-rules/${id}/toggle`, { method: "PATCH" });
    setRules(rules.map((r) => r.id === id ? { ...r, is_active: !r.is_active } : r));
  };

  const startEdit = (rule: EscalationRule) => {
    setEditingRule(rule);
    setForm({ condition_type: rule.condition_type, condition_value: rule.condition_value, action: rule.action });
    setShowForm(true);
  };

  const startCreate = () => {
    setEditingRule(null);
    setForm({ condition_type: "category", condition_value: "", action: "escalate_admin" });
    setShowForm(true);
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingRule(null);
    setForm({ condition_type: "category", condition_value: "", action: "escalate_admin" });
  };

  const handleAutoSendToggle = () => {
    // TODO: await adminFetch("/admin/support/auto-send-config", { method: "PATCH", body: JSON.stringify({ enabled: !autoSend.enabled }) });
    setAutoSend({ ...autoSend, enabled: !autoSend.enabled });
  };

  const handleThresholdChange = (val: number) => {
    // TODO: await adminFetch("/admin/support/auto-send-config", { method: "PATCH", body: JSON.stringify({ confidenceThreshold: val }) });
    setAutoSend({ ...autoSend, confidenceThreshold: val });
  };

  const getConditionLabel = (type: string) =>
    CONDITION_TYPES.find((c) => c.value === type)?.label ?? type;

  const getActionLabel = (action: string) =>
    ACTIONS.find((a) => a.value === action)?.label ?? action;

  return (
    <>
      <PageHeader
        title="Support AI 설정"
        subtitle="에스컬레이션 규칙 및 자동 전송 설정"
        actions={
          <Link
            href="/support"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors"
            style={{ borderColor: "var(--line)", color: "var(--text-secondary)" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15,18 9,12 15,6" />
            </svg>
            대시보드
          </Link>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center" style={{ minHeight: "50vh" }}>
          <div className="yua-admin-spinner" />
        </div>
      ) : (
        <div className="fade-in space-y-6">
          {/* Auto-Send Config */}
          <div className="admin-card" style={{ padding: "20px" }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3
                  className="text-sm font-semibold"
                  style={{ color: "var(--text-primary)" }}
                >
                  자동 전송 모드
                </h3>
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                  AI 답변 신뢰도가 기준 이상이면 자동으로 사용자에게 전송합니다
                </p>
              </div>
              <button
                onClick={handleAutoSendToggle}
                className="relative w-11 h-6 rounded-full transition-colors duration-200"
                style={{
                  background: autoSend.enabled ? "var(--btn-primary)" : "var(--line)",
                }}
              >
                <span
                  className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform duration-200 shadow-sm"
                  style={{
                    transform: autoSend.enabled ? "translateX(22px)" : "translateX(2px)",
                  }}
                />
              </button>
            </div>

            {autoSend.enabled && (
              <div
                className="pt-4 border-t"
                style={{ borderColor: "var(--line)" }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                    신뢰도 기준값
                  </span>
                  <span
                    className="text-sm font-semibold tabular-nums"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {Math.round(autoSend.confidenceThreshold * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={99}
                  value={Math.round(autoSend.confidenceThreshold * 100)}
                  onChange={(e) => handleThresholdChange(Number(e.target.value) / 100)}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, var(--btn-primary) ${Math.round(autoSend.confidenceThreshold * 100) - 50}%, var(--line) 0%)`,
                    accentColor: "var(--btn-primary)",
                  }}
                />
                <div className="flex justify-between mt-1">
                  <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>50%</span>
                  <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>99%</span>
                </div>
              </div>
            )}
          </div>

          {/* Escalation Rules */}
          <div className="admin-card" style={{ padding: "20px" }}>
            <div className="flex items-center justify-between mb-4">
              <h3
                className="text-sm font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                에스컬레이션 규칙
              </h3>
              <button
                onClick={startCreate}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors"
                style={{ background: "var(--btn-primary)" }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                규칙 추가
              </button>
            </div>

            {/* Rules List */}
            <div className="space-y-2">
              {rules.length === 0 ? (
                <div
                  className="text-sm text-center py-8"
                  style={{ color: "var(--text-muted)" }}
                >
                  등록된 규칙이 없습니다
                </div>
              ) : (
                rules.map((rule) => (
                  <div
                    key={rule.id}
                    className="group flex items-center gap-3 px-4 py-3 rounded-lg border transition-all duration-150"
                    style={{
                      borderColor: "var(--line)",
                      background: rule.is_active ? "var(--surface-main)" : "var(--surface-panel)",
                      opacity: rule.is_active ? 1 : 0.6,
                    }}
                  >
                    {/* Toggle */}
                    <button
                      onClick={() => handleToggleRule(rule.id)}
                      className="relative w-8 h-[18px] rounded-full transition-colors duration-200 shrink-0"
                      style={{
                        background: rule.is_active ? "#10b981" : "var(--line)",
                      }}
                    >
                      <span
                        className="absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white transition-transform duration-200 shadow-sm"
                        style={{
                          transform: rule.is_active ? "translateX(16px)" : "translateX(2px)",
                        }}
                      />
                    </button>

                    {/* Condition */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                          style={{ color: "#3b82f6", background: "rgba(59,130,246,0.12)" }}
                        >
                          {getConditionLabel(rule.condition_type)}
                        </span>
                        <span
                          className="text-xs font-medium"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {rule.condition_value}
                        </span>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="9,18 15,12 9,6" />
                        </svg>
                        <span
                          className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                          style={{ color: "#f59e0b", background: "rgba(245,158,11,0.12)" }}
                        >
                          {getActionLabel(rule.action)}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        onClick={() => startEdit(rule)}
                        className="p-1.5 rounded-lg transition-colors hover:bg-[var(--line)]"
                        style={{ color: "var(--text-muted)" }}
                        title="수정"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteRule(rule.id)}
                        className="p-1.5 rounded-lg transition-colors hover:bg-red-500/10"
                        style={{ color: "var(--text-muted)" }}
                        title="삭제"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3,6 5,6 21,6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Add/Edit Form */}
            {showForm && (
              <div
                className="mt-4 p-4 rounded-xl border yua-admin-slide-in"
                style={{
                  borderColor: "var(--line)",
                  background: "var(--surface-panel)",
                }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h4
                    className="text-xs font-semibold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {editingRule ? "규칙 수정" : "규칙 추가"}
                  </h4>
                  <button
                    onClick={cancelForm}
                    className="p-1 rounded-lg transition-colors hover:bg-[var(--line)]"
                    style={{ color: "var(--text-muted)" }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                    </svg>
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {/* Condition Type */}
                  <div>
                    <label className="text-[11px] font-medium block mb-1.5" style={{ color: "var(--text-muted)" }}>
                      조건 유형
                    </label>
                    <select
                      value={form.condition_type}
                      onChange={(e) => setForm({ ...form, condition_type: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border text-xs focus:outline-none"
                      style={{
                        borderColor: "var(--line)",
                        background: "var(--surface-main)",
                        color: "var(--text-primary)",
                      }}
                    >
                      {CONDITION_TYPES.map((ct) => (
                        <option key={ct.value} value={ct.value}>{ct.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Condition Value */}
                  <div>
                    <label className="text-[11px] font-medium block mb-1.5" style={{ color: "var(--text-muted)" }}>
                      조건 값
                    </label>
                    <input
                      value={form.condition_value}
                      onChange={(e) => setForm({ ...form, condition_value: e.target.value })}
                      placeholder="예: urgent, billing, 0.6"
                      className="w-full px-3 py-2 rounded-lg border text-xs focus:outline-none"
                      style={{
                        borderColor: "var(--line)",
                        background: "var(--surface-main)",
                        color: "var(--text-primary)",
                      }}
                    />
                  </div>

                  {/* Action */}
                  <div>
                    <label className="text-[11px] font-medium block mb-1.5" style={{ color: "var(--text-muted)" }}>
                      실행 액션
                    </label>
                    <select
                      value={form.action}
                      onChange={(e) => setForm({ ...form, action: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border text-xs focus:outline-none"
                      style={{
                        borderColor: "var(--line)",
                        background: "var(--surface-main)",
                        color: "var(--text-primary)",
                      }}
                    >
                      {ACTIONS.map((a) => (
                        <option key={a.value} value={a.value}>{a.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <button
                    onClick={cancelForm}
                    className="flex-1 px-4 py-2 rounded-lg text-xs font-medium border transition-colors"
                    style={{ borderColor: "var(--line)", color: "var(--text-secondary)" }}
                  >
                    취소
                  </button>
                  <button
                    onClick={handleSaveRule}
                    disabled={saving || !form.condition_value.trim()}
                    className="flex-1 px-4 py-2 rounded-lg text-xs font-semibold text-white transition-all disabled:opacity-40"
                    style={{ background: "var(--btn-primary)" }}
                  >
                    {saving ? "저장 중..." : editingRule ? "수정" : "추가"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* FAQ Quick Stats */}
          <div className="admin-card" style={{ padding: "20px" }}>
            <div className="flex items-center justify-between mb-4">
              <h3
                className="text-sm font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                FAQ 통계
              </h3>
              <Link
                href="/knowledge"
                className="text-[11px] font-medium transition-colors"
                style={{ color: "var(--btn-primary)" }}
              >
                지식 베이스 관리
              </Link>
            </div>

            <div className="flex items-center gap-6 mb-4">
              <div>
                <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>
                  총 FAQ
                </div>
                <div
                  className="text-2xl font-bold"
                  style={{ color: "var(--text-primary)", letterSpacing: "-0.03em" }}
                >
                  {faqStats.totalCount}
                </div>
              </div>
            </div>

            {faqStats.mostUsed.length > 0 && (
              <div>
                <div className="text-[11px] font-medium mb-2" style={{ color: "var(--text-muted)" }}>
                  가장 많이 사용된 FAQ
                </div>
                <div className="space-y-2">
                  {faqStats.mostUsed.map((faq, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between px-3 py-2 rounded-lg"
                      style={{ background: "var(--surface-main)" }}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                          style={{
                            background: i === 0 ? "rgba(245,158,11,0.15)" : "var(--line)",
                            color: i === 0 ? "#f59e0b" : "var(--text-muted)",
                          }}
                        >
                          {i + 1}
                        </span>
                        <span
                          className="text-xs truncate"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {faq.question}
                        </span>
                      </div>
                      <span
                        className="text-[11px] font-medium shrink-0 ml-2"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {faq.hitCount.toLocaleString()}회
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
