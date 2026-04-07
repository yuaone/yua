"""Standalone text generation with tokenizer integration.

TextGenerator is a thin wrapper around YuaModel.generate() — all sampling
logic lives in the model. This ensures training and inference use identical
generation code.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Iterator, Optional

import torch

from src.model.config import YuaConfig
from src.model.yua_model import YuaModel
from src.runtime.sera_runtime import SERAConfig, SERALearner


@dataclass
class ToolAugmentedResult:
    """Result of tool-augmented generation."""
    final_text: str = ""
    tool_traces: list[Any] = field(default_factory=list)
    round_count: int = 0


class TextGenerator:
    """High-level text generation with tokenizer support.

    Thin wrapper around YuaModel.generate() — sampling logic is NOT duplicated.

    Args:
        model: YuaModel instance (already on device).
        tokenizer: SentencePiece processor or any object with Encode/Decode.
        device: torch device.
    """

    def __init__(
        self,
        model: YuaModel,
        tokenizer: object,
        device: Optional[torch.device] = None,
    ) -> None:
        self.model = model
        self.tokenizer = tokenizer
        self.device = device or next(model.parameters()).device
        self.sera_learner: Optional[SERALearner] = None
        self.model.eval()

    @classmethod
    def from_checkpoint(
        cls,
        checkpoint_path: str | Path,
        config_path: str | Path,
        tokenizer_path: str | Path,
        device: str = "auto",
    ) -> "TextGenerator":
        """Load model from checkpoint + config + tokenizer."""
        import sentencepiece as spm

        if device == "auto":
            device = "cuda" if torch.cuda.is_available() else "cpu"
        dev = torch.device(device)

        config = YuaConfig.from_yaml(str(config_path))
        model = YuaModel(config)

        ckpt = torch.load(str(checkpoint_path), map_location=dev, weights_only=True)
        state = ckpt.get("model", ckpt)
        state = model._migrate_state_dict(state)
        model.load_state_dict(state, strict=False)
        if hasattr(model, "post_load_init"):
            model.post_load_init()
        model.to(dev).eval()

        sp = spm.SentencePieceProcessor()
        sp.Load(str(tokenizer_path))

        return cls(model=model, tokenizer=sp, device=dev)

    def generate(
        self,
        prompt: str,
        max_new_tokens: int = 128,
        temperature: float = 1.0,
        top_k: int = 50,
        top_p: float = 1.0,
        repetition_penalty: float = 1.0,
        eos_token_id: Optional[int] = None,
        suppress_token_ids: Optional[list[int]] = None,
        min_new_tokens: int = 0,
        stop_token_ids: Optional[list[int]] = None,
    ) -> str:
        """Generate text from a prompt string.

        All sampling is delegated to YuaModel.generate() — single source of truth.
        """
        if self.sera_learner is not None:
            return self._generate_via_stream(
                prompt=prompt,
                max_new_tokens=max_new_tokens,
                temperature=temperature,
                top_k=top_k,
                top_p=top_p,
            )

        input_ids = self._encode(prompt)

        # Auto-detect eos
        if eos_token_id is None and hasattr(self.tokenizer, "eos_id"):
            eid = self.tokenizer.eos_id()
            if eid >= 0:
                eos_token_id = eid

        output_ids = self.model.generate(
            input_ids=input_ids,
            max_new_tokens=max_new_tokens,
            temperature=temperature,
            top_k=top_k,
            top_p=top_p,
            repetition_penalty=repetition_penalty,
            eos_token_id=eos_token_id,
            suppress_token_ids=suppress_token_ids,
            min_new_tokens=min_new_tokens,
            stop_token_ids=stop_token_ids,
        )

        # Decode only the new tokens
        new_ids = output_ids[0, input_ids.shape[1]:].tolist()
        return self.tokenizer.Decode(new_ids)

    def enable_sera(self, config: Optional[SERAConfig] = None) -> None:
        self.sera_learner = SERALearner(
            model=self.model,
            tokenizer=self.tokenizer,
            config=config or SERAConfig(),
            device=self.device,
        )
        self.sera_learner.hook_into_model()

    def generate_batch(
        self,
        prompts: list[str],
        max_new_tokens: int = 128,
        temperature: float = 1.0,
        top_k: int = 50,
    ) -> list[str]:
        """Generate text for multiple prompts (sequential)."""
        return [
            self.generate(p, max_new_tokens, temperature, top_k)
            for p in prompts
        ]

    def stream(
        self,
        prompt: str,
        max_new_tokens: int = 128,
        temperature: float = 1.0,
        top_k: int = 50,
        top_p: float = 1.0,
    ) -> Iterator[str]:
        """Streaming generation — yields one token string at a time.

        Note: uses model forward directly for per-token streaming.
        cache_position tracking included for RoPE correctness.
        """
        input_ids = self._encode(prompt)

        self.model.eval()
        try:
            with torch.no_grad():
                # Prefill
                ctx = input_ids[:, -self.model.config.context_length:]
                logits, _, past_kv = self.model(ctx, use_cache=True)
                logits = logits[:, -1, :]
                abs_pos = ctx.shape[1]

                eos_id = -1
                if hasattr(self.tokenizer, "eos_id"):
                    eos_id = self.tokenizer.eos_id()

                for _ in range(max_new_tokens):
                    if self.sera_learner is not None:
                        self.sera_learner.on_token(logits)
                        logits = self.sera_learner.apply_temperature(logits)

                    # Greedy or sampled
                    if temperature <= 0:
                        next_id = logits.argmax(dim=-1, keepdim=True)
                    else:
                        if self.sera_learner is None:
                            logits = logits / temperature
                        if top_k > 0:
                            top_vals, _ = torch.topk(logits, min(top_k, logits.size(-1)))
                            logits[logits < top_vals[:, -1:]] = float("-inf")
                        probs = torch.softmax(logits, dim=-1)
                        next_id = torch.multinomial(probs, num_samples=1)

                    token_str = self.tokenizer.Decode([next_id.item()])
                    yield token_str

                    if next_id.item() == eos_id:
                        break

                    # Decode with cache + absolute position
                    logits, _, past_kv = self.model(
                        next_id, use_cache=True, past_key_values=past_kv,
                        cache_position=abs_pos,
                    )
                    abs_pos += 1
                    logits = logits[:, -1, :]
        finally:
            if self.sera_learner is not None:
                self.sera_learner.reset_episode()

    def _generate_via_stream(
        self,
        prompt: str,
        max_new_tokens: int,
        temperature: float,
        top_k: int,
        top_p: float,
    ) -> str:
        return "".join(
            self.stream(
                prompt=prompt,
                max_new_tokens=max_new_tokens,
                temperature=temperature,
                top_k=top_k,
                top_p=top_p,
            )
        )

    # ---- tool-augmented generation ----

    def generate_with_tools(
        self,
        prompt: str,
        tool_executor: "ToolExecutor",
        max_new_tokens: int = 512,
        max_tool_rounds: int = 5,
        temperature: float = 0.7,
        top_k: int = 50,
        top_p: float = 0.9,
        auto_approve: bool = False,
        approval_fn: Optional[object] = None,
    ) -> "ToolAugmentedResult":
        """Generate text with automatic tool calling loop.

        Flow:
            1. Model generates response
            2. Check for <tool_call> in output
            3. If found: parse → execute → inject result → regenerate
            4. Repeat until no tool calls or max_tool_rounds reached

        Args:
            prompt: Input text (ChatML formatted or plain).
            tool_executor: ToolExecutor instance with registered tools.
            max_new_tokens: Max tokens per generation round.
            max_tool_rounds: Max number of tool call → result → regenerate cycles.
            temperature: Sampling temperature.
            top_k: Top-k sampling.
            top_p: Nucleus sampling.
            auto_approve: If True, skip approval for all tools.
            approval_fn: Callable(tool_name, arguments) -> bool. Called when
                         a tool requires approval and auto_approve is False.

        Returns:
            ToolAugmentedResult with final_text, tool_traces, and round_count.
        """
        from src.runtime.tools.executor import ExecutionTrace

        current_prompt = prompt
        all_traces: list[ExecutionTrace] = []
        full_output_parts: list[str] = []
        round_idx = 0

        for round_idx in range(max_tool_rounds):
            # Generate
            response = self.generate(
                prompt=current_prompt,
                max_new_tokens=max_new_tokens,
                temperature=temperature,
                top_k=top_k,
                top_p=top_p,
            )

            # Check for tool calls
            calls = tool_executor.parse_tool_calls(response)

            if not calls:
                # No tool calls — final response
                full_output_parts.append(response)
                break

            # Split response: text before first tool_call + tool calls
            first_call_pos = response.find("<tool_call>")
            text_before = response[:first_call_pos].strip() if first_call_pos > 0 else ""
            if text_before:
                full_output_parts.append(text_before)

            # Execute tools (with approval check)
            for call in calls:
                tool_def = tool_executor.registry.get(call.tool_name)
                needs_approval = tool_def and tool_def.requires_approval

                approved = auto_approve
                if needs_approval and not auto_approve and approval_fn is not None:
                    approved = approval_fn(call.tool_name, call.arguments)

                result = tool_executor.execute(
                    call,
                    approved=approved or not needs_approval,
                    parent_trace_id=tool_executor.trace.trace_id,
                )
                tool_executor.trace.calls.append(call)
                tool_executor.trace.results.append(result)

            all_traces.append(tool_executor.trace)

            # Format results and append to prompt for next round
            result_text = tool_executor.format_results(tool_executor.trace)
            full_output_parts.append(result_text)

            # Build continuation prompt:
            # original prompt + model response (with tool calls) + tool results
            current_prompt = (
                current_prompt
                + "\n" + response
                + "\n" + result_text
                + "\n"
            )

            # Reset trace for next round
            from src.runtime.tools.executor import ExecutionTrace as _ET
            tool_executor.trace = _ET()

        else:
            # max_tool_rounds exceeded — append warning
            full_output_parts.append(
                "\n[Tool loop limit reached. Returning partial result.]"
            )

        return ToolAugmentedResult(
            final_text="\n".join(full_output_parts),
            tool_traces=all_traces,
            round_count=round_idx + 1,
        )

    # ---- internals ----

    def _encode(self, text: str) -> torch.Tensor:
        ids = self.tokenizer.Encode(text)
        return torch.tensor([ids], dtype=torch.long, device=self.device)
