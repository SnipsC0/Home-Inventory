import os

from PIL import Image

from home_inventory import images


def _make_image(path, size=(2000, 1500)):
    Image.new("RGB", size, (200, 30, 30)).save(path, format="JPEG")


def test_parse_width_whitelist():
    assert images.parse_width("480") == 480
    assert images.parse_width("800") == 800
    assert images.parse_width("123") is None
    assert images.parse_width("abc") is None
    assert images.parse_width(None) is None


def test_ensure_thumbnail_creates_smaller_cached_file(tmp_path):
    folder = str(tmp_path)
    _make_image(os.path.join(folder, "a.jpg"))

    path = images.ensure_thumbnail(folder, "a.jpg", 480)

    assert path == images.thumb_path(folder, "a.jpg", 480)
    with Image.open(path) as thumb:
        assert max(thumb.size) == 480
    assert os.path.getsize(path) < os.path.getsize(os.path.join(folder, "a.jpg"))
    # second call reuses the cache
    mtime = os.path.getmtime(path)
    assert images.ensure_thumbnail(folder, "a.jpg", 480) == path
    assert os.path.getmtime(path) == mtime


def test_small_image_is_not_upscaled(tmp_path):
    folder = str(tmp_path)
    _make_image(os.path.join(folder, "s.jpg"), size=(100, 80))
    with Image.open(images.ensure_thumbnail(folder, "s.jpg", 480)) as thumb:
        assert thumb.size == (100, 80)


def test_corrupt_image_falls_back_to_original(tmp_path):
    folder = str(tmp_path)
    bad = os.path.join(folder, "bad.jpg")
    with open(bad, "wb") as f:
        f.write(b"not an image")
    assert images.ensure_thumbnail(folder, "bad.jpg", 480) == bad
    assert not os.path.exists(images.thumb_path(folder, "bad.jpg", 480) + ".tmp")


def test_prune_removes_only_orphans(tmp_path):
    folder = str(tmp_path)
    _make_image(os.path.join(folder, "keep.jpg"))
    _make_image(os.path.join(folder, "gone.jpg"))
    images.create_upload_thumbnails(folder, "keep.jpg")
    images.create_upload_thumbnails(folder, "gone.jpg")
    os.remove(os.path.join(folder, "gone.jpg"))

    assert images.prune_thumbnails(folder) == 1
    assert os.path.exists(images.thumb_path(folder, "keep.jpg", 480))
    assert not os.path.exists(images.thumb_path(folder, "gone.jpg", 480))
