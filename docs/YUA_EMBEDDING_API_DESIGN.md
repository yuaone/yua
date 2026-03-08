# YUA Embedding API — SDK 설계문서

> 작성: 2026-03-08
> 상태: 설계 완료, 구현 대기

---

## 1. 개요

텍스트를 고차원 벡터로 변환하는 Embedding API.
검색, 분류, 추천, 유사도 비교, RAG, 메모리 시스템 등에 사용.

**비즈니스 모델**: 호출당 토큰 과금 (OpenAI와 동일 구조)
- 모델 1회 학습 → inference만 반복 → 한계비용 거의 0
- API 호출 1건당 과금 = 사실상 순이익

---

## 2. SDK 인터페이스

### 2.1 Basic Usage

```typescript
import YUA from "@yua/sdk";

const client = new YUA({ apiKey: "yua_sk_..." });

// 단일 텍스트
const result = await client.embeddings.create({
  model: "yua-embed-small",
  input: "삼성전자 주가 분석",
});

console.log(result.data[0].embedding); // number[1536]
console.log(result.usage.total_tokens); // 6
```

### 2.2 Batch Embedding

```typescript
// 다건 (최대 2048개)
const result = await client.embeddings.create({
  model: "yua-embed-small",
  input: [
    "삼성전자 주가 분석",
    "애플 실적 전망",
    "테슬라 자율주행 기술",
  ],
});

// result.data[0].embedding → 첫번째 텍스트 벡터
// result.data[1].embedding → 두번째 텍스트 벡터
// result.data[2].embedding → 세번째 텍스트 벡터
```

### 2.3 Dimension Control

```typescript
// 차원 축소 (비용 절감 + 속도 향상)
const result = await client.embeddings.create({
  model: "yua-embed-small",
  input: "텍스트",
  dimensions: 512, // 기본 1536 → 512로 축소
});
```

### 2.4 Similarity Helper (SDK 내장)

```typescript
import { cosineSimilarity } from "@yua/sdk";

const a = result.data[0].embedding;
const b = result.data[1].embedding;

const sim = cosineSimilarity(a, b); // 0.0 ~ 1.0
```

---

## 3. API Spec

### 3.1 Request

```
POST /v1/embeddings
Authorization: Bearer yua_sk_...
Content-Type: application/json
```

```json
{
  "model": "yua-embed-small",
  "input": "텍스트" | ["텍스트1", "텍스트2", ...],
  "dimensions": 1536,
  "encoding_format": "float"
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `model` | string | Y | 모델 ID |
| `input` | string \| string[] | Y | 입력 텍스트 (최대 8192 tokens/건, 최대 2048건) |
| `dimensions` | number | N | 출력 차원 (기본값: 모델별 상이) |
| `encoding_format` | string | N | `"float"` (기본) \| `"base64"` |

### 3.2 Response

```json
{
  "object": "list",
  "model": "yua-embed-small",
  "data": [
    {
      "object": "embedding",
      "index": 0,
      "embedding": [0.0023, -0.0091, ..., 0.0041]
    }
  ],
  "usage": {
    "prompt_tokens": 6,
    "total_tokens": 6
  }
}
```

### 3.3 OpenAI 호환

**100% OpenAI `/v1/embeddings` 호환** — drop-in replacement 가능.
기존 OpenAI 유저가 `baseURL`만 바꾸면 됨:

```typescript
// OpenAI SDK로도 호출 가능
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: "yua_sk_...",
  baseURL: "https://api.yuaone.com/v1",
});

const res = await client.embeddings.create({
  model: "yua-embed-small",
  input: "텍스트",
});
```

---

## 4. 모델 라인업

| Model | Dimensions | Max Tokens | 특성 | 가격 (1M tokens) |
|-------|-----------|------------|------|-----------------|
| `yua-embed-nano` | 384 | 512 | 초경량, 분류/필터 전용 | $0.005 |
| `yua-embed-small` | 1536 | 8192 | 범용 (검색, RAG, 메모리) | $0.02 |
| `yua-embed-large` | 3072 | 8192 | 고정밀 (법률, 의료, 금융) | $0.13 |
| `yua-embed-kr` | 1536 | 8192 | 한국어 특화 | $0.03 |

### 4.1 모델 전략

**Phase 1 (당장)**: OpenAI proxy
- `yua-embed-small` → 내부적으로 `text-embedding-3-small` 호출
- 마진: 20~40% 마크업
- 장점: 즉시 출시 가능, 품질 보장

**Phase 2 (3~6개월)**: 자체 모델 도입
- 오픈소스 기반 fine-tune (BAAI/bge-m3, Cohere embed-v3 급)
- 한국어 특화 모델 (`yua-embed-kr`)
- GPU 인프라: A100 x 4 (inference 전용)
- 마진: 80%+ (inference 비용 $0.002~0.005/1M tokens)

**Phase 3 (6~12개월)**: 멀티모달
- `yua-embed-vision`: 이미지 → 벡터
- `yua-embed-code`: 코드 → 벡터
- `yua-embed-multi`: 텍스트+이미지 혼합

---

## 5. 백엔드 아키텍처

### 5.1 라우팅

```
POST /v1/embeddings
  → API Key 인증 (credit 차감)
  → Rate Limit (plan별)
  → Model Router
    ├─ yua-embed-nano  → 자체 모델 (ONNX Runtime)
    ├─ yua-embed-small → OpenAI proxy (Phase 1) / 자체 모델 (Phase 2)
    ├─ yua-embed-large → OpenAI proxy (Phase 1) / 자체 모델 (Phase 2)
    └─ yua-embed-kr    → 자체 한국어 모델 (Phase 2)
  → Response 정규화 (OpenAI 포맷)
  → Usage Logging
```

### 5.2 라우터 구현

```typescript
// src/routes/v1-embeddings-router.ts

router.post("/v1/embeddings", requireApiKey, creditCheck, async (req, res) => {
  const { model, input, dimensions, encoding_format } = req.body;

  // 입력 정규화
  const texts = Array.isArray(input) ? input : [input];

  if (texts.length > 2048) {
    return res.status(400).json({ error: "max_batch_exceeded" });
  }

  // 토큰 카운트 (사전 체크)
  const totalTokens = countTokens(texts);
  if (totalTokens > texts.length * 8192) {
    return res.status(400).json({ error: "token_limit_exceeded" });
  }

  // 모델 라우팅
  const provider = resolveEmbeddingProvider(model);
  const result = await provider.embed(texts, { dimensions });

  // Credit 차감
  await deductCredits(req.apiKey, totalTokens, model);

  // 응답
  res.json({
    object: "list",
    model,
    data: result.vectors.map((vec, i) => ({
      object: "embedding",
      index: i,
      embedding: encoding_format === "base64"
        ? Buffer.from(new Float32Array(vec).buffer).toString("base64")
        : vec,
    })),
    usage: {
      prompt_tokens: totalTokens,
      total_tokens: totalTokens,
    },
  });
});
```

### 5.3 Provider 추상화

```typescript
// src/ai/embedding/embedding-provider.ts

interface EmbeddingProvider {
  model: string;
  maxBatch: number;
  maxTokens: number;
  defaultDim: number;
  embed(texts: string[], opts?: { dimensions?: number }): Promise<{
    vectors: number[][];
    tokens: number;
  }>;
}

// Phase 1: OpenAI Proxy
class OpenAIEmbeddingProvider implements EmbeddingProvider {
  model = "text-embedding-3-small";
  maxBatch = 2048;
  maxTokens = 8192;
  defaultDim = 1536;

  async embed(texts, opts) {
    const res = await openai.embeddings.create({
      model: this.model,
      input: texts,
      dimensions: opts?.dimensions,
    });
    return {
      vectors: res.data.map(d => d.embedding),
      tokens: res.usage.total_tokens,
    };
  }
}

// Phase 2: 자체 모델 (ONNX Runtime)
class LocalEmbeddingProvider implements EmbeddingProvider {
  model = "yua-embed-kr-v1";
  maxBatch = 512;
  maxTokens = 8192;
  defaultDim = 1536;

  async embed(texts, opts) {
    // ONNX Runtime inference
    const session = await ort.InferenceSession.create("./models/embed-kr-v1.onnx");
    const tokenized = this.tokenize(texts);
    const output = await session.run(tokenized);
    return {
      vectors: this.extractVectors(output, opts?.dimensions),
      tokens: this.countTokens(texts),
    };
  }
}
```

---

## 6. 과금 설계

### 6.1 Credit 체계

```
1 credit = 1,000 tokens

yua-embed-nano:  0.005 credits / 1K tokens
yua-embed-small: 0.02 credits / 1K tokens
yua-embed-large: 0.13 credits / 1K tokens
yua-embed-kr:    0.03 credits / 1K tokens
```

### 6.2 Plan별 한도

| Plan | 월 무료 tokens | Rate Limit |
|------|---------------|------------|
| Free | 100K | 10 req/min |
| Premium | 1M | 60 req/min |
| Developer | 10M | 300 req/min |
| Business | 100M | 1000 req/min |
| Enterprise | Unlimited | Custom |

### 6.3 Usage Tracking

```sql
-- embedding_usage_logs 테이블
CREATE TABLE embedding_usage_logs (
  id BIGSERIAL PRIMARY KEY,
  api_key_id BIGINT NOT NULL,
  workspace_id UUID NOT NULL,
  model VARCHAR(32) NOT NULL,
  input_count INT NOT NULL,        -- 배치 내 텍스트 수
  total_tokens INT NOT NULL,
  dimensions INT NOT NULL,
  latency_ms INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_embed_usage_key ON embedding_usage_logs (api_key_id, created_at DESC);
CREATE INDEX idx_embed_usage_ws ON embedding_usage_logs (workspace_id, created_at DESC);
```

---

## 7. 성능 최적화

### 7.1 캐싱

```typescript
// 동일 텍스트 반복 호출 방지 — Redis 캐시
const cacheKey = `embed:${model}:${sha256(text)}:${dimensions}`;
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);

const result = await provider.embed([text], { dimensions });
await redis.setex(cacheKey, 86400, JSON.stringify(result.vectors[0])); // 24h TTL
```

**캐시 적중률 예상**: 30~50% (같은 유저가 같은 질문 반복, 메모리 dedup 비교 시)

### 7.2 Batch Queue

```
요청 → Batch Queue (50ms window)
         ↓
  여러 요청의 텍스트를 하나의 API call로 병합
         ↓
  결과를 각 요청에 분배
```

단일 호출 1건 vs 배치 50건 → latency 거의 동일, 비용 동일.
Queue window 50ms 내 도착한 요청을 자동 병합.

### 7.3 Dimension Truncation (Matryoshka)

`text-embedding-3-small`과 자체 모델 모두 Matryoshka 학습 지원:
- 1536 → 512로 truncate해도 성능 95% 유지
- 저장 공간 3x 절약, 검색 속도 2x 향상
- SDK에서 `dimensions` 파라미터로 제어

---

## 8. 자체 모델 학습 (Phase 2)

### 8.1 Base Model 선정

| 후보 | 차원 | 한국어 | MTEB Score | License |
|------|------|--------|------------|---------|
| BAAI/bge-m3 | 1024 | O | 64.5 | MIT |
| intfloat/multilingual-e5-large | 1024 | O | 63.2 | MIT |
| Cohere embed-v3 (참고) | 1024 | O | 66.0 | 상용 |

### 8.2 Fine-tune 전략

```
Phase 2-1: 한국어 도메인 adaptation
  - 데이터: YUA 대화 로그 (익명화) + 한국어 Wikipedia + 뉴스
  - 학습: Contrastive Learning (positive/negative pairs)
  - 목표: 한국어 유사도 정확도 +10%

Phase 2-2: 도메인 특화
  - 금융 (주식, 경제 용어)
  - 코딩 (함수명, 변수명, 주석)
  - 일상 대화 (줄임말, 신조어)

Phase 2-3: Matryoshka 학습
  - 384 / 512 / 768 / 1024 / 1536 차원 동시 지원
  - 하나의 모델로 모든 차원 커버
```

### 8.3 인프라 비용

```
학습:   A100 x 4, 72시간 = ~$3,000 (1회)
추론:   A100 x 1 = ~$2,000/월
처리량: ~5,000 req/sec (배치 기준)
비용:   ~$0.002/1M tokens (전기+GPU)
마진:   $0.02 판매 - $0.002 원가 = 90% 마진
```

---

## 9. SDK 구현 계획

### 9.1 파일 구조

```
yua-sdk/src/
  resources/
    embeddings.ts          ← NEW: Embedding API resource
  types/
    embedding.ts           ← NEW: Embedding types
```

### 9.2 Type 정의

```typescript
// types/embedding.ts

export interface EmbeddingCreateParams {
  model: EmbeddingModel;
  input: string | string[];
  dimensions?: number;
  encoding_format?: "float" | "base64";
}

export type EmbeddingModel =
  | "yua-embed-nano"
  | "yua-embed-small"
  | "yua-embed-large"
  | "yua-embed-kr";

export interface EmbeddingObject {
  object: "embedding";
  index: number;
  embedding: number[];
}

export interface EmbeddingResponse {
  object: "list";
  model: string;
  data: EmbeddingObject[];
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}
```

### 9.3 Resource 구현

```typescript
// resources/embeddings.ts

export class Embeddings {
  constructor(private client: APIClient) {}

  async create(params: EmbeddingCreateParams): Promise<EmbeddingResponse> {
    return this.client.post("/v1/embeddings", params);
  }
}
```

### 9.4 Client 확장

```typescript
// yua.ts (기존 파일에 추가)

class YUA {
  chat: Chat;
  embeddings: Embeddings; // ← NEW

  constructor(opts: YuaConfig) {
    const client = new APIClient(opts);
    this.chat = new Chat(client);
    this.embeddings = new Embeddings(client); // ← NEW
  }
}
```

---

## 10. 수익 시뮬레이션

### 10.1 Phase 1 (OpenAI Proxy, 마크업 30%)

```
MAU 1,000 → 월 ~50M tokens → 매출 $1,000 / 원가 $700 / 이익 $300
MAU 10,000 → 월 ~500M tokens → 매출 $10,000 / 원가 $7,000 / 이익 $3,000
```

### 10.2 Phase 2 (자체 모델, 마진 90%)

```
MAU 1,000 → 월 ~50M tokens → 매출 $1,000 / 원가 $100 / 이익 $900
MAU 10,000 → 월 ~500M tokens → 매출 $10,000 / 원가 $1,000 / 이익 $9,000
MAU 100,000 → 월 ~5B tokens → 매출 $100,000 / 원가 $10,000 / 이익 $90,000
```

인프라 고정비(GPU $2,000/월) 포함해도 MAU 3,000 이상이면 자체 모델이 이득.

---

## 11. 구현 우선순위

| 순서 | 작업 | 예상 기간 | 의존성 |
|------|------|----------|--------|
| 1 | SDK types + resource 추가 | 1일 | 없음 |
| 2 | `/v1/embeddings` 라우터 (OpenAI proxy) | 2일 | API Key 시스템 |
| 3 | Credit 차감 + Usage 로깅 | 1일 | billing 테이블 |
| 4 | Redis 캐싱 | 0.5일 | 없음 |
| 5 | Rate limiting (plan별) | 0.5일 | billing plan |
| 6 | 한국어 모델 fine-tune | 2~4주 | GPU 인프라 |
| 7 | ONNX 추론 서버 배포 | 1주 | 모델 완성 |
| 8 | Batch queue 최적화 | 3일 | 트래픽 규모 |

**Phase 1 (OpenAI Proxy) MVP: 5일이면 출시 가능.**
