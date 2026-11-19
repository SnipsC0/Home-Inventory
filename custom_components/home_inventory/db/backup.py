"""Automatic pre-migration backup of the integration data (pure module, no HA imports)."""
import logging
import os
import sqlite3
import tempfile
import time
import zipfile

_LOGGER = logging.getLogger(__name__)

BACKUP_NAME = "home_inventory_backup"
_STORED_EXT = {".jpg", ".jpeg", ".png", ".webp", ".gif"}


def backup_data(conn: sqlite3.Connection, data_dir: str, backup_dir: str) -> str:
    """Zip ``data_dir`` (consistent DB snapshot + images/config) into ``backup_dir``.

    ``data_dir`` is ``<config>/data/home_inventory``; the zip lands next to it as
    ``<config>/data/home_inventory_backup.zip`` (a timestamp is added if that name is
    taken, so an older backup is never overwritten). Returns the zip path.
    """
    os.makedirs(backup_dir, exist_ok=True)
    zip_path = os.path.join(backup_dir, f"{BACKUP_NAME}.zip")
    if os.path.exists(zip_path):
        zip_path = os.path.join(
            backup_dir, f"{BACKUP_NAME}_{time.strftime('%Y%m%d-%H%M%S')}.zip"
        )
    tmp_zip = zip_path + ".part"

    db_file = os.path.abspath(
        next(r[2] for r in conn.execute("PRAGMA database_list") if r[1] == "main")
    )
    db_dir = os.path.dirname(db_file)

    with tempfile.TemporaryDirectory() as tmp:
        snapshot = os.path.join(tmp, os.path.basename(db_file))
        dest = sqlite3.connect(snapshot)
        try:
            conn.backup(dest)  # consistent copy, WAL included
        finally:
            dest.close()

        try:
            with zipfile.ZipFile(tmp_zip, "w", zipfile.ZIP_DEFLATED) as zf:
                zf.write(snapshot, f"home_inventory/db/{os.path.basename(db_file)}")
                for base, _, files in os.walk(data_dir):
                    if os.path.abspath(base) == db_dir:
                        continue  # the live DB (+ -wal/-shm) is replaced by the snapshot
                    for name in files:
                        full = os.path.join(base, name)
                        arc = "home_inventory/" + os.path.relpath(full, data_dir).replace(
                            os.sep, "/"
                        )
                        ext = os.path.splitext(name)[1].lower()
                        zf.write(
                            full,
                            arc,
                            compress_type=zipfile.ZIP_STORED
                            if ext in _STORED_EXT
                            else zipfile.ZIP_DEFLATED,
                        )
            os.replace(tmp_zip, zip_path)
        finally:
            if os.path.exists(tmp_zip):
                os.remove(tmp_zip)

    return zip_path
