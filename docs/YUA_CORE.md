# YUA Core — 로컬 음성 비서

클라우드 없이, GPU 없이, API 키 없이 도는 개인 비서 런타임.
`src/runtime`(도구·대화·기억)과 `src/voice`(STT·VAD·TTS)로 나뉜다.

```
마이크 ──▶ Silero VAD ──▶ Whisper ──▶ Agent ──▶ TTS ──▶ 스피커
                                        │
                                        ├─▶ 도구 16종 (계산·검색·파일·셸·git)
                                        └─▶ 기억 (JSONL, 학습 없음)
```

문장이 완성되는 즉시 TTS가 시작된다. 전체 답변을 기다리지 않으므로 체감 지연이 짧다.

---

## 0. 디스크/램이 부족하다면 — 모델을 받지 마세요

이미 설치된 공식 CLI를 구독 계정 그대로 두뇌로 빌려 씁니다. **다운로드 0바이트.**

```bash
npm i -g @zed-industries/claude-code-acp   # 한 번만
claude login                                # 한 번만

python yua_core.py --text --acp claude      # 끝
python yua_core.py --acp claude             # 음성 모드
```

`--acp gemini`, `--acp codex` 도 같습니다. 자격증명은 그 CLI가 자기 홈 디렉터리
(또는 macOS 키체인)에 들고 있고, YUA는 그것을 읽지 않습니다 — 그냥 CLI를
서브프로세스로 띄워 JSON-RPC로 대화할 뿐입니다.

환경이 되는지부터 확인하려면:

```bash
python check_env.py     # RAM·디스크·설치된 것들을 한 번에 출력
```

---

## 1. 가장 빠른 시작 (5분, 오디오 없이)

에이전트와 도구 배선부터 확인한다. 추가 패키지가 필요 없다.

```bash
# Ollama가 있다면
ollama serve & ollama pull qwen3:8b
python yua_core.py --text --base-url http://localhost:11434/v1 --model qwen3:8b

# 아무것도 없어도 배선은 확인된다 (echo 백엔드)
python yua_core.py --text
python yua_core.py --list-tools
```

## 2. 음성 모드

```bash
pip install -r requirements-core.txt
python yua_core.py --base-url http://localhost:11434/v1 --model qwen3:8b
```

GGUF를 직접 쓰려면:

```bash
python yua_core.py --gguf ~/models/qwen3-8b-q4_k_m.gguf --ctx 8192
```

첫 실행 때 Whisper와 Silero VAD 모델을 자동으로 내려받는다(합쳐서 ~250MB).

### 주요 옵션

| 옵션 | 기본값 | 설명 |
|:---|:---|:---|
| `--text` | off | 키보드 모드. 오디오 의존성 없이 테스트 |
| `--acp AGENT` | — | **설치된 CLI를 구독으로** (`claude`\|`gemini`\|`codex`). 모델 다운로드 없음 |
| `--acp-cmd` | — | ACP 에이전트 실행 명령 직접 지정 |
| `--gguf PATH` | — | GGUF 인프로세스 실행 |
| `--base-url URL` | — | OpenAI 호환 서버 (Ollama 등) |
| `--whisper SIZE` | `small` | `tiny`\|`base`\|`small`\|`medium`\|`large-v3-turbo` |
| `--lang` | `ko` | STT 언어. `auto`면 자동 감지 |
| `--tts` | `auto` | `kokoro`\|`pyttsx3`\|`say`\|`espeak` |
| `--workspace` | `~/yua-workspace` | 도구가 접근 가능한 유일한 루트 |
| `--yes` | off | 승인 질문 없이 모든 도구 허용 (주의) |

### 하드웨어별 권장

| 환경 | 모델 | Whisper |
|:---|:---|:---|
| RAM 8~16GB, CPU만 | 4B Q4 | `base` |
| Mac mini M4 24GB | 8~14B Q4, 또는 MoE 30B-A3B | `small` |
| RTX 3090/4090 24GB | 14B Q4 이상 | `large-v3-turbo` |

---

## 3. 안전 경계

로컬 비서라도 모델이 만든 텍스트를 그대로 실행하지 않는다.

- **작업공간 격리** — 모든 파일 도구는 `--workspace` 아래로 강제된다. `../../etc/passwd`는 거부된다.
- **승인 게이트** — `file_write`, `shell`, `execute`, `pytest`, `http_request`는 기본적으로 터미널에서 y/N을 묻는다. `git_ops`는 읽기 서브커맨드만 통과.
- **파괴적 명령 차단** — `rm`, `dd`, `sudo`, `mkfs`, `shutdown` 등은 `shell`에서 거부된다. 파이프·리다이렉션·체이닝도 불가(`shell=True`를 쓰지 않는다).
- **eval 없음** — 계산 도구는 AST를 직접 걸어 허용된 노드만 평가한다.

`--yes`는 신뢰하는 개인 기기에서만 쓸 것.

---

## 4. 구조

| 파일 | 역할 |
|:---|:---|
| `src/runtime/tools/` | 도구 16종 + 레지스트리. `docs/TOOL_CALL_API.md` 스펙 구현 |
| `src/runtime/chatml.py` | ChatML 렌더링, `<tool_call>` 파싱. `token_protocol.py`가 단일 출처 |
| `src/runtime/llm.py` | 백엔드 추상화 (llama.cpp / OpenAI 호환 / **ACP** / echo) |
| `src/runtime/acp.py` | ACP 클라이언트 — 공식 CLI를 stdio JSON-RPC로 구동 |
| `src/runtime/agent.py` | 대화 루프, 도구 라운드, 문장 단위 스트리밍 |
| `src/runtime/memory.py` | JSONL 기억 + 회상. 한글 조사 변형을 bigram으로 흡수 |
| `src/voice/` | STT · VAD · TTS · 음성 루프 |
| `yua_core.py` | CLI 진입점 |

### 자체 모델을 붙이려면

`Backend`를 하나 더 구현하면 끝이다. 나머지는 그대로 돈다.

```python
class YuaBackend(Backend):
    name = "yua"
    def stream(self, messages, config):
        prompt = render_chatml(messages)
        yield from my_model.generate(prompt, ...)
```

---

## 5. 테스트

```bash
python tests/test_runtime.py     # pytest 없이도 실행된다
pytest tests/                    # 있으면 이쪽도 동작
```

오디오 입출력은 장치가 필요해 자동 테스트에서 제외되어 있다 — `--text`로 배선을 먼저 확인하고 음성으로 넘어가는 것을 권장한다.
