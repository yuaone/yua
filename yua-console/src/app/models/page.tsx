"use client";

export default function ModelsPage() {
  const models = [
    {
      id: "yua-basic",
      name: "YUA Basic",
      desc: "가장 빠른 경량 모델. 일반 질의응답, 간단한 로직 처리에 적합",
      price: "₩0.10 / 1K tokens",
      tag: "fast",
    },
    {
      id: "yua-pro",
      name: "YUA Pro",
      desc: "문서 생성, 코드 분석, 복잡한 답변에 최적화된 중형 모델",
      price: "₩0.25 / 1K tokens",
      tag: "recommended",
    },
    {
      id: "yua-omega",
      name: "Omega Engine",
      desc: "고추론 모델. 멀티스텝 reasoning, 고난도 문제 해결용",
      price: "₩0.45 / 1K tokens",
      tag: "advanced",
    },
    {
      id: "yua-hpe",
      name: "HPE Kernel",
      desc: "HPE 7 기반 초고성능 엔진. 대규모 데이터 분석 & 엔터프라이즈 연산",
      price: "₩0.55 / 1K tokens",
      tag: "enterprise",
    },
    {
      id: "yua-quantum",
      name: "Quantum Engine",
      desc: "Quantum Cognitive Field 기반 차세대 모델. 복합 논리/패턴 해석",
      price: "₩0.90 / 1K tokens",
      tag: "experimental",
    },
  ];

  return (
    <div className="p-10 text-black max-w-4xl mx-auto">
      <h1 className="text-4xl font-bold mb-4">Models</h1>
      <p className="text-black/60 mb-10">
        YUA ONE은 다중 엔진 기반의 AI 모델 라인업을 제공합니다.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {models.map((m) => (
          <div
            key={m.id}
            className="
              bg-white/80 backdrop-blur-xl border border-black/10
              rounded-2xl p-6 shadow flex flex-col
            "
          >
            <h2 className="text-xl font-semibold">{m.name}</h2>
            <p className="text-black/70 text-sm mt-1">{m.desc}</p>

            <p className="text-black mt-4 font-mono">Model ID: {m.id}</p>

            <p className="text-black/60 text-sm mt-1">{m.price}</p>

            <div className="mt-auto pt-4">
              <span
                className="
                text-xs px-3 py-1 rounded-full border border-black/20
                bg-black/5 text-black/70
                "
              >
                {m.tag}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
