"""Dev-only hot reload for pure modules (e.g. ``db.repository``).

Active only when ``HOME_INVENTORY_DEV=1``; otherwise a no-op.
"""
import importlib
import logging
import os
from types import ModuleType

_LOGGER = logging.getLogger(__name__)
_mtimes: dict[str, float] = {}


def enabled() -> bool:
    return os.environ.get("HOME_INVENTORY_DEV") == "1"


def reload_if_changed(module: ModuleType) -> bool:
    """Reload ``module`` in place if its source file changed. Returns True if reloaded."""
    if not enabled():
        return False
    path = getattr(module, "__file__", None)
    if not path:
        return False
    try:
        mtime = os.stat(path).st_mtime
    except OSError:
        return False
    name = module.__name__
    last = _mtimes.setdefault(name, mtime)
    if mtime == last:
        return False
    try:
        importlib.reload(module)
    except Exception:
        _LOGGER.exception("Dev reload of %s failed", name)
        return False
    _mtimes[name] = mtime
    _LOGGER.debug("Dev reload: %s", name)
    return True
