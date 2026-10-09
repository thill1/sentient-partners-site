"""Bake a held-camera loop's cross-fade into its frames.

  python3 film/seamless_loop.py public/film/preview/sunset-open public/film/sunset-open-seamless

The page used to play frames blend..N-1 and, over the last `blend` of them,
draw the first frames on top with rising opacity. Two full-screen images per
frame at Retina size cost ~70-120 ms in the browser, a hitch every loop that
stopped the aircraft. Here the same fade is done once: the output is N-blend
frames that loop seamlessly with a single image each. Same for the m/ size.
"""
import pathlib
import sys

from PIL import Image

src, dst = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
for sub in ("", "m"):
    frames = sorted((src / sub).glob("[0-9][0-9][0-9][0-9].webp"))
    count = len(frames)
    blend = min(10, count // 4)
    span = count - blend
    out = dst / sub
    out.mkdir(parents=True, exist_ok=True)
    for j in range(span):
        index = j + blend
        image = Image.open(frames[index]).convert("RGB")
        into = index - span
        if into >= 0:
            head = Image.open(frames[into]).convert("RGB")
            image = Image.blend(image, head, (into + 1) / (blend + 1))
        image.save(out / f"{j + 1:04d}.webp", "WEBP", quality=90 if not sub else 88, method=6)
    print(f"{out}: {span} seamless frames from {count}")
