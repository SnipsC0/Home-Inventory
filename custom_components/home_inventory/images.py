"""Thumbnail helpers (pure module: no Home Assistant / aiohttp imports)."""
import logging
import os
from typing import Optional

from PIL import Image, ImageOps

_LOGGER = logging.getLogger(__name__)

# Widths the API will generate; anything else falls back to the original.
THUMB_WIDTHS = (96, 480, 800)
CARD_WIDTH = 480
THUMB_QUALITY = 80
THUMBS_DIRNAME = ".thumbs"


def parse_width(value: Optional[str]) -> Optional[int]:
    """Return an allowed thumbnail width from a query value, else None."""
    try:
        width = int(value) if value is not None else None
    except (TypeError, ValueError):
        return None
    return width if width in THUMB_WIDTHS else None


def thumb_path(images_dir: str, filename: str, width: int) -> str:
    return os.path.join(images_dir, THUMBS_DIRNAME, str(width), filename)


def make_thumbnail(src_path: str, dst_path: str, width: int) -> bool:
    """Write a JPEG thumbnail (longest side <= width). Returns True on success."""
    tmp_path = f"{dst_path}.tmp"
    try:
        os.makedirs(os.path.dirname(dst_path), exist_ok=True)
        with Image.open(src_path) as img:
            img = ImageOps.exif_transpose(img)
            img.thumbnail((width, width), Image.Resampling.LANCZOS)
            if img.mode != "RGB":
                img = img.convert("RGB")
            img.save(
                tmp_path,
                format="JPEG",
                quality=THUMB_QUALITY,
                optimize=True,
                progressive=True,
            )
        os.replace(tmp_path, dst_path)  # atomic: readers never see a partial file
        return True
    except Exception as err:  # noqa: BLE001 - never break serving over a thumb
        _LOGGER.warning("Could not create thumbnail for %s: %s", src_path, err)
        try:
            os.remove(tmp_path)
        except OSError:
            pass
        return False


def ensure_thumbnail(images_dir: str, filename: str, width: int) -> str:
    """Path of the cached thumbnail, creating it if needed.

    Falls back to the original file if the thumbnail can't be produced.
    Filenames are unique (never overwritten), so cached thumbs never go stale.
    """
    original = os.path.join(images_dir, filename)
    target = thumb_path(images_dir, filename, width)
    if os.path.exists(target):
        return target
    return target if make_thumbnail(original, target, width) else original


def create_upload_thumbnails(images_dir: str, filename: str) -> None:
    """Pre-generate the card thumbnail right after an upload."""
    ensure_thumbnail(images_dir, filename, CARD_WIDTH)


def prune_thumbnails(images_dir: str) -> int:
    """Delete thumbnails whose original image no longer exists."""
    removed = 0
    for width in THUMB_WIDTHS:
        folder = os.path.join(images_dir, THUMBS_DIRNAME, str(width))
        if not os.path.isdir(folder):
            continue
        for name in os.listdir(folder):
            if os.path.exists(os.path.join(images_dir, name)):
                continue
            try:
                os.remove(os.path.join(folder, name))
                removed += 1
            except OSError:
                pass
    return removed
