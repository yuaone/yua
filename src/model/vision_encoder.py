"""Upgraded Vision Encoder for YUA 1.0 VLM.

Changes over the original:
- Explicit torch dependency guard.
- Projection activation config is honored.
- True AnyRes tiling on the original image, plus global-thumbnail path.
- Tile 2D position embeddings for local tiles.
- Enforces image-token budget and max-images.
- LoRA application is idempotent.
- OCR supports PIL.Image, file paths, and tesseract.
- OCR text can be kept as a separate encoder channel.
- Multimodal splicing can return inputs_embeds + attention_mask + labels + position_ids.

Notes:
- This module intentionally keeps the public class names close to the original for easy drop-in.
- OCR text channel generation is tokenizer-agnostic; any Hugging Face style tokenizer should work.
"""

from __future__ import annotations

import logging
import math
from dataclasses import dataclass, field
from pathlib import Path
from tempfile import NamedTemporaryFile
from typing import TYPE_CHECKING, Any, Optional, Sequence, Union

from PIL import Image

from src.token_protocol import IGNORE_INDEX

if TYPE_CHECKING:
    from .config import YuaConfig

logger = logging.getLogger(__name__)

try:
    import torch
    import torch.nn as nn
    import torch.nn.functional as F
    TORCH_AVAILABLE = True
except ImportError as e:
    TORCH_AVAILABLE = False
    raise ImportError(
        "vision_encoder.py requires torch. Install with: pip install torch"
    ) from e


# ============================================================
# Config / Typed Outputs
# ============================================================


@dataclass
class VisionConfig:
    """Vision encoder configuration."""

    # Vision encoder
    encoder_name: str = "google/siglip-base-patch16-384"
    image_size: int = 384
    patch_size: int = 16
    vision_dim: int = 768
    freeze_encoder: bool = True

    # Pixel shuffle
    pixel_shuffle_ratio: int = 4
    use_pixel_shuffle: bool = True

    # Projection MLP
    projection_layers: int = 2
    projection_dim: int = 2048
    projection_activation: str = "gelu"  # gelu | relu | silu
    projection_dropout: float = 0.0
    projection_layernorm: bool = True

    # OCR augmentation
    use_ocr_augment: bool = True
    ocr_backend: str = "easyocr"  # easyocr | paddleocr | tesseract
    ocr_languages: list[str] = field(default_factory=lambda: ["ko", "en", "ja", "zh"])

    # Special tokens
    image_token: str = "<image>"
    image_token_id: int = -1

    # AnyRes
    use_anyres: bool = False
    max_anyres_tiles: int = 6
    anyres_tile_size: int = 384
    use_global_thumbnail: bool = True
    keep_tile_metadata: bool = True

    # Tile position embeddings
    use_tile_position_embedding: bool = True
    max_tile_rows: int = 8
    max_tile_cols: int = 8

    # LoRA for projection only
    lora_r: int = 16
    lora_alpha: int = 32
    lora_dropout: float = 0.05

    # Limits
    max_image_tokens: int = 64
    max_images: int = 3

    # Misc
    ignore_index: int = IGNORE_INDEX

    @classmethod
    def from_yua_config(cls, yua_config: "YuaConfig", **overrides) -> "VisionConfig":
        """Create VisionConfig with projection_dim locked to YuaConfig.d_model.

        This enforces the contract: vision projection output must match
        LLM hidden dimension for embedding injection (inputs_embeds).

        Args:
            yua_config: The main model config (provides d_model).
            **overrides: Additional VisionConfig field overrides.

        Returns:
            VisionConfig with projection_dim = yua_config.d_model.
        """
        if "projection_dim" in overrides and overrides["projection_dim"] != yua_config.d_model:
            raise ValueError(
                f"projection_dim override ({overrides['projection_dim']}) != "
                f"yua_config.d_model ({yua_config.d_model}). "
                f"Vision projection must output d_model for LLM compatibility."
            )
        overrides["projection_dim"] = yua_config.d_model
        return cls(**overrides)

    def validate_d_model(self, d_model: int) -> None:
        """Validate that projection_dim matches LLM d_model.

        Call this when wiring VisionEncoder into YuaModel to catch mismatches.

        Raises:
            ValueError: if projection_dim != d_model.
        """
        if self.projection_dim != d_model:
            raise ValueError(
                f"VisionConfig.projection_dim ({self.projection_dim}) != "
                f"YuaConfig.d_model ({d_model}). Vision output must match "
                f"LLM hidden dimension for inputs_embeds injection."
            )

    @property
    def num_patches(self) -> int:
        return (self.image_size // self.patch_size) ** 2

    @property
    def num_image_tokens(self) -> int:
        if self.use_pixel_shuffle:
            side = self.image_size // self.patch_size
            return (side // self.pixel_shuffle_ratio) ** 2
        return self.num_patches

    @property
    def pixel_shuffle_dim(self) -> int:
        if self.use_pixel_shuffle:
            return self.vision_dim * (self.pixel_shuffle_ratio ** 2)
        return self.vision_dim


@dataclass
class TileMetadata:
    row: int
    col: int
    left: int
    top: int
    right: int
    bottom: int
    is_global: bool = False


@dataclass
class ImageEncodingOutput:
    embeds: torch.Tensor
    tile_metadata: list[TileMetadata] = field(default_factory=list)
    ocr_text: str = ""


@dataclass
class OCRChannelOutput:
    texts: list[str]
    input_ids: Optional[torch.Tensor] = None
    attention_mask: Optional[torch.Tensor] = None


@dataclass
class MultimodalInput:
    inputs_embeds: torch.Tensor
    attention_mask: torch.Tensor
    labels: Optional[torch.Tensor]
    position_ids: torch.Tensor
    image_spans: list[tuple[int, int]] = field(default_factory=list)


# ============================================================
# Pixel Shuffle
# ============================================================


class PixelShuffle2D(nn.Module):
    """2D pixel shuffle for vision token compression.

    (batch, H*W, dim) -> (batch, H/r * W/r, dim * r^2)
    """

    def __init__(self, ratio: int = 4) -> None:
        super().__init__()
        self.ratio = ratio

    def forward(self, x: torch.Tensor, h: int, w: int) -> torch.Tensor:
        if x.ndim != 3:
            raise ValueError(f"PixelShuffle2D expects [B, HW, D], got {tuple(x.shape)}")
        if x.shape[1] != h * w:
            raise ValueError(f"PixelShuffle2D got HW={x.shape[1]} but h*w={h*w}")
        if h % self.ratio != 0 or w % self.ratio != 0:
            raise ValueError(f"h={h}, w={w} must be divisible by ratio={self.ratio}")

        b, _, d = x.shape
        r = self.ratio
        x = x.view(b, h, w, d)
        x = x.view(b, h // r, r, w // r, r, d)
        x = x.permute(0, 1, 3, 2, 4, 5).contiguous()
        new_h, new_w = h // r, w // r
        return x.view(b, new_h * new_w, r * r * d)


# ============================================================
# Projection MLP
# ============================================================


class VisionProjection(nn.Module):
    """Projection from vision embedding space to LLM embedding space."""

    def __init__(self, config: VisionConfig) -> None:
        super().__init__()
        input_dim = config.pixel_shuffle_dim
        output_dim = config.projection_dim

        act_map: dict[str, type[nn.Module]] = {
            "gelu": nn.GELU,
            "relu": nn.ReLU,
            "silu": nn.SiLU,
        }
        act_cls = act_map.get(config.projection_activation.lower())
        if act_cls is None:
            raise ValueError(f"Unsupported projection_activation={config.projection_activation}")

        layers: list[nn.Module] = []
        if config.projection_layernorm:
            layers.append(nn.LayerNorm(input_dim))

        if config.projection_layers == 1:
            layers.append(nn.Linear(input_dim, output_dim))
        elif config.projection_layers == 2:
            layers.extend(
                [
                    nn.Linear(input_dim, output_dim),
                    act_cls(),
                    nn.Dropout(config.projection_dropout),
                    nn.Linear(output_dim, output_dim),
                ]
            )
        else:
            raise ValueError(f"projection_layers must be 1 or 2, got {config.projection_layers}")

        self.proj = nn.Sequential(*layers)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.proj(x)


# ============================================================
# LoRA
# ============================================================


class LoRALinear(nn.Module):
    """Low-Rank Adaptation wrapper for nn.Linear."""

    def __init__(
        self,
        original: nn.Linear,
        r: int = 16,
        alpha: int = 32,
        dropout: float = 0.05,
    ) -> None:
        super().__init__()
        if r <= 0:
            raise ValueError(f"LoRA rank r must be > 0, got {r}")

        self.original = original
        self.r = r
        self.alpha = alpha
        self.scaling = alpha / r

        in_features = original.in_features
        out_features = original.out_features

        for p in self.original.parameters():
            p.requires_grad = False

        self.lora_A = nn.Linear(in_features, r, bias=False)
        self.lora_B = nn.Linear(r, out_features, bias=False)
        self.lora_dropout = nn.Dropout(dropout) if dropout > 0 else nn.Identity()
        self.is_lora_wrapped = True

        nn.init.kaiming_uniform_(self.lora_A.weight, a=math.sqrt(5))
        nn.init.zeros_(self.lora_B.weight)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        base_out = self.original(x)
        lora_out = self.lora_B(self.lora_A(self.lora_dropout(x))) * self.scaling
        return base_out + lora_out


# ============================================================
# AnyRes helpers
# ============================================================


@dataclass
class TilePlan:
    tiles_x: int
    tiles_y: int
    origins: list[TileMetadata]


def compute_anyres_tiles(
    image_width: int,
    image_height: int,
    tile_size: int = 384,
    max_tiles: int = 6,
) -> tuple[int, int]:
    if image_width <= tile_size and image_height <= tile_size:
        return (1, 1)

    tiles_x = math.ceil(image_width / tile_size)
    tiles_y = math.ceil(image_height / tile_size)

    total = tiles_x * tiles_y
    if total > max_tiles:
        scale = math.sqrt(max_tiles / total)
        tiles_x = max(1, int(tiles_x * scale))
        tiles_y = max(1, int(tiles_y * scale))
        while tiles_x * tiles_y > max_tiles:
            if tiles_x >= tiles_y:
                tiles_x -= 1
            else:
                tiles_y -= 1
            tiles_x = max(1, tiles_x)
            tiles_y = max(1, tiles_y)
    return (tiles_x, tiles_y)


def plan_true_tiles(
    image: Image.Image,
    tile_size: int = 384,
    max_tiles: int = 6,
) -> TilePlan:
    """True tiling on original image coordinates, not resize-then-crop."""
    w, h = image.size
    tiles_x, tiles_y = compute_anyres_tiles(w, h, tile_size, max_tiles)

    if tiles_x == 1:
        xs = [max((w - tile_size) // 2, 0)]
    else:
        xs = [int(round(i * max(w - tile_size, 0) / (tiles_x - 1))) for i in range(tiles_x)]

    if tiles_y == 1:
        ys = [max((h - tile_size) // 2, 0)]
    else:
        ys = [int(round(i * max(h - tile_size, 0) / (tiles_y - 1))) for i in range(tiles_y)]

    origins: list[TileMetadata] = []
    for row, top in enumerate(ys):
        for col, left in enumerate(xs):
            right = min(left + tile_size, w)
            bottom = min(top + tile_size, h)
            origins.append(
                TileMetadata(
                    row=row,
                    col=col,
                    left=left,
                    top=top,
                    right=right,
                    bottom=bottom,
                    is_global=False,
                )
            )

    return TilePlan(tiles_x=tiles_x, tiles_y=tiles_y, origins=origins)


def split_image_into_tiles(
    image: Image.Image,
    tile_size: int = 384,
    max_tiles: int = 6,
) -> tuple[list[Image.Image], list[TileMetadata]]:
    """Return true tiles + tile metadata."""
    plan = plan_true_tiles(image, tile_size=tile_size, max_tiles=max_tiles)
    tiles: list[Image.Image] = []

    for meta in plan.origins:
        crop = image.crop((meta.left, meta.top, meta.right, meta.bottom))
        if crop.size != (tile_size, tile_size):
            canvas = Image.new(image.mode, (tile_size, tile_size))
            canvas.paste(crop, (0, 0))
            crop = canvas
        tiles.append(crop)

    return tiles, plan.origins


# ============================================================
# Vision Encoder
# ============================================================


class VisionEncoder(nn.Module):
    """SigLIP-based vision encoder with AnyRes, tile metadata and LoRA."""

    def __init__(self, config: VisionConfig) -> None:
        super().__init__()
        self.config = config
        self.siglip: Optional[nn.Module] = None
        self.processor: Optional[Any] = None
        self._lora_enabled = False

        self.pixel_shuffle = PixelShuffle2D(config.pixel_shuffle_ratio) if config.use_pixel_shuffle else None
        self.projection = VisionProjection(config)

        if config.use_tile_position_embedding:
            self.tile_row_embed = nn.Embedding(config.max_tile_rows, config.projection_dim)
            self.tile_col_embed = nn.Embedding(config.max_tile_cols, config.projection_dim)
        else:
            self.tile_row_embed = None
            self.tile_col_embed = None

        logger.info(
            "VisionEncoder: %s -> %d tokens -> %d dim (pixel_shuffle r=%d)",
            config.encoder_name,
            config.num_image_tokens,
            config.projection_dim,
            config.pixel_shuffle_ratio,
        )

    def load_siglip(self, device: str = "cpu") -> None:
        try:
            from transformers import SiglipImageProcessor, SiglipVisionModel
        except ImportError as e:
            raise ImportError("transformers required: pip install transformers") from e

        self.to(device)
        self.siglip = SiglipVisionModel.from_pretrained(self.config.encoder_name).to(device)
        self.processor = SiglipImageProcessor.from_pretrained(self.config.encoder_name)

        if self.config.freeze_encoder:
            for p in self.siglip.parameters():
                p.requires_grad = False
            self.siglip.eval()

        logger.info("SigLIP loaded: %s (frozen=%s)", self.config.encoder_name, self.config.freeze_encoder)

    def preprocess(self, images: Union[Image.Image, Sequence[Image.Image]]) -> torch.Tensor:
        if self.processor is None:
            raise RuntimeError("Call load_siglip() before preprocess()")
        if isinstance(images, Image.Image):
            images = [images]
        inputs = self.processor(images=list(images), return_tensors="pt")
        return inputs["pixel_values"]

    def _infer_patch_grid_side(self, hidden: torch.Tensor) -> int:
        seq_len = hidden.shape[1]
        side = int(math.isqrt(seq_len))
        if side * side != seq_len:
            raise ValueError(f"Expected square patch grid, got seq_len={seq_len}")
        return side

    def encode_image(self, pixel_values: torch.Tensor) -> torch.Tensor:
        if self.siglip is None:
            raise RuntimeError("Call load_siglip() before encode_image()")

        context = torch.no_grad() if self.config.freeze_encoder else torch.enable_grad()
        with context:
            outputs = self.siglip(pixel_values=pixel_values)
            hidden = outputs.last_hidden_state

        if self.pixel_shuffle is not None:
            side = self._infer_patch_grid_side(hidden)
            hidden = self.pixel_shuffle(hidden, h=side, w=side)

        return self.projection(hidden)

    def _compress_tokens_to_budget(self, x: torch.Tensor) -> torch.Tensor:
        max_tokens = self.config.max_image_tokens
        if x.shape[0] <= max_tokens:
            return x

        bounds = torch.linspace(0, x.shape[0], steps=max_tokens + 1, device=x.device).round().long()
        pooled = []
        for i in range(max_tokens):
            s = bounds[i].item()
            e = max(bounds[i + 1].item(), s + 1)
            pooled.append(x[s:e].mean(dim=0))
        return torch.stack(pooled, dim=0)

    def _tile_position_delta(self, row: int, col: int, device: torch.device) -> torch.Tensor:
        if not self.config.use_tile_position_embedding or self.tile_row_embed is None or self.tile_col_embed is None:
            return torch.zeros(self.config.projection_dim, device=device)

        row_idx = min(max(row, 0), self.config.max_tile_rows - 1)
        col_idx = min(max(col, 0), self.config.max_tile_cols - 1)
        row_t = torch.tensor(row_idx, device=device, dtype=torch.long)
        col_t = torch.tensor(col_idx, device=device, dtype=torch.long)
        return self.tile_row_embed(row_t) + self.tile_col_embed(col_t)

    def _apply_tile_position(self, embeds: torch.Tensor, metas: Sequence[TileMetadata]) -> torch.Tensor:
        """Apply 2D tile position embedding to each tile token block."""
        if not metas or not self.config.use_tile_position_embedding:
            return embeds

        tokens_per_tile = embeds.shape[1]
        adjusted = []
        for i, meta in enumerate(metas):
            block = embeds[i]
            if not meta.is_global:
                delta = self._tile_position_delta(meta.row, meta.col, block.device)
                block = block + delta.unsqueeze(0).expand(tokens_per_tile, -1)
            adjusted.append(block)
        return torch.stack(adjusted, dim=0)

    def encode_image_anyres(self, image: Image.Image) -> ImageEncodingOutput:
        if self.siglip is None:
            raise RuntimeError("Call load_siglip() before encode_image_anyres()")

        if image.mode not in ("RGB", "RGBA", "L"):
            image = image.convert("RGB")
        if image.mode != "RGB":
            image = image.convert("RGB")

        w, h = image.size
        tile_size = self.config.anyres_tile_size
        max_tiles = self.config.max_anyres_tiles
        device = next(self.projection.parameters()).device

        if not self.config.use_anyres or (w <= tile_size and h <= tile_size):
            pixel_values = self.preprocess(image).to(device)
            single = self.encode_image(pixel_values).squeeze(0)
            single = self._compress_tokens_to_budget(single)
            return ImageEncodingOutput(embeds=single, tile_metadata=[])

        all_token_blocks: list[torch.Tensor] = []
        all_metas: list[TileMetadata] = []

        if self.config.use_global_thumbnail:
            global_pixels = self.preprocess(image).to(device)
            global_embeds = self.encode_image(global_pixels).squeeze(0)
            all_token_blocks.append(global_embeds)
            all_metas.append(TileMetadata(0, 0, 0, 0, w, h, is_global=True))

        tiles, tile_metas = split_image_into_tiles(image, tile_size, max_tiles)
        tile_pixels = self.preprocess(tiles).to(device)
        tile_embeds = self.encode_image(tile_pixels)
        tile_embeds = self._apply_tile_position(tile_embeds, tile_metas)

        for i in range(tile_embeds.shape[0]):
            all_token_blocks.append(tile_embeds[i])
            all_metas.append(tile_metas[i])

        combined = torch.cat(all_token_blocks, dim=0)
        combined = self._compress_tokens_to_budget(combined)

        logger.debug(
            "AnyRes: %dx%d -> %d local tiles (+global=%s) -> %d tokens",
            w,
            h,
            len(tile_metas),
            self.config.use_global_thumbnail,
            combined.shape[0],
        )
        return ImageEncodingOutput(embeds=combined, tile_metadata=all_metas)

    def encode_images(
        self,
        images: Sequence[Image.Image],
        ocr_augmenter: Optional["OCRAugmenter"] = None,
    ) -> list[ImageEncodingOutput]:
        if self.siglip is None:
            raise RuntimeError("Call load_siglip() before encode_images()")
        if not images:
            return []
        if len(images) > self.config.max_images:
            raise ValueError(f"Got {len(images)} images but max_images={self.config.max_images}")

        results: list[ImageEncodingOutput] = []
        if self.config.use_anyres:
            for img in images:
                out = self.encode_image_anyres(img)
                if ocr_augmenter is not None and self.config.use_ocr_augment:
                    out.ocr_text = ocr_augmenter.extract(img)
                results.append(out)
            return results

        device = next(self.projection.parameters()).device
        pixel_values = self.preprocess(list(images)).to(device)
        batch_embeds = self.encode_image(pixel_values)

        for i in range(batch_embeds.shape[0]):
            embeds = self._compress_tokens_to_budget(batch_embeds[i])
            ocr_text = ""
            if ocr_augmenter is not None and self.config.use_ocr_augment:
                ocr_text = ocr_augmenter.extract(images[i])
            results.append(ImageEncodingOutput(embeds=embeds, tile_metadata=[], ocr_text=ocr_text))
        return results

    def enable_lora(
        self,
        r: Optional[int] = None,
        alpha: Optional[int] = None,
        dropout: Optional[float] = None,
        target_modules: Optional[list[str]] = None,
    ) -> int:
        if self._lora_enabled:
            logger.info("LoRA already enabled; skipping re-application")
            return self.count_parameters(trainable_only=True)

        r = r or self.config.lora_r
        alpha = alpha or self.config.lora_alpha
        dropout = self.config.lora_dropout if dropout is None else dropout

        lora_applied = 0

        def _apply(parent: nn.Module, parent_name: str = "") -> None:
            nonlocal lora_applied
            for name, child in list(parent.named_children()):
                full_name = f"{parent_name}.{name}" if parent_name else name

                if isinstance(child, LoRALinear):
                    continue

                if isinstance(child, nn.Linear):
                    if target_modules is not None and full_name not in target_modules:
                        continue
                    wrapped = LoRALinear(child, r=r, alpha=alpha, dropout=dropout)
                    setattr(parent, name, wrapped)
                    lora_applied += 1
                    logger.info(
                        "LoRA applied: %s (in=%d, out=%d, r=%d)",
                        full_name,
                        child.in_features,
                        child.out_features,
                        r,
                    )
                else:
                    _apply(child, full_name)

        _apply(self.projection, "projection")
        self._lora_enabled = lora_applied > 0

        if self.siglip is not None:
            for p in self.siglip.parameters():
                p.requires_grad = False

        trainable = self.count_parameters(trainable_only=True)
        logger.info(
            "LoRA enabled: %d layers, r=%d, alpha=%d -> trainable params: %d",
            lora_applied,
            r,
            alpha,
            trainable,
        )
        return trainable

    def count_parameters(self, trainable_only: bool = False) -> int:
        if trainable_only:
            return sum(p.numel() for p in self.parameters() if p.requires_grad)
        return sum(p.numel() for p in self.parameters())

    def forward(self, pixel_values: torch.Tensor) -> torch.Tensor:
        return self.encode_image(pixel_values)


# ============================================================
# OCR Augmentation + OCR Channel
# ============================================================


class OCRAugmenter:
    """OCR text extraction that supports PIL.Image, paths, and tesseract."""

    def __init__(
        self,
        backend: str = "easyocr",
        languages: Optional[list[str]] = None,
        min_confidence: float = 0.3,
    ) -> None:
        self.backend = backend
        self.languages = languages or ["ko", "en"]
        self.min_confidence = min_confidence
        self._reader: Any = None

    def _init_reader(self) -> None:
        if self._reader is not None:
            return

        if self.backend == "easyocr":
            try:
                import easyocr
                self._reader = easyocr.Reader(self.languages, gpu=False)
            except ImportError:
                logger.warning("easyocr not installed: pip install easyocr")
                self._reader = "unavailable"
        elif self.backend == "paddleocr":
            try:
                from paddleocr import PaddleOCR
                lang_map = {"ko": "korean", "en": "en", "ja": "japan", "zh": "ch"}
                paddle_lang = lang_map.get(self.languages[0], "en")
                self._reader = PaddleOCR(use_angle_cls=True, lang=paddle_lang)
            except ImportError:
                logger.warning("paddleocr not installed: pip install paddleocr")
                self._reader = "unavailable"
        elif self.backend == "tesseract":
            try:
                import pytesseract
                self._reader = pytesseract
            except ImportError:
                logger.warning("pytesseract not installed: pip install pytesseract")
                self._reader = "unavailable"
        else:
            raise ValueError(f"Unsupported OCR backend: {self.backend}")

    def _normalize_input(self, image: Union[str, Path, Image.Image]) -> Union[str, Image.Image]:
        if isinstance(image, Image.Image):
            return image.convert("RGB")
        if isinstance(image, Path):
            return str(image)
        if isinstance(image, str):
            return image
        raise TypeError(f"Unsupported image input type: {type(image)!r}")

    def extract(self, image: Union[str, Path, Image.Image]) -> str:
        self._init_reader()
        if self._reader in (None, "unavailable"):
            return ""

        normalized = self._normalize_input(image)
        try:
            if self.backend == "easyocr":
                results = self._reader.readtext(normalized)
                texts = [r[1] for r in results if float(r[2]) >= self.min_confidence]
                return " ".join(texts).strip()

            if self.backend == "paddleocr":
                source = normalized
                temp_path = None
                if isinstance(normalized, Image.Image):
                    tmp = NamedTemporaryFile(suffix=".png", delete=False)
                    temp_path = tmp.name
                    tmp.close()
                    normalized.save(temp_path)
                    source = temp_path
                try:
                    result = self._reader.ocr(source, cls=True)
                    if result and result[0]:
                        texts = [line[1][0] for line in result[0] if float(line[1][1]) >= self.min_confidence]
                        return " ".join(texts).strip()
                    return ""
                finally:
                    if temp_path is not None:
                        Path(temp_path).unlink(missing_ok=True)

            if self.backend == "tesseract":
                assert self._reader is not None
                import pytesseract
                lang_map = {
                    "ko": "kor",
                    "en": "eng",
                    "ja": "jpn",
                    "zh": "chi_sim",
                }
                langs = "+".join(lang_map.get(lang, lang) for lang in self.languages)
                if isinstance(normalized, str):
                    img = Image.open(normalized).convert("RGB")
                else:
                    img = normalized
                return pytesseract.image_to_string(img, lang=langs).strip()

        except Exception as e:
            logger.warning("OCR failed for %s: %s", type(image).__name__, e)
            return ""

        return ""

    def augment_prompt(self, prompt: str, image: Union[str, Path, Image.Image]) -> str:
        ocr_text = self.extract(image)
        if ocr_text:
            return f"[OCR detected text]: {ocr_text}\n\n{prompt}"
        return prompt


class OCRChannelBuilder:
    """Build a separate OCR text channel instead of mixing OCR text into the main prompt.

    This does not force a specific architecture. It simply provides a clean side-channel
    tensor bundle that another encoder or adapter can consume.
    """

    def __init__(self, augmenter: OCRAugmenter) -> None:
        self.augmenter = augmenter

    def build(
        self,
        images: Sequence[Union[str, Path, Image.Image]],
        tokenizer: Optional[Any] = None,
        max_length: int = 256,
        padding: bool = True,
        truncation: bool = True,
    ) -> OCRChannelOutput:
        texts = [self.augmenter.extract(img) for img in images]
        if tokenizer is None:
            return OCRChannelOutput(texts=texts)

        encoded = tokenizer(
            texts,
            return_tensors="pt",
            padding=padding,
            truncation=truncation,
            max_length=max_length,
        )
        return OCRChannelOutput(
            texts=texts,
            input_ids=encoded["input_ids"],
            attention_mask=encoded["attention_mask"],
        )


# ============================================================
# Multimodal Sequence Builder
# ============================================================


def _normalize_image_embed_list(
    image_embeds_list: list[torch.Tensor] | torch.Tensor | None,
) -> list[torch.Tensor]:
    if image_embeds_list is None:
        return []
    if isinstance(image_embeds_list, torch.Tensor):
        if image_embeds_list.dim() != 2:
            raise ValueError(
                f"Single image_embeds tensor must be [num_tokens, d_model], got {tuple(image_embeds_list.shape)}"
            )
        return [image_embeds_list]
    return image_embeds_list


def build_multimodal_input(
    text_ids: torch.Tensor,
    image_embeds_list: list[torch.Tensor] | torch.Tensor | None,
    text_embeds: torch.Tensor,
    image_token_id: int,
    max_seq_len: int = 2048,
    text_attention_mask: Optional[torch.Tensor] = None,
    text_labels: Optional[torch.Tensor] = None,
    ignore_index: int = IGNORE_INDEX,
    return_legacy_tensor: bool = False,
) -> Union[torch.Tensor, MultimodalInput]:
    """Splice image embeddings into text sequence.

    Returns a MultimodalInput with:
    - inputs_embeds
    - attention_mask
    - labels (image tokens set to ignore_index)
    - position_ids

    Backward compatibility:
    - return_legacy_tensor=True returns only inputs_embeds.
    """
    if image_token_id < 0:
        raise ValueError("image_token_id must be set to a real tokenizer ID before splicing")
    if text_ids.ndim != 1:
        raise ValueError(f"text_ids must be [seq], got {tuple(text_ids.shape)}")
    if text_embeds.ndim != 2:
        raise ValueError(f"text_embeds must be [seq, d_model], got {tuple(text_embeds.shape)}")
    if text_ids.shape[0] != text_embeds.shape[0]:
        raise ValueError("text_ids and text_embeds length mismatch")

    image_embeds_seq = _normalize_image_embed_list(image_embeds_list)
    if not image_embeds_seq:
        attention = text_attention_mask if text_attention_mask is not None else torch.ones(
            text_ids.shape[0], dtype=torch.long, device=text_ids.device
        )
        labels = text_labels
        position_ids = torch.arange(text_ids.shape[0], device=text_ids.device, dtype=torch.long)
        out = MultimodalInput(
            inputs_embeds=text_embeds,
            attention_mask=attention,
            labels=labels,
            position_ids=position_ids,
            image_spans=[],
        )
        return out.inputs_embeds if return_legacy_tensor else out

    image_positions = (text_ids == image_token_id).nonzero(as_tuple=True)[0]
    if len(image_positions) == 0:
        attention = text_attention_mask if text_attention_mask is not None else torch.ones(
            text_ids.shape[0], dtype=torch.long, device=text_ids.device
        )
        labels = text_labels
        position_ids = torch.arange(text_ids.shape[0], device=text_ids.device, dtype=torch.long)
        out = MultimodalInput(
            inputs_embeds=text_embeds,
            attention_mask=attention,
            labels=labels,
            position_ids=position_ids,
            image_spans=[],
        )
        return out.inputs_embeds if return_legacy_tensor else out

    if len(image_positions) != len(image_embeds_seq):
        logger.warning(
            "image placeholder count (%d) != image embed count (%d)",
            len(image_positions),
            len(image_embeds_seq),
        )

    text_attention_mask = text_attention_mask if text_attention_mask is not None else torch.ones(
        text_ids.shape[0], dtype=torch.long, device=text_ids.device
    )

    if text_labels is not None and text_labels.shape[0] != text_ids.shape[0]:
        raise ValueError("text_labels length mismatch")

    embed_parts: list[torch.Tensor] = []
    mask_parts: list[torch.Tensor] = []
    label_parts: list[torch.Tensor] = [] if text_labels is not None else []
    spans: list[tuple[int, int]] = []

    prev_pos = 0
    running_pos = 0

    for i, pos_tensor in enumerate(image_positions):
        pos = int(pos_tensor.item())

        if pos > prev_pos:
            embed_parts.append(text_embeds[prev_pos:pos])
            mask_parts.append(text_attention_mask[prev_pos:pos])
            if text_labels is not None:
                label_parts.append(text_labels[prev_pos:pos])
            running_pos += pos - prev_pos

        if i < len(image_embeds_seq):
            img = image_embeds_seq[i]
            if img.ndim != 2 or img.shape[1] != text_embeds.shape[1]:
                raise ValueError(
                    f"image_embeds_list[{i}] must be [num_tokens, d_model={text_embeds.shape[1]}], got {tuple(img.shape)}"
                )
            start = running_pos
            end = start + img.shape[0]
            spans.append((start, end))
            embed_parts.append(img)
            mask_parts.append(torch.ones(img.shape[0], dtype=text_attention_mask.dtype, device=img.device))
            if text_labels is not None:
                label_parts.append(torch.full((img.shape[0],), ignore_index, dtype=text_labels.dtype, device=img.device))
            running_pos = end
        else:
            # If an image placeholder has no corresponding image embed, preserve its text embedding slot.
            embed_parts.append(text_embeds[pos:pos + 1])
            mask_parts.append(text_attention_mask[pos:pos + 1])
            if text_labels is not None:
                label_parts.append(text_labels[pos:pos + 1])
            running_pos += 1

        prev_pos = pos + 1

    if prev_pos < text_ids.shape[0]:
        embed_parts.append(text_embeds[prev_pos:])
        mask_parts.append(text_attention_mask[prev_pos:])
        if text_labels is not None:
            label_parts.append(text_labels[prev_pos:])

    inputs_embeds = torch.cat(embed_parts, dim=0)
    attention_mask = torch.cat(mask_parts, dim=0)
    labels = torch.cat(label_parts, dim=0) if text_labels is not None else None

    if inputs_embeds.shape[0] > max_seq_len:
        logger.warning(
            "Multimodal sequence %d exceeds max_seq_len %d, truncating",
            inputs_embeds.shape[0],
            max_seq_len,
        )
        inputs_embeds = inputs_embeds[:max_seq_len]
        attention_mask = attention_mask[:max_seq_len]
        if labels is not None:
            labels = labels[:max_seq_len]
        spans = [(s, min(e, max_seq_len)) for s, e in spans if s < max_seq_len]

    position_ids = torch.arange(inputs_embeds.shape[0], device=inputs_embeds.device, dtype=torch.long)
    out = MultimodalInput(
        inputs_embeds=inputs_embeds,
        attention_mask=attention_mask,
        labels=labels,
        position_ids=position_ids,
        image_spans=spans,
    )
    return out.inputs_embeds if return_legacy_tensor else out
