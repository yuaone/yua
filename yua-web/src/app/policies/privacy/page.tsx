"use client";

const UPDATED_AT = "2026-03-06";
const EFFECTIVE_AT = "2026-03-06";

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a1a] p-4 sm:p-6 shadow-sm">
      <h2 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h2>
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

function Table({ rows }: { rows: [string, string][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700">
            <th className="text-left py-2 pr-4 font-medium text-gray-900 dark:text-white">항목</th>
            <th className="text-left py-2 font-medium text-gray-900 dark:text-white">내용</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k} className="border-b border-gray-100 dark:border-gray-800">
              <td className="py-2 pr-4 text-gray-600 dark:text-gray-400 whitespace-nowrap align-top">{k}</td>
              <td className="py-2 text-gray-700 dark:text-gray-300">{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function PrivacyPage() {
  return (
    <main className="space-y-8 sm:space-y-10">
      {/* Header */}
      <header className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 dark:text-white">
          개인정보처리방침
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          유아원(이하 &quot;회사&quot;)은 「개인정보 보호법」 등 관련 법령에 따라 이용자의 개인정보를 보호하고,
          이와 관련한 고충을 신속하게 처리하기 위하여 다음과 같이 개인정보처리방침을 수립 및 공개합니다.
        </p>
        <div className="flex flex-wrap gap-4 text-xs text-gray-400 dark:text-gray-500">
          <span>시행일: {EFFECTIVE_AT}</span>
          <span>최종 수정일: {UPDATED_AT}</span>
        </div>
      </header>

      {/* 1. 개인정보의 처리 목적 */}
      <Card title="제1조 (개인정보의 처리 목적)">
        <p>회사는 다음의 목적을 위하여 개인정보를 처리합니다. 처리하고 있는 개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며, 이용 목적이 변경되는 경우에는 별도의 동의를 받는 등 필요한 조치를 이행할 예정입니다.</p>
        <BulletList items={[
          "회원가입 및 관리: 회원 가입의사 확인, 회원제 서비스 제공에 따른 본인 식별 및 인증, 회원자격 유지 및 관리, 서비스 부정이용 방지",
          "서비스 제공: YUA AI 기반 대화, 문서 생성, 이미지 생성 등 핵심 서비스 제공 및 콘텐츠 제공",
          "요금 결제 및 정산: 유료 서비스(Pro, Business, Enterprise 플랜) 이용에 따른 요금 결제 및 정산",
          "서비스 개선 및 통계: 서비스 이용 통계 분석, 서비스 품질 개선, 신규 서비스 개발",
          "고충 처리: 이용자의 불만 접수 및 처리, 분쟁 조정을 위한 기록 보존",
        ]} />
      </Card>

      {/* 2. 처리하는 개인정보 항목 */}
      <Card title="제2조 (처리하는 개인정보 항목)">
        <p>회사는 다음의 개인정보 항목을 처리하고 있습니다.</p>
        <div className="mt-3">
          <p className="font-medium text-gray-900 dark:text-white mb-2">필수 항목</p>
          <Table rows={[
            ["회원가입 시", "이메일 주소, 이름(닉네임), 소셜 로그인 식별자(Google UID 등)"],
            ["서비스 이용 시", "대화 내용(프롬프트 및 응답), 업로드 파일, 프로젝트 데이터"],
            ["자동 수집", "IP 주소, 브라우저 유형, 기기 정보, 접속 일시, 서비스 이용 기록, 쿠키"],
          ]} />
        </div>
        <div className="mt-4">
          <p className="font-medium text-gray-900 dark:text-white mb-2">선택 항목</p>
          <Table rows={[
            ["결제 시", "결제 수단 정보 (PG사 위탁 처리, 회사는 카드번호를 직접 저장하지 않음)"],
            ["프로젝트 메모리", "사용자가 명시적으로 저장을 요청한 문서, 메모, 대화 요약 데이터"],
          ]} />
        </div>
      </Card>

      {/* 3. 개인정보의 처리 및 보유 기간 */}
      <Card title="제3조 (개인정보의 처리 및 보유 기간)">
        <p>회사는 법령에 따른 개인정보 보유 및 이용기간 또는 이용자로부터 개인정보를 수집 시에 동의받은 개인정보 보유 및 이용기간 내에서 개인정보를 처리 및 보유합니다.</p>
        <Table rows={[
          ["회원 정보", "회원 탈퇴 시까지 (탈퇴 후 지체 없이 파기)"],
          ["대화 기록", "사용자 삭제 요청 시 또는 계정 탈퇴 시 파기"],
          ["프로젝트 메모리", "프로젝트 삭제 시 또는 계정 탈퇴 시 파기"],
          ["결제 기록", "전자상거래법에 따라 5년간 보존"],
          ["접속 로그", "통신비밀보호법에 따라 3개월간 보존"],
          ["분쟁 관련 기록", "전자상거래법에 따라 3년간 보존"],
        ]} />
      </Card>

      {/* 4. 개인정보의 제3자 제공 */}
      <Card title="제4조 (개인정보의 제3자 제공)">
        <p>회사는 이용자의 개인정보를 제1조에서 명시한 범위 내에서만 처리하며, 이용자의 동의 없이는 본래의 범위를 초과하여 처리하거나 제3자에게 제공하지 않습니다. 다만, 다음의 경우에는 예외로 합니다.</p>
        <BulletList items={[
          "이용자가 사전에 동의한 경우",
          "법률에 특별한 규정이 있거나, 법령상 의무를 준수하기 위하여 불가피한 경우",
          "공공기관이 법령 등에서 정하는 소관업무를 수행하기 위해 불가피하게 요청하는 경우",
        ]} />
      </Card>

      {/* 5. 개인정보 처리의 위탁 */}
      <Card title="제5조 (개인정보 처리의 위탁)">
        <p>회사는 원활한 서비스 제공을 위해 다음과 같이 개인정보 처리업무를 위탁하고 있습니다.</p>
        <Table rows={[
          ["AI 응답 생성", "Anthropic (Claude API), OpenAI (GPT API), Google (Gemini API) — 대화 내용이 응답 생성 목적으로 전송됩니다"],
          ["클라우드 인프라", "Google Cloud Platform (GCP) — 데이터 저장 및 서버 운영"],
          ["인증 서비스", "Google Firebase — 회원 인증 및 세션 관리"],
          ["결제 처리", "PG사 (추후 확정) — 결제 정보 처리"],
        ]} />
        <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          위탁받는 자는 위탁 목적 범위 내에서만 개인정보를 처리하며, 회사는 위탁계약 체결 시 관련 법령에 따라 관리 및 감독을 실시합니다.
        </p>
      </Card>

      {/* 6. 이용자 및 법정대리인의 권리 */}
      <Card title="제6조 (이용자 및 법정대리인의 권리와 행사 방법)">
        <p>이용자는 회사에 대해 언제든지 다음의 개인정보 보호 관련 권리를 행사할 수 있습니다.</p>
        <BulletList items={[
          "개인정보 열람 요구",
          "오류 등이 있을 경우 정정 요구",
          "삭제 요구",
          "처리 정지 요구",
        ]} />
        <p className="mt-3">
          위 권리 행사는 이메일(<b>jungwon@yuaone.com</b>)을 통하여 하실 수 있으며, 회사는 이에 대해 지체 없이 조치하겠습니다.
        </p>
      </Card>

      {/* 7. 개인정보의 파기 */}
      <Card title="제7조 (개인정보의 파기 절차 및 방법)">
        <BulletList items={[
          "파기 절차: 이용자가 입력한 정보는 목적 달성 후 별도의 DB에 옮겨져 내부 방침 및 기타 관련 법령에 따라 일정기간 저장된 후 파기됩니다.",
          "파기 방법: 전자적 파일 형태의 정보는 기록을 재생할 수 없는 기술적 방법을 사용합니다.",
          "프로젝트 삭제 시: 프로젝트에 포함된 메모리 데이터, 벡터 임베딩 등은 함께 삭제됩니다.",
          "계정 탈퇴 시: 대화 기록, 프로젝트 데이터, 프로필 정보 등 모든 개인정보가 파기됩니다.",
        ]} />
      </Card>

      {/* 8. 개인정보의 안전성 확보 조치 */}
      <Card title="제8조 (개인정보의 안전성 확보 조치)">
        <p>회사는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고 있습니다.</p>
        <BulletList items={[
          "관리적 조치: 내부 관리계획 수립 및 시행, 개인정보 접근 권한 최소화",
          "기술적 조치: 개인정보 암호화(전송 구간 TLS/SSL, 저장 시 AES-256), 접근통제시스템 운영, 보안프로그램 설치",
          "물리적 조치: 클라우드 인프라(GCP) 기반 데이터센터 보안 정책 준수",
          "API 통신 보안: 외부 AI 제공자와의 통신 시 TLS 암호화 적용",
        ]} />
      </Card>

      {/* 9. 쿠키 */}
      <Card title="제9조 (쿠키의 설치, 운영 및 거부)">
        <BulletList items={[
          "회사는 이용자에게 맞춤 서비스를 제공하기 위해 쿠키를 사용합니다.",
          "쿠키는 이용자의 인증 상태 유지, 세션 관리, 테마 설정 등에 활용됩니다.",
          "이용자는 브라우저 설정을 통해 쿠키 저장을 거부할 수 있으며, 이 경우 일부 서비스 이용이 제한될 수 있습니다.",
        ]} />
      </Card>

      {/* 10. 국외 이전 */}
      <Card title="제10조 (개인정보의 국외 이전)">
        <p>회사는 AI 서비스 제공을 위해 이용자의 대화 데이터가 다음의 해외 사업자에게 전송될 수 있습니다.</p>
        <Table rows={[
          ["Anthropic, Inc.", "미국 — Claude API를 통한 AI 응답 생성"],
          ["OpenAI, Inc.", "미국 — GPT API를 통한 AI 응답 생성"],
          ["Google LLC", "미국 — Gemini API, Firebase, GCP 인프라 운영"],
        ]} />
        <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          전송되는 데이터는 응답 생성 후 외부 제공자 서버에 영구 저장되지 않으며(각 제공자 API 정책에 따름),
          전송 시 TLS 암호화가 적용됩니다.
        </p>
      </Card>

      {/* 11. 개인정보 보호책임자 */}
      <Card title="제11조 (개인정보 보호책임자)">
        <p>회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 이용자의 불만처리 및 피해구제를 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.</p>
        <Table rows={[
          ["성명", "엄정원"],
          ["직위", "대표"],
          ["이메일", "jungwon@yuaone.com"],
        ]} />
        <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          기타 개인정보 침해에 대한 신고나 상담이 필요하신 경우 아래 기관에 문의하시기 바랍니다.
        </p>
        <BulletList items={[
          "개인정보침해신고센터 (privacy.kisa.or.kr / 국번없이 118)",
          "개인정보분쟁조정위원회 (www.kopico.go.kr / 1833-6972)",
          "대검찰청 사이버수사과 (www.spo.go.kr / 국번없이 1301)",
          "경찰청 사이버수사국 (ecrm.cyber.go.kr / 국번없이 182)",
        ]} />
      </Card>

      {/* 12. 외부 AI 제공자 정책 */}
      <Card title="제12조 (외부 AI 서비스 제공자 정책 안내)">
        <p>YUA 서비스는 AI 응답 생성을 위해 외부 AI 서비스를 활용하고 있습니다. 각 제공자의 개인정보 처리에 관한 정책은 아래 링크에서 확인하실 수 있습니다.</p>
        <div className="mt-3 flex flex-col gap-2">
          <a href="https://www.anthropic.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
            Anthropic Privacy Policy
          </a>
          <a href="https://openai.com/policies/privacy-policy/" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
            OpenAI Privacy Policy
          </a>
          <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
            Google Privacy Policy
          </a>
        </div>
      </Card>

      {/* 13. 방침 변경 */}
      <Card title="제13조 (개인정보처리방침 변경)">
        <BulletList items={[
          "본 개인정보처리방침은 시행일로부터 적용되며, 법령 및 방침에 따른 변경내용의 추가, 삭제 및 정정이 있는 경우에는 변경사항의 시행 7일 전부터 서비스 내 공지사항을 통하여 고지할 것입니다.",
          "중대한 변경사항이 있는 경우에는 시행 30일 전부터 고지합니다.",
        ]} />
      </Card>
    </main>
  );
}
