"use client";

const UPDATED_AT = "2026-03-06";
const EFFECTIVE_AT = "2026-03-06";

function Card({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a1a] p-4 sm:p-6 shadow-sm">
      <div className="space-y-1">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h2>
        {subtitle && <p className="text-sm text-gray-600 dark:text-gray-400">{subtitle}</p>}
      </div>
      <div className="mt-4 text-sm text-gray-700 dark:text-gray-300 leading-7 space-y-3">
        {children}
      </div>
    </section>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="list-disc pl-5 space-y-2 text-sm text-gray-700 dark:text-gray-300 marker:text-gray-400 dark:marker:text-gray-500">
      {items.map((t) => (
        <li key={t} className="leading-6">{t}</li>
      ))}
    </ul>
  );
}

export default function TermsPage() {
  return (
    <main className="space-y-8 sm:space-y-10">
      {/* Header */}
      <header className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 dark:text-white">
          이용약관
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          본 약관은 유아원(이하 &quot;회사&quot;)이 운영하는 YUA 서비스(이하 &quot;서비스&quot;)의 이용에 관한 기본적인 사항을 규정함을 목적으로 합니다.
        </p>
        <div className="flex flex-wrap gap-4 text-xs text-gray-400 dark:text-gray-500">
          <span>시행일: {EFFECTIVE_AT}</span>
          <span>최종 수정일: {UPDATED_AT}</span>
        </div>
      </header>

      {/* 1. 목적 */}
      <Card title="제1조 (목적)">
        <p>
          본 약관은 회사가 제공하는 YUA 서비스(웹사이트, 모바일 웹, API 포함)의 이용조건, 회사와 이용자 간의 권리 및 의무, 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.
        </p>
      </Card>

      {/* 2. 정의 */}
      <Card title="제2조 (정의)">
        <BulletList items={[
          "\"서비스\"란 회사가 제공하는 YUA AI 기반 대화, 문서 생성, 이미지 생성, 프로젝트 관리 등 일체의 서비스를 말합니다.",
          "\"이용자\"란 본 약관에 따라 서비스를 이용하는 회원 및 비회원을 말합니다.",
          "\"회원\"이란 서비스에 가입하여 이메일 또는 소셜 로그인을 통해 계정을 생성한 이용자를 말합니다.",
          "\"워크스페이스\"란 회원이 서비스 내에서 생성하는 독립된 작업 공간으로, 프로젝트 및 대화를 관리하는 단위를 말합니다.",
          "\"프로젝트 메모리\"란 Pro 이상 플랜에서 사용 가능한, 이용자가 명시적으로 저장을 요청한 데이터를 AI 컨텍스트에 활용하는 기능을 말합니다.",
        ]} />
      </Card>

      {/* 3. 약관의 효력 */}
      <Card title="제3조 (약관의 효력 및 변경)">
        <BulletList items={[
          "본 약관은 서비스 화면에 게시하거나 기타의 방법으로 이용자에게 공지함으로써 효력이 발생합니다.",
          "회사는 관련 법령을 위배하지 않는 범위에서 본 약관을 개정할 수 있습니다.",
          "약관이 변경되는 경우 최소 7일 전(이용자에게 불리한 변경의 경우 30일 전) 서비스 내 공지를 통해 고지합니다.",
          "변경된 약관에 동의하지 않는 이용자는 서비스 이용을 중단하고 탈퇴할 수 있습니다.",
        ]} />
      </Card>

      {/* 4. 서비스의 제공 */}
      <Card title="제4조 (서비스의 제공)">
        <p>회사는 다음과 같은 서비스를 제공합니다.</p>
        <BulletList items={[
          "AI 기반 대화 서비스 (텍스트 생성, 분석, 요약, 번역 등)",
          "AI 기반 이미지 생성 서비스",
          "문서 작성 및 편집 서비스 (스튜디오)",
          "프로젝트 관리 및 워크스페이스 기능",
          "프로젝트 메모리 기능 (Pro 이상)",
          "기타 회사가 추가 개발하거나 제휴를 통해 제공하는 일체의 서비스",
        ]} />
        <p className="mt-3">
          서비스는 연중무휴 24시간 제공을 원칙으로 하나, 시스템 점검, 기술적 장애, 천재지변 등의 사유로 일시적으로 중단될 수 있습니다.
        </p>
      </Card>

      {/* 5. 회원가입 */}
      <Card title="제5조 (회원가입 및 계정)">
        <BulletList items={[
          "이용자는 회사가 정한 양식에 따라 이메일 또는 소셜 로그인(Google 등)을 통해 회원가입을 할 수 있습니다.",
          "회원은 가입 시 제공한 정보에 대해 정확성을 유지할 의무가 있으며, 변경사항이 있는 경우 즉시 수정해야 합니다.",
          "계정의 관리 책임은 회원 본인에게 있으며, 타인에게 계정을 양도하거나 대여할 수 없습니다.",
          "회원이 계정 보안에 문제가 있음을 인지한 경우, 즉시 회사에 통보해야 합니다.",
        ]} />
      </Card>

      {/* 6. 플랜 및 요금 */}
      <Card
        title="제6조 (플랜 및 요금)"
        subtitle="서비스는 무료 및 유료 플랜으로 구분되어 제공됩니다."
      >
        <BulletList items={[
          "Free 플랜: 기본 기능 제공 (일일/월간 사용량 제한 있음)",
          "Pro 플랜: 확장된 사용량, 프로젝트 메모리, Deep 모드 등 제공",
          "Business 플랜: 팀 협업, 워크스페이스 관리, 우선 지원 제공",
          "Enterprise 플랜: 고급 보안, 전용 지원, SLA 제공",
          "유료 플랜의 결제는 월 단위 정기결제로 이루어지며, 결제일 기준으로 1개월 단위로 자동 갱신됩니다.",
          "플랜 변경(업그레이드/다운그레이드)은 서비스 내 설정에서 가능하며, 변경된 플랜은 다음 결제 주기부터 적용됩니다.",
          "환불 정책은 관련 법령(전자상거래법 등)에 따르며, 디지털 콘텐츠의 특성상 서비스 이용 후에는 환불이 제한될 수 있습니다.",
        ]} />
      </Card>

      {/* 7. 이용자의 의무 */}
      <Card
        title="제7조 (이용자의 의무)"
        subtitle="이용자는 다음 행위를 하여서는 안 됩니다."
      >
        <BulletList items={[
          "서비스의 역공학, 디컴파일, 소스코드 추출 시도 또는 모델 가중치 추출 시도",
          "자동화된 수단(봇, 크롤러, 스크래퍼 등)을 이용한 대량 데이터 수집 또는 서비스 남용",
          "서비스의 안전장치, 보호조치, 사용량 제한을 우회하거나 무력화하는 행위",
          "타인의 계정 도용, 개인정보 침해, 명예훼손 등 타인의 권리를 침해하는 행위",
          "불법적인 목적으로 서비스를 이용하거나, 법령에 위반되는 콘텐츠를 생성하는 행위",
          "서비스의 안정적 운영을 방해하는 비정상적인 트래픽이나 공격 행위",
          "AI를 이용하여 허위 정보, 딥페이크, 사기 등 사회적으로 유해한 콘텐츠를 생성하는 행위",
          "미성년자에게 유해한 콘텐츠를 생성하거나 유포하는 행위",
        ]} />
      </Card>

      {/* 8. AI 콘텐츠 면책 */}
      <Card
        title="제8조 (AI 생성 콘텐츠에 대한 안내)"
        subtitle="AI 기능은 보조 도구이며, 최종 판단과 책임은 이용자에게 있습니다."
      >
        <BulletList items={[
          "서비스의 AI 기능은 자동 생성된 결과를 제공하며, 해당 결과는 부정확하거나 불완전할 수 있습니다.",
          "법률, 의료, 금융, 세무 등 전문 영역에서의 AI 출력은 참고용이며, 반드시 해당 분야 전문가의 검토를 받아야 합니다.",
          "AI 출력은 사실 또는 공식적인 조언으로 간주되지 않으며, 이용자는 AI 출력의 적합성, 정확성, 최신성, 합법성을 스스로 확인해야 합니다.",
          "이용자가 업로드 또는 입력한 콘텐츠의 권리(저작권, 초상권, 비밀유지 등)는 이용자에게 있으며, 타인의 권리를 침해하지 않도록 해야 합니다.",
        ]} />
      </Card>

      {/* 9. 프로젝트 메모리 */}
      <Card
        title="제9조 (프로젝트 메모리 기능)"
        subtitle="Pro 이상 플랜에서 제공되는 메모리 기능에 관한 조항입니다."
      >
        <BulletList items={[
          "프로젝트 메모리는 이용자가 명시적으로 허용한 범위에서만 데이터를 저장 및 검색합니다.",
          "저장된 데이터는 검색 및 응답 품질 향상을 위해 벡터 임베딩으로 변환되어 처리될 수 있습니다.",
          "이용자는 프로젝트 단위로 메모리를 삭제하거나 기능을 비활성화할 수 있습니다.",
          "프로젝트 삭제 시 관련 메모리 데이터는 함께 삭제됩니다.",
        ]} />
      </Card>

      {/* 10. 회사의 의무 */}
      <Card title="제10조 (회사의 의무)">
        <BulletList items={[
          "회사는 관련 법령과 본 약관이 금지하는 행위를 하지 않으며, 지속적이고 안정적으로 서비스를 제공하기 위하여 최선을 다합니다.",
          "회사는 이용자의 개인정보를 안전하게 관리하기 위해 보안 시스템을 구축 및 운영합니다.",
          "회사는 이용자로부터 제기되는 의견이나 불만이 정당하다고 인정할 경우 이를 처리하여야 합니다.",
        ]} />
      </Card>

      {/* 11. 지식재산권 */}
      <Card title="제11조 (지식재산권)">
        <BulletList items={[
          "서비스에 포함된 소프트웨어, UI/UX 디자인, 로고, 상표, 기술 등 일체의 지식재산권은 회사에 귀속됩니다.",
          "이용자가 서비스를 이용하여 생성한 콘텐츠의 권리는 이용자에게 귀속됩니다. 다만, 이용자는 회사가 서비스 품질 개선을 위해 익명화/통계화된 형태로 활용하는 것에 동의합니다.",
          "이용자는 서비스의 일부 또는 전체를 복제, 배포, 수정, 역공학, 재판매하는 등 회사의 지식재산권을 침해하는 행위를 해서는 안 됩니다.",
        ]} />
      </Card>

      {/* 12. 서비스 이용 제한 */}
      <Card title="제12조 (서비스 이용 제한 및 계약 해지)">
        <BulletList items={[
          "회사는 이용자가 본 약관의 의무를 위반하거나 서비스의 정상적인 운영을 방해한 경우, 경고, 일시정지, 계정 해지 등의 조치를 취할 수 있습니다.",
          "회사는 이용 제한 조치 전 이용자에게 사유를 통지합니다. 다만, 긴급한 경우(보안 위협, 불법 행위 등)에는 사후 통지할 수 있습니다.",
          "이용자는 언제든지 서비스 내 설정 또는 이메일(jungwon@yuaone.com)을 통해 회원 탈퇴를 요청할 수 있습니다.",
          "회원 탈퇴 시 모든 개인정보 및 이용 기록은 관련 법령에 따른 보존 의무 기간을 제외하고 지체 없이 파기됩니다.",
        ]} />
      </Card>

      {/* 13. 책임 제한 */}
      <Card
        title="제13조 (책임 제한)"
        subtitle="법률이 허용하는 범위 내에서 책임이 제한됩니다."
      >
        <BulletList items={[
          "서비스는 '있는 그대로(AS-IS)' 제공되며, 회사는 서비스의 완전성, 정확성, 신뢰성에 대해 명시적 또는 묵시적 보증을 하지 않습니다.",
          "회사는 천재지변, 전쟁, 테러, 해킹, DDoS 공격 등 불가항력으로 인한 서비스 중단에 대해 책임을 지지 않습니다.",
          "회사는 이용자가 서비스를 이용하여 기대하는 수익을 얻지 못하거나 상실한 것에 대해 책임을 지지 않습니다.",
          "회사는 이용자 간 또는 이용자와 제3자 간에 서비스를 매개로 발생한 분쟁에 대해 개입할 의무가 없으며, 이에 대한 손해배상 책임을 지지 않습니다.",
          "관련 법령이 허용하는 범위 내에서, 회사의 총 손해배상 책임은 해당 이용자가 직전 12개월간 회사에 지급한 금액을 한도로 합니다.",
        ]} />
      </Card>

      {/* 14. 분쟁 해결 */}
      <Card title="제14조 (분쟁 해결)">
        <BulletList items={[
          "본 약관과 서비스 이용에 관한 분쟁은 대한민국 법률을 준거법으로 합니다.",
          "회사와 이용자 간에 발생한 분쟁에 관한 소송은 서울중앙지방법원을 관할법원으로 합니다.",
          "분쟁 발생 시 양 당사자는 소송 제기 전 상호 협의를 통해 원만한 해결을 위해 노력합니다.",
        ]} />
      </Card>

      {/* 15. 외부 제공자 정책 */}
      <Card title="제15조 (외부 AI 서비스 제공자 정책)">
        <p>
          서비스의 AI 기능은 외부 AI 서비스 제공자의 기술을 활용하며, 해당 제공자의 이용 정책에 따라 일부 입력/출력에 대한 제한이 적용될 수 있습니다.
          외부 정책은 변경될 수 있으므로 최신 정보는 각 제공자의 사이트에서 확인하시기 바랍니다.
        </p>
        <div className="mt-3 flex flex-col gap-2">
          <a href="https://www.anthropic.com/policies" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
            Anthropic Usage Policy
          </a>
          <a href="https://openai.com/policies/usage-policies/" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
            OpenAI Usage Policies
          </a>
          <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
            Google Terms of Service
          </a>
        </div>
      </Card>

      {/* 문의 */}
      <Card title="문의">
        <p>본 약관에 대한 문의는 아래로 연락하실 수 있습니다.</p>
        <div className="mt-3 space-y-1">
          <p><span className="text-gray-500 dark:text-gray-400">회사명:</span> 유아원 (YuaOne)</p>
          <p><span className="text-gray-500 dark:text-gray-400">대표자:</span> 엄정원</p>
          <p><span className="text-gray-500 dark:text-gray-400">이메일:</span> <b>jungwon@yuaone.com</b></p>
          <p><span className="text-gray-500 dark:text-gray-400">웹사이트:</span> www.yuaone.com</p>
        </div>
      </Card>
    </main>
  );
}
