"use client";

export default function OverviewPage() {
  return (
    <div className="p-10 text-black max-w-4xl mx-auto">
      {/* HEADER */}
      <h1 className="text-4xl font-bold mb-4">YUA ONE Overview</h1>
      <p className="text-black/60 text-lg mb-10">
        YUA ONE은 차세대 Multi-Engine 기반 AI 플랫폼으로,
        Quantum · HPE · Omega · Gen59 엔진을 통합하여
        초고속 API, 스트리밍, 인스턴스 실행 환경을 제공합니다.
      </p>

      {/* SECTION 1 — WHAT IS YUA ONE */}
      <section className="mb-16">
        <h2 className="text-2xl font-semibold mb-3">What is YUA ONE?</h2>

        <div className="
          bg-white/70 backdrop-blur-xl border border-black/10 rounded-2xl p-6 shadow
        ">
          <ul className="text-black/80 space-y-2 leading-relaxed">
            <li>• Multi-Engine AI 시스템 (HPE / Omega / Quantum / Gen59 / Spine)</li>
            <li>• 초고속 Streaming Chat API</li>
            <li>• GPU/QPU Instance 기반 실행 환경</li>
            <li>• Developer Console, FileTree, Shell 제공</li>
            <li>• 실제 Billing · Credits 기반 서비스 구조</li>
          </ul>
        </div>
      </section>

      {/* SECTION 2 — CORE FEATURES */}
      <section className="mb-16">
        <h2 className="text-2xl font-semibold mb-4">Core Features</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FeatureCard
            title="Chat API"
            desc="SSE 기반 스트리밍 응답, 초고속 엔진 실행"
          />
          <FeatureCard
            title="Multi-Engine AI"
            desc="HPE 7, Quantum v2, Omega, Gen59 엔진 통합"
          />
          <FeatureCard
            title="Instances"
            desc="GPU / QPU 기반 연산 인스턴스 실행"
          />
          <FeatureCard
            title="Billing & Usage"
            desc="크레딧 기반 실제 결제 시스템"
          />
        </div>
      </section>

      {/* SECTION 3 — ARCHITECTURE */}
      <section className="mb-16">
        <h2 className="text-2xl font-semibold mb-4">System Architecture</h2>

        <div className="bg-white/70 border border-black/10 rounded-2xl p-6 shadow">
          <pre className="text-sm text-black/70 whitespace-pre-wrap leading-6">
{`Client
  ↓
YUA Console (Next.js)
  ↓
YUA Gateway (Express)
  ↓
Spine Router → HPE / Omega / Gen59 / Quantum Engines
  ↓
MySQL / Postgres / Vector DB
`}
          </pre>
        </div>
      </section>

      {/* CTA */}
      <div className="text-center mt-16">
        <a
          href="/quickstart"
          className="
            bg-black text-white px-6 py-3 rounded-lg
            hover:bg-black/80 transition shadow
          "
        >
          시작하기 (Quickstart)
        </a>
      </div>
    </div>
  );
}

function FeatureCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="
      bg-white/80 backdrop-blur-xl border border-black/10 
      rounded-2xl p-6 shadow
    ">
      <h3 className="text-xl font-semibold mb-1">{title}</h3>
      <p className="text-black/70 text-sm">{desc}</p>
    </div>
  );
}
