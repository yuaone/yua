"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import CodeBlock from "@/components/CodeBlock";

/* ─────────────────────────────────────────────
   Types & Constants
   ───────────────────────────────────────────── */

type SectionId =
  | "getting-started"
  | "authentication"
  | "chat-api"
  | "streaming"
  | "models"
  | "error-codes"
  | "rate-limits"
  | "code-examples";

type Lang = "curl" | "node" | "python";

const NAV_ITEMS: { id: SectionId; label: string }[] = [
  { id: "getting-started", label: "시작하기" },
  { id: "authentication", label: "인증" },
  { id: "chat-api", label: "Chat Completions" },
  { id: "streaming", label: "스트리밍 (SSE)" },
  { id: "models", label: "모델 목록" },
  { id: "error-codes", label: "에러 코드" },
  { id: "rate-limits", label: "Rate Limits" },
  { id: "code-examples", label: "코드 예제" },
];

/* ─────────────────────────────────────────────
   Root Page
   ───────────────────────────────────────────── */

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState<SectionId>("getting-started");
  const sectionRefs = useRef<Record<SectionId, HTMLDivElement | null>>({
    "getting-started": null,
    authentication: null,
    "chat-api": null,
    streaming: null,
    models: null,
    "error-codes": null,
    "rate-limits": null,
    "code-examples": null,
  });

  /* Scroll-spy: highlight nav item based on scroll position */
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id as SectionId);
          }
        }
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: 0 },
    );

    for (const ref of Object.values(sectionRefs.current)) {
      if (ref) observer.observe(ref);
    }
    return () => observer.disconnect();
  }, []);

  const scrollTo = useCallback((id: SectionId) => {
    sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const assignRef = useCallback(
    (id: SectionId) => (el: HTMLDivElement | null) => {
      sectionRefs.current[id] = el;
    },
    [],
  );

  return (
    <div className="flex gap-0" style={{ minHeight: "calc(100vh - var(--header-height) - 64px)" }}>
      {/* ── Left Sidebar Nav ── */}
      <nav
        className="hidden lg:block shrink-0 sticky"
        style={{
          width: 220,
          top: "calc(var(--header-height) + 32px)",
          height: "fit-content",
          alignSelf: "flex-start",
          paddingRight: 24,
          borderRight: "1px solid var(--border-subtle)",
        }}
      >
        <p
          style={{
            fontSize: 11,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: "var(--text-muted)",
            marginBottom: 12,
          }}
        >
          문서 목차
        </p>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 2 }}>
          {NAV_ITEMS.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <li key={item.id}>
                <button
                  onClick={() => scrollTo(item.id)}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "7px 12px",
                    fontSize: 13,
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? "var(--accent)" : "var(--text-secondary)",
                    background: isActive ? "var(--accent-subtle)" : "transparent",
                    border: "none",
                    borderRadius: "var(--radius-md)",
                    cursor: "pointer",
                    transition: "all var(--transition-fast)",
                    letterSpacing: "-0.01em",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.background = "var(--surface-hover)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.background = "transparent";
                  }}
                >
                  {item.label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* ── Main Content ── */}
      <div className="flex-1 min-w-0" style={{ paddingLeft: 0 }}>
        <div className="lg:pl-10" style={{ maxWidth: 820 }}>
          {/* Page Title */}
          <h1
            style={{
              fontSize: 26,
              fontWeight: 700,
              color: "var(--text-primary)",
              letterSpacing: "-0.02em",
              marginBottom: 4,
            }}
          >
            API 문서
          </h1>
          <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 40 }}>
            YUA LLM Chat API를 사용하여 애플리케이션에 AI 대화 기능을 통합하세요. OpenAI-호환 형식을 지원합니다.
          </p>

          {/* Sections */}
          <div ref={assignRef("getting-started")} id="getting-started">
            <GettingStartedSection />
          </div>
          <SectionDivider />

          <div ref={assignRef("authentication")} id="authentication">
            <AuthenticationSection />
          </div>
          <SectionDivider />

          <div ref={assignRef("chat-api")} id="chat-api">
            <ChatApiSection />
          </div>
          <SectionDivider />

          <div ref={assignRef("streaming")} id="streaming">
            <StreamingSection />
          </div>
          <SectionDivider />

          <div ref={assignRef("models")} id="models">
            <ModelsSection />
          </div>
          <SectionDivider />

          <div ref={assignRef("error-codes")} id="error-codes">
            <ErrorCodesSection />
          </div>
          <SectionDivider />

          <div ref={assignRef("rate-limits")} id="rate-limits">
            <RateLimitsSection />
          </div>
          <SectionDivider />

          <div ref={assignRef("code-examples")} id="code-examples">
            <CodeExamplesSection />
          </div>

          {/* Bottom spacer */}
          <div style={{ height: 80 }} />
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Section 1: 시작하기
   ───────────────────────────────────────────── */

function GettingStartedSection() {
  return (
    <div>
      <SectionHeading>시작하기</SectionHeading>

      <p className="text-sm" style={{ color: "var(--text-secondary)", marginBottom: 16 }}>
        YUA API는 OpenAI-호환 Chat Completions 형식을 제공합니다.
        기존 OpenAI SDK를 사용하는 애플리케이션에서 base URL만 변경하면 바로 연동할 수 있습니다.
      </p>

      <InfoCard>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Base URL
          </span>
        </div>
        <code
          style={{
            fontSize: 14,
            fontWeight: 600,
            fontFamily: "'SF Mono', 'Fira Code', 'Cascadia Code', monospace",
            color: "var(--accent)",
          }}
        >
          https://api.yuaone.com
        </code>
      </InfoCard>

      <SubHeading>빠른 시작</SubHeading>
      <p className="text-sm" style={{ color: "var(--text-secondary)", marginBottom: 12 }}>
        API 키를 발급받은 후, 아래 명령어로 바로 테스트할 수 있습니다.
        API 키는{" "}
        <a href="/keys" style={{ color: "var(--accent)", textDecoration: "underline" }}>
          Keys 페이지
        </a>
        에서 관리합니다.
      </p>

      <CodeBlock
        language="bash"
        code={`curl -X POST https://api.yuaone.com/v1/chat/completions \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "yua-normal",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'`}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────
   Section 2: 인증
   ───────────────────────────────────────────── */

function AuthenticationSection() {
  return (
    <div>
      <SectionHeading>인증</SectionHeading>

      <p className="text-sm" style={{ color: "var(--text-secondary)", marginBottom: 16 }}>
        모든 API 요청에는 <InlineCode>Authorization</InlineCode> 헤더가 필요합니다.
      </p>

      <div style={{ display: "grid", gap: 12, marginBottom: 20 }}>
        <HeaderCard
          header="Authorization"
          value="Bearer YOUR_API_KEY"
          description="Keys 페이지에서 발급받은 API 키를 Bearer 토큰으로 전달합니다."
        />
      </div>

      <InfoCard>
        <p className="text-sm" style={{ color: "var(--text-secondary)", margin: 0 }}>
          API 키는 <InlineCode>yua_sk_</InlineCode> 접두사로 시작합니다.
          키는 생성 시 한 번만 표시되므로 안전한 곳에 보관하세요.
          키가 유출된 경우{" "}
          <a href="/keys" style={{ color: "var(--accent)", textDecoration: "underline" }}>
            Keys 페이지
          </a>
          에서 즉시 폐기(revoke)할 수 있습니다.
        </p>
      </InfoCard>

      <SubHeading>요청 예시</SubHeading>
      <CodeBlock
        language="bash"
        code={`curl https://api.yuaone.com/v1/chat/completions \\
  -H "Authorization: Bearer yua_sk_abc123..." \\
  -H "Content-Type: application/json" \\
  -d '{"model": "yua-normal", "messages": [{"role": "user", "content": "Hi"}]}'`}
      />

      <SubHeading>OpenAI SDK 호환</SubHeading>
      <p className="text-sm" style={{ color: "var(--text-secondary)", marginBottom: 12 }}>
        OpenAI SDK를 사용하는 경우 base URL만 변경하면 됩니다.
      </p>
      <CodeBlock
        language="python"
        code={`from openai import OpenAI

client = OpenAI(
    api_key="yua_sk_...",
    base_url="https://api.yuaone.com/v1",
)

response = client.chat.completions.create(
    model="yua-normal",
    messages=[{"role": "user", "content": "Hello!"}],
)

print(response.choices[0].message.content)`}
      />
      <CodeBlock
        language="typescript"
        code={`import OpenAI from "openai";

const client = new OpenAI({
  apiKey: "yua_sk_...",
  baseURL: "https://api.yuaone.com/v1",
});

const response = await client.chat.completions.create({
  model: "yua-normal",
  messages: [{ role: "user", content: "Hello!" }],
});

console.log(response.choices[0].message.content);`}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────
   Section 3: Chat Completions API
   ───────────────────────────────────────────── */

function ChatApiSection() {
  return (
    <div>
      <SectionHeading>Chat Completions API</SectionHeading>

      <EndpointBadge method="POST" path="/v1/chat/completions" />

      <p className="text-sm" style={{ color: "var(--text-secondary)", margin: "12px 0 20px" }}>
        OpenAI-호환 채팅 완성 엔드포인트입니다. 스트리밍 및 비스트리밍 모두 지원합니다.
      </p>

      {/* Request Body */}
      <SubHeading>요청 본문 (Request Body)</SubHeading>
      <div className="table-container" style={{ marginBottom: 16 }}>
        <table>
          <thead>
            <tr>
              <th>필드</th>
              <th>타입</th>
              <th>필수</th>
              <th>설명</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><InlineCode>model</InlineCode></td>
              <td style={{ color: "var(--text-secondary)" }}>string</td>
              <td><RequiredBadge /></td>
              <td style={{ color: "var(--text-secondary)" }}>사용할 모델 ID (예: <InlineCode>yua-normal</InlineCode>)</td>
            </tr>
            <tr>
              <td><InlineCode>messages</InlineCode></td>
              <td style={{ color: "var(--text-secondary)" }}>array</td>
              <td><RequiredBadge /></td>
              <td style={{ color: "var(--text-secondary)" }}>
                {"[{role, content}] 형식의 메시지 배열. role: "}
                <InlineCode>system</InlineCode>{" | "}
                <InlineCode>user</InlineCode>{" | "}
                <InlineCode>assistant</InlineCode>
              </td>
            </tr>
            <tr>
              <td><InlineCode>stream</InlineCode></td>
              <td style={{ color: "var(--text-secondary)" }}>boolean</td>
              <td><OptionalBadge /></td>
              <td style={{ color: "var(--text-secondary)" }}><InlineCode>true</InlineCode> 설정 시 SSE 스트리밍 응답</td>
            </tr>
            <tr>
              <td><InlineCode>temperature</InlineCode></td>
              <td style={{ color: "var(--text-secondary)" }}>number</td>
              <td><OptionalBadge /></td>
              <td style={{ color: "var(--text-secondary)" }}>0~2, 기본값 0.7. 높을수록 창의적 응답</td>
            </tr>
            <tr>
              <td><InlineCode>max_tokens</InlineCode></td>
              <td style={{ color: "var(--text-secondary)" }}>number</td>
              <td><OptionalBadge /></td>
              <td style={{ color: "var(--text-secondary)" }}>최대 출력 토큰 수</td>
            </tr>
          </tbody>
        </table>
      </div>

      <SubHeading>요청 예시</SubHeading>
      <CodeBlock
        language="json"
        code={`{
  "model": "yua-normal",
  "messages": [
    { "role": "system", "content": "You are a helpful assistant." },
    { "role": "user", "content": "What is quantum computing?" }
  ],
  "stream": false,
  "temperature": 0.7,
  "max_tokens": 1024
}`}
      />

      {/* Response — Non-stream */}
      <SubHeading>응답 (Response)</SubHeading>
      <div className="table-container" style={{ marginBottom: 16 }}>
        <table>
          <thead>
            <tr>
              <th>필드</th>
              <th>타입</th>
              <th>설명</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><InlineCode>id</InlineCode></td>
              <td style={{ color: "var(--text-secondary)" }}>string</td>
              <td style={{ color: "var(--text-secondary)" }}>완성 ID (<InlineCode>chatcmpl-...</InlineCode>)</td>
            </tr>
            <tr>
              <td><InlineCode>object</InlineCode></td>
              <td style={{ color: "var(--text-secondary)" }}>string</td>
              <td style={{ color: "var(--text-secondary)" }}><InlineCode>chat.completion</InlineCode></td>
            </tr>
            <tr>
              <td><InlineCode>model</InlineCode></td>
              <td style={{ color: "var(--text-secondary)" }}>string</td>
              <td style={{ color: "var(--text-secondary)" }}>사용된 모델 ID</td>
            </tr>
            <tr>
              <td><InlineCode>choices</InlineCode></td>
              <td style={{ color: "var(--text-secondary)" }}>array</td>
              <td style={{ color: "var(--text-secondary)" }}>
                {"[{message: {role, content}, finish_reason}]"}
              </td>
            </tr>
            <tr>
              <td><InlineCode>usage</InlineCode></td>
              <td style={{ color: "var(--text-secondary)" }}>object</td>
              <td style={{ color: "var(--text-secondary)" }}>
                {"prompt_tokens, completion_tokens, total_tokens"}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <CodeBlock
        language="json"
        code={`{
  "id": "chatcmpl-abc123def456",
  "object": "chat.completion",
  "created": 1709000000,
  "model": "yua-normal",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "양자 컴퓨팅은 양자역학의 원리를 활용하여..."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 24,
    "completion_tokens": 156,
    "total_tokens": 180
  }
}`}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────
   Section 4: 스트리밍 (SSE)
   ───────────────────────────────────────────── */

function StreamingSection() {
  return (
    <div>
      <SectionHeading>스트리밍 (SSE)</SectionHeading>

      <EndpointBadge method="POST" path="/v1/chat/completions" />

      <p className="text-sm" style={{ color: "var(--text-secondary)", margin: "12px 0 16px" }}>
        <InlineCode>stream: true</InlineCode>를 설정하면 Server-Sent Events (SSE) 형식으로
        토큰이 실시간으로 전달됩니다.
      </p>

      <SubHeading>스트리밍 요청</SubHeading>
      <CodeBlock
        language="bash"
        code={`curl -X POST https://api.yuaone.com/v1/chat/completions \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "yua-normal",
    "messages": [{"role": "user", "content": "Hello!"}],
    "stream": true
  }'`}
      />

      <SubHeading>스트리밍 응답 형식</SubHeading>
      <p className="text-sm" style={{ color: "var(--text-secondary)", marginBottom: 12 }}>
        각 청크는 <InlineCode>data:</InlineCode> 접두사와 함께 전달됩니다.
        <InlineCode>delta.content</InlineCode>에 토큰 텍스트가 포함됩니다.
        스트림 종료 시 <InlineCode>{"data: [DONE]"}</InlineCode>이 전송됩니다.
      </p>
      <CodeBlock
        language="text"
        code={`data: {"id":"chatcmpl-abc123","object":"chat.completion.chunk","created":1709000000,"model":"yua-normal","choices":[{"index":0,"delta":{"content":"양자"},"finish_reason":null}]}

data: {"id":"chatcmpl-abc123","object":"chat.completion.chunk","created":1709000000,"model":"yua-normal","choices":[{"index":0,"delta":{"content":" 컴퓨팅은"},"finish_reason":null}]}

data: {"id":"chatcmpl-abc123","object":"chat.completion.chunk","created":1709000000,"model":"yua-normal","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}

data: [DONE]`}
      />

      <SubHeading>스트리밍 청크 구조</SubHeading>
      <div className="table-container" style={{ marginBottom: 16 }}>
        <table>
          <thead>
            <tr>
              <th>필드</th>
              <th>타입</th>
              <th>설명</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><InlineCode>id</InlineCode></td>
              <td style={{ color: "var(--text-secondary)" }}>string</td>
              <td style={{ color: "var(--text-secondary)" }}>스트림 전체에서 동일한 완성 ID</td>
            </tr>
            <tr>
              <td><InlineCode>object</InlineCode></td>
              <td style={{ color: "var(--text-secondary)" }}>string</td>
              <td style={{ color: "var(--text-secondary)" }}><InlineCode>chat.completion.chunk</InlineCode></td>
            </tr>
            <tr>
              <td><InlineCode>choices[].delta</InlineCode></td>
              <td style={{ color: "var(--text-secondary)" }}>object</td>
              <td style={{ color: "var(--text-secondary)" }}>
                {"토큰별 증분 데이터. {content: \"...\"} 형식"}
              </td>
            </tr>
            <tr>
              <td><InlineCode>choices[].finish_reason</InlineCode></td>
              <td style={{ color: "var(--text-secondary)" }}>string | null</td>
              <td style={{ color: "var(--text-secondary)" }}>
                마지막 청크에서 <InlineCode>stop</InlineCode> 반환
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <InfoCard>
        <p className="text-sm" style={{ color: "var(--text-secondary)", margin: 0 }}>
          <strong style={{ color: "var(--text-primary)" }}>Tip:</strong>{" "}
          OpenAI SDK를 사용하면 SSE 파싱을 직접 구현할 필요 없이 간편하게 스트리밍을 처리할 수 있습니다.
          코드 예제 섹션을 참고하세요.
        </p>
      </InfoCard>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Section 5: 모델 목록
   ───────────────────────────────────────────── */

function ModelsSection() {
  return (
    <div>
      <SectionHeading>모델 목록</SectionHeading>

      <EndpointBadge method="GET" path="/v1/models" />

      <p className="text-sm" style={{ color: "var(--text-secondary)", margin: "12px 0 16px" }}>
        사용 가능한 모델 목록을 조회합니다.
      </p>

      <SubHeading>요청</SubHeading>
      <CodeBlock
        language="bash"
        code={`curl https://api.yuaone.com/v1/models \\
  -H "Authorization: Bearer YOUR_API_KEY"`}
      />

      <SubHeading>응답</SubHeading>
      <CodeBlock
        language="json"
        code={`{
  "object": "list",
  "data": [
    { "id": "yua-basic",  "object": "model", "owned_by": "yua" },
    { "id": "yua-normal", "object": "model", "owned_by": "yua" },
    { "id": "yua-pro",    "object": "model", "owned_by": "yua" },
    { "id": "yua-spine",  "object": "model", "owned_by": "yua" }
  ]
}`}
      />

      <SubHeading>사용 가능한 모델</SubHeading>
      <div className="table-container" style={{ marginBottom: 24 }}>
        <table>
          <thead>
            <tr>
              <th>모델 ID</th>
              <th>설명</th>
              <th>용도</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><InlineCode>yua-basic</InlineCode></td>
              <td style={{ color: "var(--text-secondary)" }}>경량 모델 (기본값)</td>
              <td style={{ color: "var(--text-muted)" }}>간단한 질문, 번역, 요약</td>
            </tr>
            <tr>
              <td><InlineCode>yua-normal</InlineCode></td>
              <td style={{ color: "var(--text-secondary)" }}>범용 모델</td>
              <td style={{ color: "var(--text-muted)" }}>일반 대화, 코딩, 분석</td>
            </tr>
            <tr>
              <td><InlineCode>yua-pro</InlineCode></td>
              <td style={{ color: "var(--text-secondary)" }}>고성능 추론 모델</td>
              <td style={{ color: "var(--text-muted)" }}>복잡한 분석, 다단계 추론</td>
            </tr>
            <tr>
              <td><InlineCode>yua-spine</InlineCode></td>
              <td style={{ color: "var(--text-secondary)" }}>최상위 모델</td>
              <td style={{ color: "var(--text-muted)" }}>전문 연구, 심층 분석</td>
            </tr>
          </tbody>
        </table>
      </div>

      <InfoCard>
        <p className="text-sm" style={{ color: "var(--text-secondary)", margin: 0 }}>
          <strong style={{ color: "var(--text-primary)" }}>기본 모델:</strong>{" "}
          <InlineCode>model</InlineCode> 필드를 생략하면 <InlineCode>yua-basic</InlineCode>이 기본값으로 사용됩니다.
        </p>
      </InfoCard>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Section 6: 에러 코드
   ───────────────────────────────────────────── */

const ERROR_CODES: { code: number; name: string; type: string; description: string }[] = [
  { code: 400, name: "Bad Request", type: "invalid_request_error", description: "요청이 유효하지 않습니다. model 누락, messages 비어있음 등을 확인하세요." },
  { code: 401, name: "Unauthorized", type: "authentication_error", description: "API 키가 누락되었거나 유효하지 않습니다." },
  { code: 429, name: "Too Many Requests", type: "rate_limit_error", description: "요청 속도 제한을 초과했습니다. 잠시 후 재시도하세요." },
  { code: 500, name: "Internal Server Error", type: "server_error", description: "서버 내부 오류가 발생했습니다. 지속되면 문의해 주세요." },
];

function ErrorCodesSection() {
  return (
    <div>
      <SectionHeading>에러 코드</SectionHeading>

      <p className="text-sm" style={{ color: "var(--text-secondary)", marginBottom: 16 }}>
        API는 표준 HTTP 상태 코드를 사용하며, 에러 시 JSON 본문에 상세 정보를 포함합니다.
      </p>

      {/* Error response format */}
      <SubHeading>에러 응답 형식</SubHeading>
      <CodeBlock
        language="json"
        code={`{
  "error": {
    "message": "Invalid API key provided.",
    "type": "authentication_error",
    "code": "invalid_api_key"
  }
}`}
      />

      {/* Error codes table */}
      <SubHeading>상태 코드 목록</SubHeading>
      <div className="table-container" style={{ marginBottom: 16 }}>
        <table>
          <thead>
            <tr>
              <th style={{ width: 80 }}>코드</th>
              <th style={{ width: 180 }}>이름</th>
              <th style={{ width: 180 }}>type</th>
              <th>설명</th>
            </tr>
          </thead>
          <tbody>
            {ERROR_CODES.map((err) => (
              <tr key={err.code}>
                <td>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      minWidth: 40,
                      height: 22,
                      padding: "0 8px",
                      fontSize: 12,
                      fontWeight: 600,
                      fontFamily: "'SF Mono', 'Fira Code', monospace",
                      borderRadius: "var(--radius-full)",
                      background:
                        err.code < 500
                          ? err.code === 429
                            ? "rgba(245, 158, 11, 0.12)"
                            : "rgba(239, 68, 68, 0.10)"
                          : "rgba(239, 68, 68, 0.15)",
                      color:
                        err.code < 500
                          ? err.code === 429
                            ? "var(--warning)"
                            : "var(--error)"
                          : "var(--error)",
                    }}
                  >
                    {err.code}
                  </span>
                </td>
                <td>
                  <span style={{ fontWeight: 500, color: "var(--text-primary)" }}>{err.name}</span>
                </td>
                <td>
                  <InlineCode>{err.type}</InlineCode>
                </td>
                <td style={{ color: "var(--text-secondary)" }}>{err.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SubHeading>에러 코드 상세</SubHeading>
      <div className="table-container" style={{ marginBottom: 16 }}>
        <table>
          <thead>
            <tr>
              <th>code (에러 코드)</th>
              <th>발생 조건</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><InlineCode>invalid_messages</InlineCode></td>
              <td style={{ color: "var(--text-secondary)" }}>messages가 비어있거나 배열이 아닌 경우</td>
            </tr>
            <tr>
              <td><InlineCode>no_user_message</InlineCode></td>
              <td style={{ color: "var(--text-secondary)" }}>user role 메시지가 없거나 content가 비어있는 경우</td>
            </tr>
            <tr>
              <td><InlineCode>auth_required</InlineCode></td>
              <td style={{ color: "var(--text-secondary)" }}>API 키가 누락되었거나 인증 실패</td>
            </tr>
            <tr>
              <td><InlineCode>workspace_required</InlineCode></td>
              <td style={{ color: "var(--text-secondary)" }}>워크스페이스 컨텍스트를 확인할 수 없는 경우</td>
            </tr>
            <tr>
              <td><InlineCode>internal_error</InlineCode></td>
              <td style={{ color: "var(--text-secondary)" }}>서버 내부 오류</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Retry guidance */}
      <SubHeading>재시도 가이드</SubHeading>
      <InfoCard>
        <p className="text-sm" style={{ color: "var(--text-secondary)", margin: 0 }}>
          <strong style={{ color: "var(--text-primary)" }}>429</strong> 및{" "}
          <strong style={{ color: "var(--text-primary)" }}>500</strong> 에러는 지수 백오프(exponential backoff)로
          재시도하는 것을 권장합니다. 첫 재시도는 1초, 이후 2초, 4초로 간격을 늘려주세요.
        </p>
      </InfoCard>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Section 7: Rate Limits
   ───────────────────────────────────────────── */

function RateLimitsSection() {
  return (
    <div>
      <SectionHeading>Rate Limits</SectionHeading>

      <p className="text-sm" style={{ color: "var(--text-secondary)", marginBottom: 16 }}>
        API 요청은 키 단위로 속도 제한이 적용됩니다. 제한을 초과하면 <InlineCode>429</InlineCode> 응답이 반환됩니다.
      </p>

      <SubHeading>키별 제한</SubHeading>
      <div className="table-container" style={{ marginBottom: 16 }}>
        <table>
          <thead>
            <tr>
              <th>제한 유형</th>
              <th>설명</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ fontWeight: 500, color: "var(--text-primary)" }}>요청 속도 제한</td>
              <td style={{ color: "var(--text-secondary)" }}>API 키별로 분당/시간당 요청 수 제한</td>
            </tr>
            <tr>
              <td style={{ fontWeight: 500, color: "var(--text-primary)" }}>크레딧 기반 사용량</td>
              <td style={{ color: "var(--text-secondary)" }}>각 API 호출은 모델 및 토큰 수에 따라 크레딧을 소모합니다</td>
            </tr>
          </tbody>
        </table>
      </div>

      <SubHeading>Rate Limit 응답 헤더</SubHeading>
      <p className="text-sm" style={{ color: "var(--text-secondary)", marginBottom: 12 }}>
        API 응답에는 현재 rate limit 상태를 확인할 수 있는 헤더가 포함됩니다.
      </p>
      <div style={{ display: "grid", gap: 12, marginBottom: 20 }}>
        <HeaderCard
          header="x-ratelimit-limit"
          value="60"
          description="분당 허용 요청 수"
        />
        <HeaderCard
          header="x-ratelimit-remaining"
          value="55"
          description="남은 요청 수"
        />
        <HeaderCard
          header="x-ratelimit-reset"
          value="1709000060"
          description="제한 초기화 시각 (Unix timestamp)"
        />
      </div>

      <InfoCard>
        <p className="text-sm" style={{ color: "var(--text-secondary)", margin: 0 }}>
          <strong style={{ color: "var(--text-primary)" }}>크레딧 부족 시:</strong>{" "}
          잔여 크레딧이 0이면 API 호출이 거부됩니다. 크레딧 잔액은 대시보드에서 확인할 수 있습니다.
        </p>
      </InfoCard>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Section 8: 코드 예제
   ───────────────────────────────────────────── */

function CodeExamplesSection() {
  const [lang, setLang] = useState<Lang>("curl");

  return (
    <div>
      <SectionHeading>코드 예제</SectionHeading>

      <p className="text-sm" style={{ color: "var(--text-secondary)", marginBottom: 16 }}>
        다양한 언어로 YUA API를 호출하는 예제입니다.
      </p>

      {/* ── Chat Completion ── */}
      <SubHeading>Chat Completion (비스트리밍)</SubHeading>
      <LangTabs active={lang} onChange={setLang} />

      {lang === "curl" && (
        <CodeBlock
          language="bash"
          code={`curl -X POST https://api.yuaone.com/v1/chat/completions \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "yua-normal",
    "messages": [
      {"role": "system", "content": "You are a helpful assistant."},
      {"role": "user", "content": "Explain quantum computing in 3 sentences."}
    ],
    "temperature": 0.7,
    "max_tokens": 512
  }'`}
        />
      )}

      {lang === "python" && (
        <>
          <p className="text-xs" style={{ color: "var(--text-muted)", marginBottom: 8 }}>
            requests 라이브러리
          </p>
          <CodeBlock
            language="python"
            code={`import requests

response = requests.post(
    "https://api.yuaone.com/v1/chat/completions",
    headers={
        "Authorization": "Bearer YOUR_API_KEY",
        "Content-Type": "application/json",
    },
    json={
        "model": "yua-normal",
        "messages": [
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": "Explain quantum computing in 3 sentences."},
        ],
        "temperature": 0.7,
        "max_tokens": 512,
    },
)

data = response.json()
print(data["choices"][0]["message"]["content"])`}
          />

          <p className="text-xs" style={{ color: "var(--text-muted)", marginBottom: 8, marginTop: 16 }}>
            OpenAI SDK (호환)
          </p>
          <CodeBlock
            language="python"
            code={`from openai import OpenAI

client = OpenAI(
    api_key="YOUR_API_KEY",
    base_url="https://api.yuaone.com/v1",
)

response = client.chat.completions.create(
    model="yua-normal",
    messages=[
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "Explain quantum computing in 3 sentences."},
    ],
    temperature=0.7,
    max_tokens=512,
)

print(response.choices[0].message.content)`}
          />
        </>
      )}

      {lang === "node" && (
        <>
          <p className="text-xs" style={{ color: "var(--text-muted)", marginBottom: 8 }}>
            fetch API
          </p>
          <CodeBlock
            language="typescript"
            code={`const response = await fetch("https://api.yuaone.com/v1/chat/completions", {
  method: "POST",
  headers: {
    "Authorization": "Bearer YOUR_API_KEY",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: "yua-normal",
    messages: [
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: "Explain quantum computing in 3 sentences." },
    ],
    temperature: 0.7,
    max_tokens: 512,
  }),
});

const data = await response.json();
console.log(data.choices[0].message.content);`}
          />

          <p className="text-xs" style={{ color: "var(--text-muted)", marginBottom: 8, marginTop: 16 }}>
            OpenAI SDK (호환)
          </p>
          <CodeBlock
            language="typescript"
            code={`import OpenAI from "openai";

const client = new OpenAI({
  apiKey: "YOUR_API_KEY",
  baseURL: "https://api.yuaone.com/v1",
});

const response = await client.chat.completions.create({
  model: "yua-normal",
  messages: [
    { role: "system", content: "You are a helpful assistant." },
    { role: "user", content: "Explain quantum computing in 3 sentences." },
  ],
  temperature: 0.7,
  max_tokens: 512,
});

console.log(response.choices[0].message.content);`}
          />
        </>
      )}

      {/* ── Streaming ── */}
      <SubHeading style={{ marginTop: 32 }}>Chat Completion (스트리밍)</SubHeading>
      <LangTabs active={lang} onChange={setLang} />

      {lang === "curl" && (
        <CodeBlock
          language="bash"
          code={`curl -X POST https://api.yuaone.com/v1/chat/completions \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -N \\
  -d '{
    "model": "yua-normal",
    "messages": [{"role": "user", "content": "Write a short poem about AI."}],
    "stream": true
  }'`}
        />
      )}

      {lang === "python" && (
        <>
          <p className="text-xs" style={{ color: "var(--text-muted)", marginBottom: 8 }}>
            requests + SSE 파싱
          </p>
          <CodeBlock
            language="python"
            code={`import requests
import json

response = requests.post(
    "https://api.yuaone.com/v1/chat/completions",
    headers={
        "Authorization": "Bearer YOUR_API_KEY",
        "Content-Type": "application/json",
    },
    json={
        "model": "yua-normal",
        "messages": [{"role": "user", "content": "Write a short poem about AI."}],
        "stream": True,
    },
    stream=True,
)

for line in response.iter_lines():
    if not line:
        continue
    decoded = line.decode("utf-8")
    if decoded.startswith("data: "):
        payload = decoded[6:]
        if payload == "[DONE]":
            break
        chunk = json.loads(payload)
        content = chunk["choices"][0]["delta"].get("content", "")
        print(content, end="", flush=True)`}
          />

          <p className="text-xs" style={{ color: "var(--text-muted)", marginBottom: 8, marginTop: 16 }}>
            OpenAI SDK (호환)
          </p>
          <CodeBlock
            language="python"
            code={`from openai import OpenAI

client = OpenAI(
    api_key="YOUR_API_KEY",
    base_url="https://api.yuaone.com/v1",
)

stream = client.chat.completions.create(
    model="yua-normal",
    messages=[{"role": "user", "content": "Write a short poem about AI."}],
    stream=True,
)

for chunk in stream:
    content = chunk.choices[0].delta.content
    if content:
        print(content, end="", flush=True)`}
          />
        </>
      )}

      {lang === "node" && (
        <>
          <p className="text-xs" style={{ color: "var(--text-muted)", marginBottom: 8 }}>
            fetch + SSE 파싱
          </p>
          <CodeBlock
            language="typescript"
            code={`const response = await fetch("https://api.yuaone.com/v1/chat/completions", {
  method: "POST",
  headers: {
    "Authorization": "Bearer YOUR_API_KEY",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: "yua-normal",
    messages: [{ role: "user", content: "Write a short poem about AI." }],
    stream: true,
  }),
});

const reader = response.body!.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const text = decoder.decode(value, { stream: true });
  for (const line of text.split("\\n")) {
    if (!line.startsWith("data: ")) continue;
    const payload = line.slice(6);
    if (payload === "[DONE]") break;

    const chunk = JSON.parse(payload);
    const content = chunk.choices[0]?.delta?.content;
    if (content) process.stdout.write(content);
  }
}`}
          />

          <p className="text-xs" style={{ color: "var(--text-muted)", marginBottom: 8, marginTop: 16 }}>
            OpenAI SDK (호환)
          </p>
          <CodeBlock
            language="typescript"
            code={`import OpenAI from "openai";

const client = new OpenAI({
  apiKey: "YOUR_API_KEY",
  baseURL: "https://api.yuaone.com/v1",
});

const stream = await client.chat.completions.create({
  model: "yua-normal",
  messages: [{ role: "user", content: "Write a short poem about AI." }],
  stream: true,
});

for await (const chunk of stream) {
  const content = chunk.choices[0]?.delta?.content;
  if (content) process.stdout.write(content);
}`}
          />
        </>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Shared UI Components
   ───────────────────────────────────────────── */

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        fontSize: 20,
        fontWeight: 700,
        color: "var(--text-primary)",
        letterSpacing: "-0.02em",
        marginBottom: 8,
        scrollMarginTop: "calc(var(--header-height) + 40px)",
      }}
    >
      {children}
    </h2>
  );
}

function SubHeading({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <h3
      style={{
        fontSize: 14,
        fontWeight: 600,
        color: "var(--text-primary)",
        marginTop: 24,
        marginBottom: 8,
        ...style,
      }}
    >
      {children}
    </h3>
  );
}

function SectionDivider() {
  return (
    <hr
      style={{
        border: "none",
        height: 1,
        background: "var(--border-subtle)",
        margin: "40px 0",
      }}
    />
  );
}

function InfoCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: "14px 18px",
        borderRadius: "var(--radius-lg)",
        background: "var(--accent-subtle)",
        border: "1px solid var(--accent-muted)",
        marginBottom: 16,
      }}
    >
      {children}
    </div>
  );
}

function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code
      style={{
        fontSize: 12,
        fontFamily: "'SF Mono', 'Fira Code', 'Cascadia Code', monospace",
        background: "var(--surface-hover)",
        color: "var(--accent)",
        padding: "2px 6px",
        borderRadius: "var(--radius-sm)",
        fontWeight: 500,
      }}
    >
      {children}
    </code>
  );
}

function EndpointBadge({ method, path }: { method: string; path: string }) {
  const methodColors: Record<string, { bg: string; color: string }> = {
    GET: { bg: "rgba(16, 185, 129, 0.12)", color: "var(--success)" },
    POST: { bg: "rgba(59, 130, 246, 0.12)", color: "var(--info)" },
    PATCH: { bg: "rgba(245, 158, 11, 0.12)", color: "var(--warning)" },
    DELETE: { bg: "rgba(239, 68, 68, 0.12)", color: "var(--error)" },
  };
  const mc = methodColors[method] || methodColors.GET;

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 14px",
        borderRadius: "var(--radius-md)",
        background: "var(--surface-panel)",
        border: "1px solid var(--border-subtle)",
      }}
    >
      <span
        style={{
          fontSize: 12,
          fontWeight: 700,
          fontFamily: "'SF Mono', 'Fira Code', monospace",
          padding: "2px 8px",
          borderRadius: "var(--radius-sm)",
          background: mc.bg,
          color: mc.color,
          letterSpacing: "0.02em",
        }}
      >
        {method}
      </span>
      <span
        style={{
          fontSize: 13,
          fontWeight: 500,
          fontFamily: "'SF Mono', 'Fira Code', monospace",
          color: "var(--text-primary)",
        }}
      >
        {path}
      </span>
    </div>
  );
}

function RequiredBadge() {
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        color: "var(--error)",
        background: "rgba(239, 68, 68, 0.10)",
        padding: "1px 6px",
        borderRadius: "var(--radius-full)",
      }}
    >
      필수
    </span>
  );
}

function OptionalBadge() {
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 500,
        color: "var(--text-muted)",
      }}
    >
      선택
    </span>
  );
}

function HeaderCard({
  header,
  value,
  description,
}: {
  header: string;
  value: string;
  description: string;
}) {
  return (
    <div
      style={{
        padding: "14px 18px",
        borderRadius: "var(--radius-lg)",
        background: "var(--surface-panel)",
        border: "1px solid var(--border-subtle)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <code
          style={{
            fontSize: 13,
            fontWeight: 600,
            fontFamily: "'SF Mono', 'Fira Code', monospace",
            color: "var(--text-primary)",
          }}
        >
          {header}
        </code>
      </div>
      <code
        style={{
          fontSize: 12,
          fontFamily: "'SF Mono', 'Fira Code', monospace",
          color: "var(--accent)",
        }}
      >
        {value}
      </code>
      <p className="text-xs" style={{ color: "var(--text-muted)", marginTop: 6, marginBottom: 0 }}>
        {description}
      </p>
    </div>
  );
}

function LangTabs({ active, onChange }: { active: Lang; onChange: (l: Lang) => void }) {
  const tabs: { key: Lang; label: string }[] = [
    { key: "curl", label: "cURL" },
    { key: "node", label: "Node.js / TypeScript" },
    { key: "python", label: "Python" },
  ];

  return (
    <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
      {tabs.map((t) => {
        const isActive = active === t.key;
        return (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            style={{
              padding: "5px 14px",
              fontSize: 13,
              fontWeight: isActive ? 600 : 400,
              color: isActive ? "var(--accent)" : "var(--text-muted)",
              background: isActive ? "var(--accent-subtle)" : "transparent",
              border: "none",
              borderRadius: "var(--radius-md)",
              cursor: "pointer",
              transition: "all var(--transition-fast)",
            }}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
