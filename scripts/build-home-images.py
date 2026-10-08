"""Build the homepage photographs from the originals in design-foundation.

Run from the repository root:  python3 scripts/build-home-images.py
Writes WebP files to public/home/. The redwoods original is only 685 px wide,
so its larger sizes are enlargements; replace it when a full-resolution file exists.
"""
from pathlib import Path
from PIL import Image, ImageFilter

SRC = Path("design-foundation/references/original-photography")
OUT = Path("public/home")
JOBS = [
    ("golden-gate-fog.jpg", "golden-gate-fog", [2048, 1280], 92),
    ("downtown-auburn.png", "downtown-auburn", [2048, 1200, 800], 80),
    ("redwoods.png", "redwoods", [2055, 1370, 685], 86),
]

OUT.mkdir(parents=True, exist_ok=True)
for filename, stem, widths, quality in JOBS:
    image = Image.open(SRC / filename).convert("RGB")
    for width in widths:
        height = round(image.height * width / image.width)
        resized = image if width == image.width else image.resize((width, height), Image.LANCZOS)
        if width > image.width * 1.5:
            # An enlargement: recover a little edge contrast so it holds up at half the viewport.
            resized = resized.filter(ImageFilter.UnsharpMask(radius=2.2, percent=70, threshold=2))
        target = OUT / f"{stem}-{width}.webp"
        resized.save(target, "WEBP", quality=quality, method=6)
        print(f"{target}  {width}x{height}  {target.stat().st_size // 1024} KB")
