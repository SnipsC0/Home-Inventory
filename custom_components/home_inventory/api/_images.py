"""Shared image-file helpers for the API views."""
import logging
import os

from ..const import DOMAIN
from ..images import THUMB_WIDTHS, thumb_path

_LOGGER = logging.getLogger(__name__)


def delete_image_file(hass, image_path):
    """Physically delete an uploaded image from disk (no-op for empty or /local/ paths)."""
    if not image_path:
        return

    try:
        if image_path.startswith(f'/api/{DOMAIN}/images/'):
            filename = image_path.split('/')[-1].split('?')[0]
        elif image_path.startswith('/local/'):
            return
        else:
            filename = image_path

        # Never follow a path outside the images folder
        filename = os.path.basename(filename)
        if not filename:
            return

        full_path = hass.config.path(f"data/{DOMAIN}/images/{filename}")

        images_dir = hass.config.path(f"data/{DOMAIN}/images")
        for width in THUMB_WIDTHS:
            try:
                os.remove(thumb_path(images_dir, filename, width))
            except OSError:
                pass

        if os.path.exists(full_path):
            os.remove(full_path)
            _LOGGER.info(f"[Home Inventory] 🗑️ Deleted image file: {full_path}")
        else:
            _LOGGER.debug(f"[Home Inventory] Image file not found: {full_path}")

    except Exception as e:
        _LOGGER.error(f"[Home Inventory] Error deleting image file: {e}", exc_info=True)
