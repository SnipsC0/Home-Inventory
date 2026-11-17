import importlib
import os
import sys
import time

import pytest

from home_inventory.db import devreload


@pytest.fixture
def mod(tmp_path, monkeypatch):
    src = tmp_path / "fake_mod.py"
    src.write_text("VALUE = 1\n")
    monkeypatch.syspath_prepend(str(tmp_path))
    m = importlib.import_module("fake_mod")
    devreload._mtimes.pop("fake_mod", None)
    yield m, src
    sys.modules.pop("fake_mod", None)
    devreload._mtimes.pop("fake_mod", None)


def _touch_new(src, text):
    src.write_text(text)
    st = os.stat(src)
    os.utime(src, (st.st_atime, st.st_mtime + 5))


def test_noop_without_env(mod, monkeypatch):
    m, src = mod
    monkeypatch.delenv("HOME_INVENTORY_DEV", raising=False)
    assert devreload.reload_if_changed(m) is False
    _touch_new(src, "VALUE = 2\n")
    assert devreload.reload_if_changed(m) is False
    assert m.VALUE == 1


def test_reloads_when_changed_in_dev(mod, monkeypatch):
    m, src = mod
    monkeypatch.setenv("HOME_INVENTORY_DEV", "1")
    assert devreload.reload_if_changed(m) is False  # baseline
    _touch_new(src, "VALUE = 2\n")
    assert devreload.reload_if_changed(m) is True
    assert m.VALUE == 2
    assert devreload.reload_if_changed(m) is False  # unchanged now


def test_broken_reload_does_not_raise(mod, monkeypatch):
    m, src = mod
    monkeypatch.setenv("HOME_INVENTORY_DEV", "1")
    devreload.reload_if_changed(m)
    _touch_new(src, "VALUE = (\n")
    assert devreload.reload_if_changed(m) is False
    assert m.VALUE == 1
