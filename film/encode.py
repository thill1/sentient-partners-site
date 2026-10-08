"""Encode rendered frames for the web.

  python3 film/encode.py sunset

Reads film/frames/<kind>/<kind>-NNNN.png in frame order and writes
public/film/<kind>/0001.webp, 0002.webp, ... (1280 wide, and a 768-wide copy
in public/film/<kind>/m/ for phones). Already-encoded frames are skipped.
"""
import pathlib
import sys

from PIL import Image

kind = sys.argv[1]
src = pathlib.Path("film/frames") / kind
dst = pathlib.Path("public/film") / kind
(dst / "m").mkdir(parents=True, exist_ok=True)
frames = sorted(src.glob(f"{kind}-*.png"))
done = 0
for index, path in enumerate(frames, start=1):
    out = dst / f"{index:04d}.webp"
    if out.exists() and out.stat().st_mtime > path.stat().st_mtime:
        continue
    image = Image.open(path).convert("RGB")
    image.save(out, "WEBP", quality=84, method=5)
    image.resize((768, round(image.height * 768 / image.width)), Image.LANCZOS).save(dst / "m" / f"{index:04d}.webp", "WEBP", quality=82, method=5)
    done += 1
total = sum(p.stat().st_size for p in dst.glob("*.webp"))
print(f"{kind}: {len(frames)} frames, {done} newly encoded, {total // 1024} KB at full size")
