"""YUA 1.0 API Server — OpenAI-compatible + YUA 독자 API."""

from __future__ import annotations

import collections
import json
import logging
import os
import time
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Optional

from src.runtime.sera_runtime import SERAConfig, SERALearner
from src.runtime.protocols.prompt_protocol import THINK_OPEN, THINK_CLOSE, PromptProtocol

logger = logging.getLogger(__name__)

# Default token budgets per reasoning mode.
# Keys correspond to YuaThinkingConfig.mode values.
DEFAULT_BUDGETS: dict[str, int] = {
    "fast": 256,
    "adaptive": 1024,
    "deep": 4096,
    "max": 16384,
}

# FastAPI is optional - only needed when actually serving
try:
    from fastapi import FastAPI, HTTPException, Request
    from fastapi.responses import JSONResponse, StreamingResponse
    from pydantic import BaseModel, Field
    from starlette.middleware.base import BaseHTTPMiddleware
    import uvicorn
    FASTAPI_AVAILABLE = True
except ImportError:
    FASTAPI_AVAILABLE = False


# ---- Request/Response schemas ----

if FASTAPI_AVAILABLE:
    class CompletionRequest(BaseModel):
        model: str = "yua-1.0"
        prompt: str = Field(..., max_length=100_000)
        max_tokens: int = Field(default=128, ge=1, le=4096)
        temperature: float = Field(default=1.0, ge=0.0, le=2.0)
        top_k: int = Field(default=50, ge=0)
        top_p: float = Field(default=1.0, ge=0.0, le=1.0)
        repetition_penalty: float = Field(default=1.0, ge=0.5, le=2.0)
        stream: bool = False

    class ChatMessage(BaseModel):
        role: str = Field(..., pattern=r"^(system|user|assistant)$")
        content: str = Field(..., max_length=50_000)

    class ChatCompletionRequest(BaseModel):
        model: str = "yua-1.0"
        messages: list[ChatMessage] = Field(..., max_length=100)
        max_tokens: int = Field(default=128, ge=1, le=4096)
        temperature: float = Field(default=1.0, ge=0.0, le=2.0)
        top_k: int = Field(default=50, ge=0)
        top_p: float = Field(default=1.0, ge=0.0, le=1.0)
        repetition_penalty: float = Field(default=1.0, ge=0.5, le=2.0)
        stream: bool = False
        use_rag: bool = False
        use_web_search: bool = False
        thinking_mode: bool = True

    # ---- YUA 독자 API Request Schema ----

    class YuaThinkingConfig(BaseModel):
        mode: str = Field(default="adaptive", pattern=r"^(off|fast|adaptive|deep|max)$")
        visibility: str = Field(default="summary", pattern=r"^(full|summary|hidden)$")
        budget_tokens: Optional[int] = Field(default=None, ge=1024, le=32768)
        self_consistency_k: int = Field(default=0, ge=0, le=5)

    class YuaRetrievalConfig(BaseModel):
        mode: str = Field(default="auto", pattern=r"^(off|auto|always)$")
        sources: list[str] = Field(default=["rag"])
        web_engine: str = Field(default="brave", pattern=r"^(brave|duckduckgo)$")
        rag_collection: str = "default"
        domain_filter: list[str] = Field(default=[])
        recency: Optional[str] = Field(default=None, pattern=r"^(hour|day|week|month|year)$")
        max_sources: int = Field(default=5, ge=1, le=10)
        citation_mode: str = Field(default="inline", pattern=r"^(inline|footnote|off)$")

    class YuaSafetyConfig(BaseModel):
        level: str = Field(default="standard", pattern=r"^(off|minimal|standard|strict)$")
        checkers: list[str] = Field(default=["safety"])

    class YuaGenerationConfig(BaseModel):
        max_tokens: int = Field(default=2048, ge=1, le=8192)
        temperature: float = Field(default=0.7, ge=0.0, le=2.0)
        top_k: int = Field(default=50, ge=0, le=500)
        top_p: float = Field(default=0.95, ge=0.0, le=1.0)
        repetition_penalty: float = Field(default=1.0, ge=0.5, le=2.0)

    class YuaChatRequest(BaseModel):
        message: str = Field(..., max_length=100_000)
        thread_id: Optional[str] = None
        stream: bool = False
        thinking: YuaThinkingConfig = Field(default_factory=YuaThinkingConfig)
        retrieval: YuaRetrievalConfig = Field(default_factory=YuaRetrievalConfig)
        safety: YuaSafetyConfig = Field(default_factory=YuaSafetyConfig)
        generation: YuaGenerationConfig = Field(default_factory=YuaGenerationConfig)

    # ---- API Key Authentication Middleware ----

    class APIKeyAuthMiddleware(BaseHTTPMiddleware):
        """Bearer token authentication for /v1/ endpoints.

        Reads the expected key from the YUA_API_KEY environment variable.
        If the variable is unset or empty, authentication is skipped (dev mode).
        """

        async def dispatch(self, request: Request, call_next):
            api_key = os.environ.get("YUA_API_KEY", "").strip()

            # Dev mode: no key configured -> skip auth
            if not api_key:
                return await call_next(request)

            # Only guard /v1/ routes
            if request.url.path.startswith("/v1/"):
                # x-api-key 헤더 또는 Authorization: Bearer 둘 다 지원
                x_api_key = request.headers.get("x-api-key", "")
                auth_header = request.headers.get("Authorization", "")
                bearer_key = auth_header.replace("Bearer ", "") if auth_header.startswith("Bearer ") else ""

                if x_api_key != api_key and bearer_key != api_key:
                    return JSONResponse(
                        status_code=401,
                        content={"ok": False, "error": {"code": "auth_required", "message": "Invalid or missing API key"}},
                    )

            return await call_next(request)

    # ---- Rate Limiting Middleware ----

    class RateLimitMiddleware(BaseHTTPMiddleware):
        """Simple IP-based rate limiter: 60 requests per minute per IP."""

        WINDOW = 60  # seconds
        MAX_REQUESTS = 60

        def __init__(self, app):
            super().__init__(app)
            # IP -> deque of request timestamps
            self._hits: dict[str, collections.deque] = {}

        async def dispatch(self, request: Request, call_next):
            client_ip = request.client.host if request.client else "unknown"
            now = time.time()

            if client_ip not in self._hits:
                self._hits[client_ip] = collections.deque()

            q = self._hits[client_ip]

            # Evict expired entries
            while q and q[0] <= now - self.WINDOW:
                q.popleft()

            if len(q) >= self.MAX_REQUESTS:
                return JSONResponse(
                    status_code=429,
                    content={"error": {"message": "Rate limit exceeded. Try again later.", "type": "rate_limit_error"}},
                )

            q.append(now)
            return await call_next(request)


@dataclass
class ServerConfig:
    """Serving configuration."""
    checkpoint_path: str = "checkpoints/final/checkpoint.pt"
    config_path: str = "configs/model_125m.yaml"
    tokenizer_path: str = "data/tokenizer/llm_spm.model"
    host: str = "127.0.0.1"
    port: int = 8000
    device: str = "auto"
    default_max_new_tokens: int = 256


class YuaServer:
    """HTTP server wrapping YUA 1.0 for inference."""

    def __init__(self, config: ServerConfig) -> None:
        if not FASTAPI_AVAILABLE:
            raise ImportError("FastAPI + uvicorn required: pip install fastapi uvicorn")
        self.config = config
        self.generator = None
        self._rag_pipeline = None
        self._checker_pipeline = None
        self._uncertainty = None
        self._last_confidence: Optional[float] = None
        self.sera_learner: Optional[SERALearner] = None
        self._prompt_protocol = PromptProtocol()
        self.app = self._build_app()

    def _load_model(self) -> None:
        from src.inference.generate import TextGenerator
        logger.info("Loading model from %s", self.config.checkpoint_path)
        self.generator = TextGenerator.from_checkpoint(
            checkpoint_path=self.config.checkpoint_path,
            config_path=self.config.config_path,
            tokenizer_path=self.config.tokenizer_path,
            device=self.config.device,
        )
        if os.environ.get("ENABLE_SERA", "").strip().lower() == "true":
            self.sera_learner = SERALearner(
                model=self.generator.model,
                tokenizer=self.generator.tokenizer,
                config=SERAConfig(),
                device=self.generator.device,
            )
            self.sera_learner.hook_into_model()
            self.generator.sera_learner = self.sera_learner
            logger.info("SERA enabled for inference")
        logger.info("Model loaded successfully")
        self._init_runtime()

    def _init_runtime(self) -> None:
        """Initialize runtime modules (RAG, Checkers, Uncertainty)."""
        # RAG pipeline
        try:
            from src.runtime.rag.pipeline import RAGPipeline
            from src.runtime.ml.reranker import get_reranker

            # ChromaDB (persistent) → FAISS → Dummy (fallback)
            try:
                from src.runtime.rag.pipeline import ChromaRetriever
                retriever = ChromaRetriever(persist_dir="data/chromadb")
                logger.info("Using ChromaDB retriever (persistent)")
            except (ImportError, Exception) as e:
                logger.warning("ChromaDB not available (%s), falling back to DummyRetriever", e)
                from src.runtime.rag.pipeline import DummyRetriever
                retriever = DummyRetriever()

            reranker = get_reranker("tfidf")

            def llm_fn(prompt: str, opts: dict = None, **kwargs) -> str:
                opts = opts or {}
                return self.generator.generate(prompt, max_new_tokens=opts.get("max_tokens", self.config.default_max_new_tokens))

            self._rag_pipeline = RAGPipeline(
                retriever=retriever,
                llm=llm_fn,
                reranker=reranker,
            )
            logger.info("RAG pipeline initialized (DummyRetriever + TFIDFReranker)")
        except Exception as e:
            logger.warning("RAG pipeline init failed: %s", e)

        # Checker pipeline
        try:
            from src.runtime.checkers.checker import create_default_pipeline

            def checker_llm(p: str, opts: dict = None, **kwargs) -> str:
                return self.generator.generate(p, max_new_tokens=self.config.default_max_new_tokens)

            self._checker_pipeline = create_default_pipeline(llm=checker_llm)
            logger.info("Checker pipeline initialized")
        except Exception as e:
            logger.warning("Checker pipeline init failed: %s", e)

        # Uncertainty estimator
        try:
            from src.runtime.ml.uncertainty import EnsembleUncertainty
            self._uncertainty = EnsembleUncertainty()
            logger.info("Uncertainty estimator initialized")
        except Exception as e:
            logger.warning("Uncertainty estimator init failed: %s", e)

    def _rag_query(self, query: str, use_web: bool = False):
        """Retrieve context via RAG, optionally augmented with web search."""
        if self._rag_pipeline is None:
            return None
        # Web search augmentation
        if use_web:
            try:
                from src.runtime.tools.web_search import WebSearcher
                searcher = WebSearcher(backend="brave", max_results=3)
                web_response = searcher.search(query)
                web_chunks = searcher.to_rag_chunks(web_response)
                for chunk in web_chunks:
                    self._rag_pipeline.retriever.add_document(
                        text=chunk.text, source=chunk.source,
                    ) if hasattr(self._rag_pipeline.retriever, 'add_document') else None
            except Exception as e:
                logger.warning("Web search failed: %s", e)
        try:
            return self._rag_pipeline.query(query)
        except Exception as e:
            logger.warning("RAG query failed: %s", e)
            return None

    def _run_checkers(self, output: str, context: dict) -> dict:
        """Run checker pipeline on generated output."""
        if self._checker_pipeline is None:
            return None
        try:
            report = self._checker_pipeline.run(output, context)
            return report.to_dict()
        except Exception as e:
            logger.warning("Checker run failed: %s", e)
            return None

    def _build_app(self) -> "FastAPI":
        app = FastAPI(title="YUA 1.0 API", version="1.0.0")

        # Register security middlewares (order: rate-limit first, then auth)
        app.add_middleware(APIKeyAuthMiddleware)
        app.add_middleware(RateLimitMiddleware)

        @app.on_event("startup")
        async def startup():
            self._load_model()

        @app.get("/health")
        async def health():
            return {"status": "ok", "model": "yua-1.0", "ready": self.generator is not None}

        @app.get("/v1/models")
        async def list_models():
            return {"data": [{"id": "yua-1.0", "object": "model"}]}

        @app.post("/v1/rag/query")
        async def rag_query(req: dict):
            """RAG query endpoint — retrieve + generate."""
            if self.generator is None:
                raise HTTPException(503, "Model not loaded")
            if self._rag_pipeline is None:
                raise HTTPException(501, "RAG pipeline not available")

            query = req.get("query", "")
            use_web = req.get("use_web_search", False)
            if not query:
                raise HTTPException(400, "query is required")

            result = self._rag_query(query, use_web=use_web)
            if result is None:
                raise HTTPException(500, "RAG query failed")

            return {
                "answer": result.answer,
                "chunks_used": [{"text": c.text, "source": c.source, "score": c.score} for c in result.chunks_used],
                "citations": result.citations,
            }

        @app.post("/v1/completions")
        async def completions(req: CompletionRequest):
            if self.generator is None:
                raise HTTPException(503, "Model not loaded")

            # SSE Streaming
            if req.stream:
                return StreamingResponse(
                    self._stream_completion(req),
                    media_type="text/event-stream",
                )

            t0 = time.time()
            text = self.generator.generate(
                prompt=req.prompt,
                max_new_tokens=req.max_tokens,
                temperature=req.temperature,
                top_k=req.top_k,
                top_p=req.top_p,
                repetition_penalty=req.repetition_penalty,
            )
            dt = time.time() - t0

            return {
                "id": f"cmpl-{uuid.uuid4().hex[:8]}",
                "object": "text_completion",
                "model": req.model,
                "choices": [{"text": text, "index": 0, "finish_reason": "stop"}],
                "usage": {"completion_time_ms": int(dt * 1000)},
            }

        @app.post("/v1/chat/completions")
        async def chat_completions(req: ChatCompletionRequest):
            if self.generator is None:
                raise HTTPException(503, "Model not loaded")

            # SSE Streaming
            if req.stream:
                return StreamingResponse(
                    self._stream_chat(req),
                    media_type="text/event-stream",
                    headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
                )

            # Flatten messages to prompt
            prompt = self._messages_to_prompt(req.messages)

            # RAG context augmentation
            if req.use_rag and self._rag_pipeline is not None:
                user_query = req.messages[-1].content if req.messages else ""
                rag_result = self._rag_query(user_query, use_web=req.use_web_search)
                if rag_result and rag_result.chunks_used:
                    context_text = "\n\n".join(c.text for c in rag_result.chunks_used[:5])
                    prompt = f"[context]:\n{context_text}\n\n{prompt}"

            t0 = time.time()
            text = self.generator.generate(
                prompt=prompt,
                max_new_tokens=req.max_tokens,
                temperature=req.temperature,
                top_k=req.top_k,
                top_p=req.top_p,
                repetition_penalty=req.repetition_penalty,
            )
            dt = time.time() - t0

            # Post-generation: uncertainty estimation
            confidence = None
            if self._uncertainty is not None:
                try:
                    import torch
                    input_ids = self.generator._encode(text)
                    with torch.no_grad():
                        logits = self.generator.model(input_ids.unsqueeze(0))[0]
                    last_logits = logits[0, -1, :]
                    result = self._uncertainty.estimate(last_logits)
                    confidence = round(result.confidence, 4)
                except Exception as e:
                    logger.warning("Uncertainty estimation failed: %s", e)

            # Post-generation: checker pipeline
            check_report = None
            if self._checker_pipeline is not None:
                check_report = self._run_checkers(text, {"question": prompt})

            response = {
                "id": f"chatcmpl-{uuid.uuid4().hex[:8]}",
                "object": "chat.completion",
                "model": req.model,
                "choices": [{
                    "index": 0,
                    "message": {"role": "assistant", "content": text},
                    "finish_reason": "stop",
                }],
                "usage": {"completion_time_ms": int(dt * 1000)},
            }
            if check_report is not None:
                response["check_report"] = check_report
            if confidence is not None:
                response["usage"]["confidence"] = confidence
            return response

        # ================================================================
        # YUA 독자 API — POST /v1/yua/chat
        # ================================================================

        @app.post("/v1/yua/chat")
        async def yua_chat(req: YuaChatRequest):
            if self.generator is None:
                return JSONResponse(status_code=503, content={
                    "ok": False, "request_id": f"req_{uuid.uuid4().hex[:8]}",
                    "error": {"code": "model_unavailable", "message": "Model not loaded"},
                })

            request_id = f"req_{uuid.uuid4().hex[:8]}"
            thread_id = req.thread_id or f"thr_{uuid.uuid4().hex[:12]}"

            # SSE Streaming
            if req.stream:
                return StreamingResponse(
                    self._yua_stream(req, request_id, thread_id),
                    media_type="text/event-stream",
                    headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
                )

            # Non-streaming
            try:
                result = self._yua_generate(req, request_id, thread_id)
                return result
            except Exception as e:
                logger.error("YUA chat failed: %s", e)
                return JSONResponse(status_code=500, content={
                    "ok": False, "request_id": request_id,
                    "error": {"code": "internal_error", "message": str(e)},
                })

        return app

    # ================================================================
    # YUA 독자 API — 내부 메서드
    # ================================================================

    def _yua_generate(self, req, request_id: str, thread_id: str) -> dict:
        """YUA 독자 API 비스트리밍 응답 생성."""
        t0 = time.time()
        prompt = req.message
        thinking_result = None
        retrieval_result = None
        check_report = None
        thinking_tokens = 0

        # 1. Thinking (CoT)
        if req.thinking.mode != "off":
            thinking_result = self._yua_thinking(prompt, req.thinking)
            if thinking_result:
                thinking_tokens = thinking_result.get("thinking_tokens", 0)
                # Deep/max 모드에서는 thinking 결과를 prompt에 반영
                if thinking_result.get("answer"):
                    prompt = f"Based on this analysis:\n{thinking_result['raw']}\n\nAnswer concisely: {req.message}"

        # 2. Retrieval (RAG + Web)
        if req.retrieval.mode == "always" or (
            req.retrieval.mode == "auto" and len(req.message.split()) >= 8
        ):
            retrieval_result = self._yua_retrieval(req.message, req.retrieval)
            if retrieval_result and retrieval_result.get("sources"):
                context_text = "\n\n".join(
                    s.get("snippet", s.get("title", "")) for s in retrieval_result["sources"][:req.retrieval.max_sources]
                )
                prompt = f"[context]:\n{context_text}\n\n[user]: {prompt}\n[assistant]:"

        # 3. Generate
        gen = req.generation
        text = self.generator.generate(
            prompt=prompt,
            max_new_tokens=gen.max_tokens,
            temperature=gen.temperature,
            top_k=gen.top_k,
            top_p=gen.top_p,
            repetition_penalty=gen.repetition_penalty,
        )
        dt = time.time() - t0

        # 4. Safety checkers
        if req.safety.level != "off" and self._checker_pipeline is not None:
            check_report = self._yua_safety_check(text, req.message, req.safety)
            # strict 모드: 위반 시 차단
            if req.safety.level == "strict" and check_report and not check_report.get("passed", True):
                raise HTTPException(status_code=451, detail="Response blocked by safety checker")

        # 5. Citations
        citations = []
        if retrieval_result and req.retrieval.citation_mode != "off":
            citations = self._extract_citations(text, retrieval_result.get("sources", []))

        # Build response
        input_tokens = len(self.generator.tokenizer.Encode(req.message)) if hasattr(self.generator, 'tokenizer') else 0
        output_tokens = len(self.generator.tokenizer.Encode(text)) if hasattr(self.generator, 'tokenizer') else 0

        response: dict[str, Any] = {
            "ok": True,
            "request_id": request_id,
            "thread_id": thread_id,
            "model": "yua-1.0",
            "content": text,
            "usage": {
                "thinking_tokens": thinking_tokens,
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "total_tokens": thinking_tokens + input_tokens + output_tokens,
                "retrieval_calls": len(retrieval_result.get("sources", [])) if retrieval_result else 0,
                "checker_calls": len(check_report.get("checkers", [])) if check_report else 0,
                "latency_ms": int(dt * 1000),
            },
        }

        if thinking_result and req.thinking.visibility != "hidden":
            response["thinking"] = {
                "visibility": req.thinking.visibility,
                "tokens_used": thinking_tokens,
                "summary": thinking_result.get("summary"),
                "raw": thinking_result.get("raw") if req.thinking.visibility == "full" else None,
            }

        if retrieval_result:
            response["retrieval"] = {
                "sources": retrieval_result.get("sources", []),
                "citations": citations,
            }

        if check_report:
            response["safety"] = check_report

        return response

    def _yua_thinking(self, prompt: str, config) -> Optional[dict]:
        """Run thinking/CoT via reasoning_engine (SSOT).

        Uses solve_with_reasoning() which handles:
        - Task routing (DIRECT / SCRATCHPAD / VERIFY)
        - Structured scratchpad (Goal/Given/Plan/Work/Check)
        - Selective self-consistency (VERIFY mode only)
        - ThoughtQuality gate with retry
        """
        try:
            from src.runtime.reasoning_engine import solve_with_reasoning
            from src.runtime.reasoning_contract import ReasoningMode, ReasoningRequest
            mode_to_reasoning = {
                "fast": ReasoningMode.DIRECT,
                "adaptive": ReasoningMode.SCRATCHPAD,
                "deep": ReasoningMode.SCRATCHPAD,
                "max": ReasoningMode.VERIFY,
            }
            reasoning_mode = mode_to_reasoning.get(config.mode, ReasoningMode.SCRATCHPAD)

            # Self-consistency 요청이면 VERIFY 강제
            if config.self_consistency_k >= 3:
                reasoning_mode = ReasoningMode.VERIFY

            max_tokens = config.budget_tokens or DEFAULT_BUDGETS.get(config.mode, 1024)

            request = ReasoningRequest(
                question=prompt,
                force_mode=reasoning_mode,
                max_new_tokens=max_tokens,
                num_candidates=max(1, config.self_consistency_k if config.self_consistency_k > 0 else 3),
            )
            result = solve_with_reasoning(
                model=self.generator.model,
                tokenizer=self.generator.tokenizer,
                request=request,
                device=self.generator.device,
                sera_learner=self.sera_learner,
            )
            if self.sera_learner is not None:
                self.sera_learner.set_runtime_signals(
                    verifier_disagreement=bool(getattr(result, "uncertain", False)),
                    tool_failure=bool(result.metadata.get("fallback_action_used")) if getattr(result, "metadata", None) else False,
                    self_consistency_drop=bool(result.quality and result.quality.total_score < 0.4),
                )

            answer = result.answer or ""
            return {
                "raw": result.thinking,
                "summary": answer[:200] + "..." if len(answer) > 200 else answer,
                "answer": answer,
                "thinking_tokens": result.quality.thinking_token_count if result.quality else 0,
            }
        except Exception as e:
            logger.warning("Thinking failed: %s", e)
            if self.sera_learner is not None:
                self.sera_learner.set_runtime_signals(
                    tool_failure=True,
                    retry_signal=True,
                )
            return None

    def _yua_retrieval(self, query: str, config) -> Optional[dict]:
        """Run retrieval based on config."""
        sources = []

        # RAG retrieval (collection 지정 지원)
        if "rag" in config.sources:
            try:
                retriever = None
                # rag_collection이 지정되면 해당 collection으로 retriever 생성
                if config.rag_collection != "default":
                    try:
                        from src.runtime.rag.pipeline import ChromaRetriever
                        retriever = ChromaRetriever(
                            persist_dir="data/chromadb",
                            collection_name=config.rag_collection,
                        )
                    except Exception:
                        pass
                # fallback: 기본 retriever
                if retriever is None and self._rag_pipeline is not None:
                    retriever = self._rag_pipeline.retriever

                if retriever is not None:
                    rag_result = retriever.retrieve(query, top_k=config.max_sources)
                    for chunk in rag_result:
                        sources.append({
                            "title": chunk.source or "RAG",
                            "url": chunk.source,
                            "score": chunk.score,
                            "snippet": chunk.text[:500],
                        })
            except Exception as e:
                logger.warning("RAG retrieval failed: %s", e)

        # Web search (domain_filter + recency 지원)
        if "web" in config.sources:
            try:
                from src.runtime.tools.web_search import WebSearcher
                searcher = WebSearcher(backend=config.web_engine, max_results=config.max_sources)
                web_response = searcher.search(query)
                for r in web_response.results:
                    # domain_filter 적용
                    if config.domain_filter:
                        from urllib.parse import urlparse
                        domain = urlparse(r.url).netloc
                        if not any(allowed in domain for allowed in config.domain_filter):
                            continue
                    sources.append({
                        "title": r.title,
                        "url": r.url,
                        "score": r.score,
                        "snippet": r.snippet[:500],
                    })
            except Exception as e:
                logger.warning("Web search failed: %s", e)

        # Sort by score, limit
        sources.sort(key=lambda s: s.get("score", 0), reverse=True)
        sources = sources[:config.max_sources]

        return {"sources": sources} if sources else None

    def _yua_safety_check(self, text: str, question: str, config) -> Optional[dict]:
        """Run safety checkers based on config."""
        if self._checker_pipeline is None:
            return None
        try:
            report = self._checker_pipeline.run(text, {"question": question})
            checkers = []
            for r in report.results:
                if r.checker_name in config.checkers or config.level in ("standard", "strict"):
                    checkers.append({
                        "name": r.checker_name,
                        "passed": r.passed,
                        "score": r.score,
                        "details": "; ".join(r.issues) if r.issues else None,
                    })
            return {
                "passed": all(c["passed"] for c in checkers) if checkers else True,
                "avg_score": sum(c["score"] for c in checkers) / max(len(checkers), 1),
                "checkers": checkers,
            }
        except Exception as e:
            logger.warning("Safety check failed: %s", e)
            return None

    def _extract_citations(self, text: str, sources: list[dict]) -> list[dict]:
        """Extract inline citations from generated text."""
        citations = []
        text_lower = text.lower()
        for i, source in enumerate(sources):
            snippet = source.get("snippet", "")
            if not snippet:
                continue
            words = snippet.lower().split()
            for j in range(0, len(words) - 3):
                phrase = " ".join(words[j:j + 4])
                if phrase in text_lower:
                    citations.append({
                        "index": i + 1,
                        "text": phrase,
                        "source": {"url": source.get("url", ""), "title": source.get("title", "")},
                    })
                    break
        return citations

    async def _yua_stream(self, req, request_id: str, thread_id: str):
        """YUA 독자 API SSE 스트리밍."""
        def _sse(event: str, data: dict) -> str:
            return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"

        thinking_tokens = 0
        output_tokens = 0
        sources_used = 0
        check_passed = True

        try:
            prompt = req.message

            # 1. Thinking
            if req.thinking.mode != "off":
                thinking_result = self._yua_thinking(prompt, req.thinking)
                if thinking_result:
                    thinking_tokens = thinking_result.get("thinking_tokens", 0)
                    if req.thinking.visibility == "full" and thinking_result.get("raw"):
                        yield _sse("thinking_delta", {"text": thinking_result["raw"]})
                    elif req.thinking.visibility == "summary" and thinking_result.get("summary"):
                        yield _sse("thinking_summary", {
                            "summary": thinking_result["summary"],
                            "thinking_tokens": thinking_tokens,
                        })
                    if thinking_result.get("answer"):
                        prompt = f"Based on this analysis:\n{thinking_result['raw']}\n\nAnswer concisely: {req.message}"

            # 2. Retrieval
            retrieval_result = None
            if req.retrieval.mode == "always" or (
            req.retrieval.mode == "auto" and len(req.message.split()) >= 8
        ):
                retrieval_result = self._yua_retrieval(req.message, req.retrieval)
                if retrieval_result and retrieval_result.get("sources"):
                    sources_used = len(retrieval_result["sources"])
                    yield _sse("retrieval_result", {"sources": retrieval_result["sources"]})
                    context_text = "\n\n".join(
                        s.get("snippet", "") for s in retrieval_result["sources"][:req.retrieval.max_sources]
                    )
                    prompt = f"[context]:\n{context_text}\n\n[user]: {prompt}\n[assistant]:"

            # 3. Stream generate
            from src.inference.streaming import YuaStreamGenerator

            stream_gen = YuaStreamGenerator(
                model=self.generator.model,
                tokenizer=self.generator.tokenizer,
                device=self.generator.device,
                sera_learner=self.sera_learner,
            )

            gen = req.generation
            full_text = ""
            for event in stream_gen.stream_generate(
                prompt=prompt,
                max_new_tokens=gen.max_tokens,
                temperature=gen.temperature,
                top_k=gen.top_k,
                top_p=gen.top_p,
                thinking_mode=False,  # thinking은 이미 위에서 처리
            ):
                if event.kind == "text_delta":
                    delta = event.data.get("delta", "")
                    full_text += delta
                    if hasattr(self.generator.tokenizer, "Encode"):
                        output_tokens += len(self.generator.tokenizer.Encode(delta))
                    else:
                        output_tokens += 1
                    yield _sse("token", {"text": delta})
                elif event.kind == "done":
                    break

            # 4. Citations
            if retrieval_result and req.retrieval.citation_mode != "off":
                citations = self._extract_citations(full_text, retrieval_result.get("sources", []))
                for cit in citations:
                    yield _sse("citation", cit)

            # 5. Safety check
            if req.safety.level != "off" and self._checker_pipeline is not None:
                check_report = self._yua_safety_check(full_text, req.message, req.safety)
                if check_report:
                    check_passed = check_report.get("passed", True)
                    yield _sse("check_report", check_report)

            # 6. Done
            yield _sse("done", {
                "request_id": request_id,
                "thread_id": thread_id,
                "thinking_tokens": thinking_tokens,
                "output_tokens": output_tokens,
                "sources_used": sources_used,
                "check_passed": check_passed,
            })
            if self.sera_learner is not None:
                self.sera_learner.reset_episode()

        except Exception as e:
            logger.error("YUA stream failed: %s", e)
            if self.sera_learner is not None:
                self.sera_learner.reset_episode()
            yield _sse("done", {
                "request_id": request_id,
                "thread_id": thread_id,
                "error": {"code": "internal_error", "message": str(e)},
            })

    def _stream_completion(self, req):
        """SSE 스트리밍 생성기 — OpenAI 호환."""
        from src.inference.streaming import YuaStreamGenerator, sse_stream_response

        stream_gen = YuaStreamGenerator(
            model=self.generator.model,
            tokenizer=self.generator.tokenizer,
            device=self.generator.device,
            sera_learner=self.sera_learner,
        )
        events = stream_gen.stream_generate(
            prompt=req.prompt,
            max_new_tokens=req.max_tokens,
            temperature=req.temperature,
            top_k=req.top_k,
            top_p=req.top_p,
        )
        return sse_stream_response(events, openai_compat=True)

    def _stream_chat(self, req):
        """Chat SSE 스트리밍 — OpenAI 호환."""
        from src.inference.streaming import YuaStreamGenerator, sse_stream_response

        prompt = self._messages_to_prompt(req.messages)

        # RAG context augmentation for streaming
        if req.use_rag and self._rag_pipeline is not None:
            user_query = req.messages[-1].content if req.messages else ""
            rag_result = self._rag_query(user_query, use_web=req.use_web_search)
            if rag_result and rag_result.chunks_used:
                context_text = "\n\n".join(c.text for c in rag_result.chunks_used[:5])
                prompt = f"[context]:\n{context_text}\n\n{prompt}"
        stream_gen = YuaStreamGenerator(
            model=self.generator.model,
            tokenizer=self.generator.tokenizer,
            device=self.generator.device,
            sera_learner=self.sera_learner,
        )
        events = stream_gen.stream_generate(
            prompt=prompt,
            max_new_tokens=req.max_tokens,
            temperature=req.temperature,
            top_k=req.top_k,
            top_p=req.top_p,
            thinking_mode=req.thinking_mode,
        )
        return sse_stream_response(events, openai_compat=True)

    def _messages_to_prompt(self, messages: list) -> str:
        """Convert chat messages to ChatML prompt via PromptProtocol SSOT."""
        normalized = []
        for msg in messages:
            role = msg.role if hasattr(msg, "role") else msg["role"]
            content = msg.content if hasattr(msg, "content") else msg["content"]
            normalized.append({"role": role, "content": content})
        return self._prompt_protocol.build_chat_prompt(normalized)

    def run(self) -> None:
        """Start the HTTP server."""
        uvicorn.run(self.app, host=self.config.host, port=self.config.port)


def main():
    """CLI entry point."""
    import argparse
    parser = argparse.ArgumentParser(description="YUA 1.0 Serving")
    parser.add_argument("--checkpoint", default="checkpoints/final/checkpoint.pt")
    parser.add_argument("--config", default="configs/model_125m.yaml")
    parser.add_argument("--tokenizer", default="data/tokenizer/llm_spm.model")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument("--device", default="auto")
    args = parser.parse_args()

    cfg = ServerConfig(
        checkpoint_path=args.checkpoint,
        config_path=args.config,
        tokenizer_path=args.tokenizer,
        host=args.host,
        port=args.port,
        device=args.device,
    )
    server = YuaServer(cfg)
    server.run()


if __name__ == "__main__":
    main()
