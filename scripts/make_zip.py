"""Zip a staged integration directory (files at the zip root) and verify its structure."""
import json
import os
import sys
import zipfile

stage, out, version = sys.argv[1:4]

if version:
    manifest_path = os.path.join(stage, "manifest.json")
    with open(manifest_path, encoding="utf-8") as f:
        manifest = json.load(f)
    manifest["version"] = version
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)
        f.write("\n")

os.makedirs(os.path.dirname(out), exist_ok=True)
if os.path.exists(out):
    os.remove(out)

with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as zf:
    for base, _, files in os.walk(stage):
        for name in sorted(files):
            full = os.path.join(base, name)
            zf.write(full, os.path.relpath(full, stage).replace(os.sep, "/"))

with zipfile.ZipFile(out) as zf:
    names = set(zf.namelist())
for required in ("manifest.json", "__init__.py", "panel/panel-wrapper.js"):
    if required not in names:
        sys.exit(f"zip is missing {required}")
print(f"OK: {out} ({len(names)} files)")
