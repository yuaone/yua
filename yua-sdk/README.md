# @yua/sdk

Official Node.js / TypeScript SDK for [YUA AI](https://yuaone.com). YUA AI Node.js / TypeScript SDK.

## Installation

```bash
npm install @yua/sdk
```

## Quick Start

```typescript
import YUA from "@yua/sdk";

const client = new YUA({ apiKey: "yua_sk_..." });

// Streaming
const stream = await client.chat.completions.create({
  model: "yua-normal",
  messages: [{ role: "user", content: "Hello!" }],
  stream: true,
});

for await (const chunk of stream) {
  const text = chunk.choices[0]?.delta?.content;
  if (text) process.stdout.write(text);
}
```

## Non-Streaming

```typescript
const response = await client.chat.completions.create({
  model: "yua-normal",
  messages: [{ role: "user", content: "What is 2+2?" }],
});

console.log(response.choices[0].message.content);
```

## Models

| Model | Description |
|-------|-------------|
| `yua-fast` | Fast responses, single segment |
| `yua-normal` | Balanced speed and quality (default) |
| `yua-deep` | Deep reasoning with multi-step thinking |

## Configuration

```typescript
const client = new YUA({
  apiKey: "yua_sk_...",       // Required (or authProvider)
  baseURL: "https://...",     // Default: https://api.yuaone.com
  workspace: "ws_...",        // Optional workspace ID
  timeout: 30000,             // Request timeout in ms (default: 30s)
  maxRetries: 2,              // Auto-retry count (default: 2)
});
```

### Custom Auth Provider (instead of API key)

```typescript
const client = new YUA({
  authProvider: async () => {
    // Return a valid ID token from your auth system
    const token = await getIdToken();
    return token;
  },
});
```

## Streaming with YUA Events

YUA streams include extended events beyond standard text chunks: thinking activities, reasoning blocks, suggestions, and more.

```typescript
const stream = await client.chat.completions.create({
  model: "yua-deep",
  messages: [{ role: "user", content: "Explain quantum computing" }],
  stream: true,
});

for await (const chunk of stream) {
  // Standard text content
  const text = chunk.choices[0]?.delta?.content;
  if (text) process.stdout.write(text);

  // YUA-specific events
  if (chunk.yua_event) {
    switch (chunk.yua_event.type) {
      case "activity":
        console.log("[Activity]", chunk.yua_event.data.activity);
        break;
      case "reasoning_block":
        console.log("[Reasoning]", chunk.yua_event.data.block);
        break;
      case "suggestion":
        console.log("[Suggestions]", chunk.yua_event.data.suggestions);
        break;
      case "stage":
        console.log("[Stage]", chunk.yua_event.data.stage);
        break;
    }
  }
}
```

### Stream Helper Methods

```typescript
const stream = await client.chat.completions.create({ ... , stream: true });

// Get full text after stream completes
const fullText = await stream.textContent();

// Get the final assembled message
const message = await stream.finalMessage();
```

## Thread Management

```typescript
// Create thread
const thread = await client.chat.threads.create();

// List threads
const threads = await client.chat.threads.list();

// Send message to specific thread
const stream = await client.chat.completions.create({
  model: "yua-normal",
  messages: [{ role: "user", content: "Continue our discussion" }],
  stream: true,
  yua_options: { thread_id: thread.id },
});

// Update thread title
await client.chat.threads.update(thread.id, { title: "My Chat" });

// Delete thread
await client.chat.threads.del(thread.id);
```

## Messages

```typescript
// List messages in a thread
const messages = await client.chat.messages.list(threadId);

// Send a message without streaming
await client.chat.messages.create(threadId, {
  role: "user",
  content: "Hello",
});
```

## Error Handling

```typescript
import { APIError, AuthenticationError, RateLimitError } from "@yua/sdk";

try {
  const res = await client.chat.completions.create({ ... });
} catch (err) {
  if (err instanceof AuthenticationError) {
    console.error("Invalid API key");
  } else if (err instanceof RateLimitError) {
    console.error("Rate limited, retry later");
  } else if (err instanceof APIError) {
    console.error(err.status, err.code, err.message);
  }
}
```

## TypeScript Types

All types are fully exported:

```typescript
import type {
  ChatCompletion,
  ChatCompletionChunk,
  ChatCompletionCreateParams,
  YuaStreamEvent,
  ActivityItem,
  ReasoningBlock,
  SuggestionItem,
} from "@yua/sdk";
```

## Extensibility

### Stream Event Listeners

Use `.on()` for granular event handling during streaming:

```typescript
const stream = await client.chat.completions.create({
  model: "yua-deep",
  messages: [{ role: "user", content: "Analyze this" }],
  stream: true,
});

stream
  .on("stage", (stage) => console.log(`[Stage] ${stage}`))
  .on("activity", ({ op, item }) => console.log(`[${op}] ${item.title}`))
  .on("reasoning_block", (block) => console.log(`[Think] ${block.title}`))
  .on("suggestion", (items) => console.log("Suggestions:", items))
  .on("memory", (payload) => console.log(`[Memory] ${payload.op}`))
  .on("done", () => console.log("Stream complete"));

for await (const chunk of stream) {
  const text = chunk.choices[0]?.delta?.content;
  if (text) process.stdout.write(text);
}
```

### Model Selection

Choose the right model for your use case:

```typescript
// Fast: simple responses, translation, summarization
await client.chat.completions.create({ model: "yua-fast", ... });

// Normal: general purpose (default)
await client.chat.completions.create({ model: "yua-normal", ... });

// Deep: multi-step reasoning and analysis
await client.chat.completions.create({ model: "yua-deep", ... });

// Deep Expanded: extended deep reasoning with verification
await client.chat.completions.create({ model: "yua-deep-expanded", ... });

// Search: web search optimized
await client.chat.completions.create({ model: "yua-search", ... });
```

### Conversation Continuity (Threads)

Maintain context across multiple turns using threads:

```typescript
const thread = await client.chat.threads.create();

// First message
await client.chat.completions.create({
  model: "yua-normal",
  messages: [{ role: "user", content: "What is GDP?" }],
  stream: true,
  yua_options: { thread_id: thread.id },
});

// Follow-up in same thread — server retains full context
await client.chat.completions.create({
  model: "yua-normal",
  messages: [{ role: "user", content: "Compare Korea and Japan" }],
  stream: true,
  yua_options: { thread_id: thread.id },
});
```

### Workspace Isolation

Scope API calls to a specific workspace for team/project separation:

```typescript
const client = new YUA({
  apiKey: "yua_sk_...",
  workspace: "ws_team_abc",
});
// All requests are scoped to this workspace
```

### Aggregated Extension Data

After streaming completes, access all collected YUA extension data:

```typescript
const stream = await client.chat.completions.create({ ..., stream: true });
const message = await stream.finalMessage();

console.log(message.yua?.activities);        // Full thinking timeline
console.log(message.yua?.suggestions);       // Follow-up suggestions
console.log(message.yua?.reasoning_blocks);  // Deep reasoning blocks
console.log(message.yua?.memory_ops);        // Memory operations
```

### Stream Abort

Cancel an in-progress stream:

```typescript
const stream = await client.chat.completions.create({ ..., stream: true });

setTimeout(() => stream.abort(), 5000); // Cancel after 5s

for await (const chunk of stream) {
  // Will stop when aborted
}
```

## Embeddings

Convert text into high-dimensional vectors for search, similarity comparison, classification, and RAG.

### Basic Usage

```typescript
const result = await client.embeddings.create({
  model: "yua-embed-small",
  input: "삼성전자 주가 분석",
});

console.log(result.data[0].embedding); // number[1536]
console.log(result.usage.total_tokens); // 6
```

### Batch Embedding

```typescript
const result = await client.embeddings.create({
  model: "yua-embed-small",
  input: [
    "삼성전자 주가 분석",
    "애플 실적 전망",
    "테슬라 자율주행 기술",
  ],
});

result.data[0].embedding; // first text vector
result.data[1].embedding; // second text vector
result.data[2].embedding; // third text vector
```

### Dimension Control

```typescript
// Reduce dimensions for cost/speed optimization
const result = await client.embeddings.create({
  model: "yua-embed-small",
  input: "텍스트",
  dimensions: 512, // default 1536 → reduced to 512
});
```

### Cosine Similarity (built-in utility)

```typescript
import { cosineSimilarity } from "@yua/sdk";

const a = result.data[0].embedding;
const b = result.data[1].embedding;

const sim = cosineSimilarity(a, b);
// 1.0 = identical, 0.0 = unrelated, -1.0 = opposite
```

### Embedding Models

| Model | Dimensions | Max Tokens | Use Case |
|-------|-----------|------------|----------|
| `yua-embed-small` | 1536 | 8192 | General purpose (search, RAG, memory) |
| `yua-embed-large` | 3072 | 8192 | High precision (legal, medical, finance) |

### Response Type

```typescript
interface EmbeddingResponse {
  object: "list";
  model: string;
  data: EmbeddingObject[];
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

interface EmbeddingObject {
  object: "embedding";
  index: number;
  embedding: number[]; // float vector
}
```

### OpenAI Compatible

Drop-in replacement — works with existing OpenAI SDK:

```typescript
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: "yua_sk_...",
  baseURL: "https://api.yuaone.com/api/v1",
});

const res = await client.embeddings.create({
  model: "yua-embed-small",
  input: "텍스트",
});
```

## TypeScript Types

All types are fully exported:

```typescript
import type {
  // Chat
  ChatCompletion,
  ChatCompletionChunk,
  ChatCompletionCreateParams,
  YuaStreamEvent,
  ActivityItem,
  ReasoningBlock,
  SuggestionItem,
  // Embedding
  EmbeddingResponse,
  EmbeddingObject,
  EmbeddingCreateParams,
  EmbeddingModel,
  // Memory
  MemoryPayload,
  MemoryScope,
  MemoryOp,
} from "@yua/sdk";
```

## License

MIT
