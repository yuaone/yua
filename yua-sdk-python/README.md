# yua

Official Python SDK for [YUA AI](https://yuaone.com). YUA AI Python SDK.

## Installation

```bash
pip install yua
```

## Quick Start

```python
from yua import YUA

client = YUA(api_key="yua_sk_...")

# Streaming
stream = client.chat.completions.create(
    model="yua-normal",
    messages=[{"role": "user", "content": "Hello!"}],
    stream=True,
)

for chunk in stream:
    text = chunk.choices[0].delta.content
    if text:
        print(text, end="", flush=True)
```

## Non-Streaming

```python
response = client.chat.completions.create(
    model="yua-normal",
    messages=[{"role": "user", "content": "What is 2+2?"}],
)

print(response.choices[0].message.content)
```

## Models

| Model | Description |
|-------|-------------|
| `yua-fast` | Fast responses, single segment |
| `yua-normal` | Balanced speed and quality (default) |
| `yua-deep` | Deep reasoning with multi-step thinking |

## Configuration

```python
client = YUA(
    api_key="yua_sk_...",           # Required (or auth_provider)
    base_url="https://...",         # Default: https://api.yuaone.com
    workspace="ws_...",             # Optional workspace ID
    timeout=30.0,                   # Request timeout in seconds (default: 30)
    max_retries=2,                  # Auto-retry count (default: 2)
)
```

### Context Manager

```python
with YUA(api_key="yua_sk_...") as client:
    stream = client.chat.completions.create(...)
    for chunk in stream:
        ...
# Connection automatically closed
```

### Custom Auth Provider

```python
client = YUA(
    auth_provider=lambda: get_id_token(),
)
```

## Streaming with YUA Events

YUA streams include extended events beyond standard text chunks.

```python
stream = client.chat.completions.create(
    model="yua-deep",
    messages=[{"role": "user", "content": "Explain quantum computing"}],
    stream=True,
    thinking_profile="DEEP",
)

for chunk in stream:
    # Standard text content
    text = chunk.choices[0].delta.content
    if text:
        print(text, end="", flush=True)

    # YUA-specific events
    if chunk.yua_event:
        if chunk.yua_event.type == "activity":
            print(f"[Activity] {chunk.yua_event.data}")
        elif chunk.yua_event.type == "reasoning_block":
            print(f"[Reasoning] {chunk.yua_event.data}")
        elif chunk.yua_event.type == "suggestion":
            print(f"[Suggestions] {chunk.yua_event.data}")
```

### Stream Helper Methods

```python
stream = client.chat.completions.create(..., stream=True)

# Get full text after stream completes
full_text = stream.text_content()

# Get the final assembled message
message = stream.final_message()
```

## Thread Management

```python
# Create thread
thread = client.chat.threads.create()

# List threads
threads = client.chat.threads.list()

# Send message to specific thread
stream = client.chat.completions.create(
    model="yua-normal",
    messages=[{"role": "user", "content": "Continue our discussion"}],
    stream=True,
    thread_id=thread["threadId"],
)

# Update thread title
client.chat.threads.update(thread["threadId"], title="My Chat")

# Delete thread
client.chat.threads.delete(thread["threadId"])
```

## Messages

```python
# List messages in a thread
messages = client.chat.messages.list(thread_id=123)

# Send a message without streaming
client.chat.messages.create(
    thread_id=123,
    role="user",
    content="Hello",
)
```

## Error Handling

```python
from yua import APIError, AuthenticationError, RateLimitError

try:
    res = client.chat.completions.create(...)
except AuthenticationError:
    print("Invalid API key")
except RateLimitError:
    print("Rate limited, retry later")
except APIError as e:
    print(f"{e.status} {e.code}: {e.message}")
```

## YUA Event Types

| Event | Description |
|-------|-------------|
| `stage` | Processing stage changes (thinking, analyzing, answer) |
| `token` | Text token (mapped to `delta.content`) |
| `final` | Final assembled response (mapped to `finish_reason="stop"`) |
| `activity` | Thinking activities (analyzing, planning, researching) |
| `reasoning_block` | Deep reasoning block content |
| `reasoning_done` | Reasoning phase completed |
| `suggestion` | Follow-up suggestions |
| `memory` | Memory commit events |
| `answer_unlocked` | Deep mode: answer text begins |

## Extensibility

### Stream Event Listeners

Use `.on()` for granular event handling during streaming:

```python
stream = client.chat.completions.create(
    model="yua-deep",
    messages=[{"role": "user", "content": "Analyze this"}],
    stream=True,
)

stream.on("stage", lambda stage: print(f"[Stage] {stage}"))
stream.on("activity", lambda data: print(f"[{data['op']}] {data['item']['title']}"))
stream.on("reasoning_block", lambda block: print(f"[Think] {block['title']}"))
stream.on("suggestion", lambda items: print("Suggestions:", items))
stream.on("memory", lambda payload: print(f"[Memory] {payload['op']}"))

for chunk in stream:
    text = chunk.choices[0].delta.content
    if text:
        print(text, end="", flush=True)
```

### Model Selection

Choose the right model for your use case:

```python
# Fast: simple responses, translation, summarization
client.chat.completions.create(model="yua-fast", ...)

# Normal: general purpose (default)
client.chat.completions.create(model="yua-normal", ...)

# Deep: multi-step reasoning and analysis
client.chat.completions.create(model="yua-deep", ...)

# Search: web search optimized
client.chat.completions.create(model="yua-search", ...)
```

### Conversation Continuity (Threads)

Maintain context across multiple turns using threads:

```python
thread = client.chat.threads.create()

# First message
client.chat.completions.create(
    model="yua-normal",
    messages=[{"role": "user", "content": "What is GDP?"}],
    stream=True,
    thread_id=thread["threadId"],
)

# Follow-up in same thread — server retains full context
client.chat.completions.create(
    model="yua-normal",
    messages=[{"role": "user", "content": "Compare Korea and Japan"}],
    stream=True,
    thread_id=thread["threadId"],
)
```

### Workspace Isolation

Scope API calls to a specific workspace for team/project separation:

```python
client = YUA(
    api_key="yua_sk_...",
    workspace="ws_team_abc",
)
# All requests are scoped to this workspace
```

### Aggregated Extension Data

After streaming completes, access all collected YUA extension data:

```python
stream = client.chat.completions.create(..., stream=True)
message = stream.final_message()

print(message.yua.activities)        # Full thinking timeline
print(message.yua.suggestions)       # Follow-up suggestions
print(message.yua.reasoning_blocks)  # Deep reasoning blocks
print(message.yua.memory_ops)        # Memory operations
```

### Custom Auth Provider

Use dynamic token resolution instead of a static API key:

```python
client = YUA(
    auth_provider=lambda: get_fresh_token(),
)
# Token is resolved on each request
```

## Embeddings

Convert text into high-dimensional vectors for search, similarity comparison, classification, and RAG.

### Basic Usage

```python
result = client.embeddings.create(
    model="yua-embed-small",
    input="삼성전자 주가 분석",
)

print(result.data[0].embedding)  # list[float] (1536 dims)
print(result.usage.total_tokens)  # 6
```

### Batch Embedding

```python
result = client.embeddings.create(
    model="yua-embed-small",
    input=[
        "삼성전자 주가 분석",
        "애플 실적 전망",
        "테슬라 자율주행 기술",
    ],
)

result.data[0].embedding  # first text vector
result.data[1].embedding  # second text vector
result.data[2].embedding  # third text vector
```

### Dimension Control

```python
# Reduce dimensions for cost/speed optimization
result = client.embeddings.create(
    model="yua-embed-small",
    input="텍스트",
    dimensions=512,  # default 1536 → reduced to 512
)
```

### Embedding Models

| Model | Dimensions | Max Tokens | Use Case |
|-------|-----------|------------|----------|
| `yua-embed-small` | 1536 | 8192 | General purpose (search, RAG, memory) |
| `yua-embed-large` | 3072 | 8192 | High precision (legal, medical, finance) |

### Response Types

```python
class EmbeddingResponse:
    object: str          # "list"
    model: str           # model name
    data: list[EmbeddingObject]
    usage: EmbeddingUsage

class EmbeddingObject:
    object: str          # "embedding"
    index: int           # position in input array
    embedding: list[float]  # float vector

class EmbeddingUsage:
    prompt_tokens: int
    total_tokens: int
```

### OpenAI Compatible

Drop-in replacement — works with existing OpenAI SDK:

```python
from openai import OpenAI

client = OpenAI(
    api_key="yua_sk_...",
    base_url="https://api.yuaone.com/api/v1",
)

res = client.embeddings.create(
    model="yua-embed-small",
    input="텍스트",
)
```

## TypeScript Types

All types are fully exported:

```python
from yua import (
    # Chat
    ChatCompletion,
    ChatCompletionChunk,
    ChatCompletionChoice,
    ChatCompletionChunkChoice,
    ChatCompletionDelta,
    ChatCompletionMessage,
    ChatMessageInput,
    CompletionUsage,
    YuaExtension,
    YuaStreamEvent,
    # Embedding
    EmbeddingResponse,
    EmbeddingObject,
    EmbeddingUsage,
)
```

## Requirements

- Python >= 3.8
- httpx >= 0.24.0
- pydantic >= 2.0.0

## License

MIT
