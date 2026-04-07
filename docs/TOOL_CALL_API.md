# YUA Tool Call API

YUA supports tool calling (function calling) natively. Models can invoke external tools during generation and use the results to produce more accurate responses.

This document covers the full API specification: tool definitions, request/response formats, error handling, and integration examples.

## Overview

```
User query → Model reasons (<think>) → Tool call → Execute → Result → Model responds
```

- Tools are defined as JSON Schema objects (OpenAI-compatible)
- Model outputs `<tool_call>` blocks when it needs to use a tool
- Results are returned as `<tool_response>` blocks
- The model can chain multiple tool calls across turns
- Parameter validation happens before execution

## Tool Definition

Each tool is defined with a standard JSON Schema:

```json
{
  "type": "function",
  "function": {
    "name": "web_search",
    "description": "Search the web using DuckDuckGo",
    "parameters": {
      "type": "object",
      "properties": {
        "query": {
          "type": "string",
          "description": "Search query"
        },
        "max_results": {
          "type": "integer",
          "description": "Number of results",
          "default": 5
        }
      },
      "required": ["query"]
    }
  }
}
```

Tools are passed in the system prompt inside a `<tools>` block or via the `tools` parameter in the API.

## Built-in Tools

YUA ships with 16 tools across 5 categories:

### Search
| Tool | Description | Approval |
|------|------------|----------|
| `web_search` | DuckDuckGo web search | No |
| `url_fetch` | Fetch and extract text from a URL | No |
| `http_request` | HTTP GET/POST/PUT/DELETE | Yes |

### Compute
| Tool | Description | Approval |
|------|------------|----------|
| `calculator` | Evaluate arithmetic expressions (+, -, *, /, **) | No |
| `calculate` | Math expressions with math library (sqrt, log, pi, etc.) | No |
| `execute` | Run Python code in a sandbox | Yes |
| `pytest` | Run pytest on a test file | Yes |

### Files
| Tool | Description | Approval |
|------|------------|----------|
| `file_read` | Read a file | No |
| `file_write` | Write to a file | Yes |
| `pdf_read` | Extract text from PDF | No |
| `json_parse` | Parse JSON and extract key paths | No |
| `grep_search` | Search files with regex | No |

### System
| Tool | Description | Approval |
|------|------------|----------|
| `shell` | Run a constrained shell command | Yes |
| `git_ops` | Git operations (status, log, diff, etc.) | Read: No, Write: Yes |
| `datetime` | Get current date/time | No |
| `unit_convert` | Convert between units | No |

## Request Format

### Chat Completions API

```bash
curl -X POST http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "yua-9.45b-moe",
    "messages": [
      {"role": "system", "content": "You are YUA, a helpful AI assistant."},
      {"role": "user", "content": "What is the square root of 144?"}
    ],
    "tools": [
      {
        "type": "function",
        "function": {
          "name": "calculator",
          "description": "Evaluate arithmetic expressions",
          "parameters": {
            "type": "object",
            "properties": {
              "expression": {"type": "string", "description": "Math expression"}
            },
            "required": ["expression"]
          }
        }
      }
    ],
    "tool_choice": "auto",
    "temperature": 0.7,
    "max_tokens": 512
  }'
```

### Parameters

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `model` | string | required | Model identifier |
| `messages` | array | required | Conversation history |
| `tools` | array | `[]` | Tool definitions (JSON Schema) |
| `tool_choice` | string | `"auto"` | `"auto"`, `"none"`, `"required"`, or `{"type": "function", "function": {"name": "..."}}` |
| `temperature` | float | `0.7` | Sampling temperature |
| `max_tokens` | int | `512` | Max tokens per generation |
| `parallel_tool_calls` | bool | `true` | Allow multiple tool calls in one turn |

## Response Format

### When the model calls a tool

```json
{
  "id": "chatcmpl-abc123",
  "model": "yua-9.45b-moe",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Let me calculate that for you.",
        "tool_calls": [
          {
            "id": "call_0001",
            "type": "function",
            "function": {
              "name": "calculate",
              "arguments": "{\"expression\": \"sqrt(144)\"}"
            }
          }
        ]
      },
      "finish_reason": "tool_calls"
    }
  ],
  "usage": {
    "prompt_tokens": 52,
    "completion_tokens": 18,
    "total_tokens": 70
  }
}
```

### When the model responds directly (no tool call)

```json
{
  "id": "chatcmpl-abc124",
  "model": "yua-9.45b-moe",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Hello! How can I help you today?"
      },
      "finish_reason": "stop"
    }
  ]
}
```

### Sending tool results back

After executing the tool, send the result as a `tool` message:

```bash
curl -X POST http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "yua-9.45b-moe",
    "messages": [
      {"role": "system", "content": "You are YUA."},
      {"role": "user", "content": "What is the square root of 144?"},
      {"role": "assistant", "content": "Let me calculate that.", "tool_calls": [
        {"id": "call_0001", "type": "function", "function": {"name": "calculate", "arguments": "{\"expression\": \"sqrt(144)\"}"}}
      ]},
      {"role": "tool", "tool_call_id": "call_0001", "content": "{\"status\": \"success\", \"output\": \"12.0\", \"duration_ms\": 0.3}"}
    ],
    "tools": [...]
  }'
```

Final response:

```json
{
  "choices": [
    {
      "message": {
        "role": "assistant",
        "content": "The square root of 144 is 12."
      },
      "finish_reason": "stop"
    }
  ]
}
```

## Tool Result Schema

### Success

```json
{
  "id": "call_0001",
  "name": "calculator",
  "status": "success",
  "output": "12.0",
  "duration_ms": 0.3
}
```

### Error

```json
{
  "id": "call_0001",
  "name": "calculator",
  "status": "error",
  "error": {
    "type": "invalid_params",
    "message": "missing required parameter: expression"
  },
  "duration_ms": 0.0
}
```

### Error Types

| Type | Description | Retryable |
|------|-------------|-----------|
| `invalid_json` | Model output was not valid JSON | Yes (model should fix syntax) |
| `unknown_tool` | Tool name not in registry | Yes (model should pick valid tool) |
| `invalid_params` | Parameter validation failed | Yes (model should fix params) |
| `timeout` | Execution exceeded time limit | Maybe |
| `execution_error` | Handler raised an exception | Depends on error |
| `pending_approval` | Tool requires user approval | Wait for approval |
| `permission_denied` | Tool category blocked | No |

## Native Format (ChatML)

When running locally without an API server, YUA uses ChatML with XML-style delimiters:

```
<|im_start|>system
You are YUA, a helpful AI assistant.
<tools>
[{"type": "function", "function": {"name": "web_search", ...}}]
</tools>
<|im_end|>
<|im_start|>user
Search for recent news about AI<|im_end|>
<|im_start|>assistant
<think>The user wants recent AI news. I should search the web.</think>
<tool_call>
{"name": "web_search", "arguments": {"query": "AI news 2026", "max_results": 3}}
</tool_call><|im_end|>
<|im_start|>tool
<tool_response>
{"id": "call_0001", "name": "web_search", "status": "success", "output": "1. OpenAI releases GPT-5...", "duration_ms": 820.5}
</tool_response><|im_end|>
<|im_start|>assistant
Here are the latest AI news stories:
1. OpenAI releases GPT-5...
<|im_end|>
```

Key tokens:
- `<tools>` / `</tools>` — tool definitions in system prompt
- `<tool_call>` / `</tool_call>` — model requesting a tool
- `<tool_response>` / `</tool_response>` — execution result
- `<think>` / `</think>` — model reasoning (optional, before tool call)

## Parallel Tool Calls

The model can call multiple tools in a single turn:

```
<|im_start|>assistant
<think>I need both the weather and the time.</think>
<tool_call>
{"name": "web_search", "arguments": {"query": "Seoul weather today"}}
</tool_call>
<tool_call>
{"name": "datetime", "arguments": {"timezone": "Asia/Seoul"}}
</tool_call><|im_end|>
<|im_start|>tool
<tool_response>
{"id": "call_0001", "name": "web_search", "status": "success", "output": "Seoul: 22°C, sunny"}
</tool_response>
<tool_response>
{"id": "call_0002", "name": "datetime", "status": "success", "output": "2026-04-07 19:30:00 KST"}
</tool_response><|im_end|>
```

## Parameter Validation

All parameters are validated against the JSON Schema before execution:

- **Required fields**: Missing required parameters return `invalid_params`
- **Type checking**: String, number, integer, boolean, array, object
- **Enum validation**: Values outside allowed set are rejected
- **Strict mode**: Unknown parameters are rejected when `additionalProperties: false`

The model receives the error and can retry with corrected parameters.

## Python Integration

```python
from src.runtime.tools.executor import create_default_registry, ToolExecutor

# Create registry with all 16 tools
registry = create_default_registry()

# Print available tools (OpenAI format)
print(registry.list_tools())

# Create executor
executor = ToolExecutor(registry)

# Parse and execute from model output
model_output = '''<tool_call>
{"name": "calculator", "arguments": {"expression": "2+3"}}
</tool_call>'''

trace = executor.execute_all(model_output, approved=True)

# Get results as <tool_response> blocks
print(executor.format_results(trace))

# Or as OpenAI-compatible messages
print(executor.format_results_openai(trace))
```

## Adding Custom Tools

```python
from src.runtime.tools.executor import ToolDef, FunctionDef, ToolCategory

registry.register(ToolDef(
    function=FunctionDef(
        name="translate",
        description="Translate text between languages",
        parameters={
            "type": "object",
            "properties": {
                "text": {"type": "string", "description": "Text to translate"},
                "target_lang": {
                    "type": "string",
                    "description": "Target language code",
                    "enum": ["ko", "en", "ja", "zh"]
                },
            },
            "required": ["text", "target_lang"],
        },
    ),
    handler=my_translate_function,
    category=ToolCategory.INTERACTIVE,
))
```

## Security Model

Tools are classified into 4 safety categories:

| Category | Description | Approval |
|----------|-------------|----------|
| `read_only` | No side effects (search, read, calculate) | Not required |
| `interactive` | Network access, external queries | Configurable |
| `sandboxed_exec` | Code execution in sandbox | Required |
| `dangerous` | File write, shell, destructive ops | Required |

Tools marked `requires_approval: true` return `pending_approval` error until explicitly approved.

## Compatibility

| Feature | OpenAI | Claude | YUA |
|---------|--------|--------|-----|
| Tool definition schema | JSON Schema | JSON Schema (`input_schema`) | JSON Schema |
| Structured outputs | `strict: true` | Beta | Planned (XGrammar) |
| Parallel calls | Yes | Yes | Yes |
| Text + tool in same turn | No | Yes | Yes |
| Reasoning before call | No | No | Yes (`<think>`) |
| Error feedback to model | Yes | Yes (`is_error`) | Yes (structured) |
| Parameter validation | Server-side | Server-side | Pre-execution |

## License

Apache 2.0
