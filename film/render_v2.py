"""Render the approved v2 scene (full Bay Bridge, Coit Tower, trees, golden hour,
fog openings) for one time of day, resumable, into the single run folder.

  nohup python3 -I film/render_v2.py sunset >> <run>/render-v2.log 2>&1 &

Order: opening loop, descent, city loop, each at the site's final quality
(1600x900, 32 samples). Frames already rendered and valid are skipped, so a
stopped run resumes where it left off. Never creates another run folder.
"""
import os
import pathlib
import shutil
import subprocess
import sys

from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parents[1]
RUN = ROOT / "film/frames/live-background-20261008-134539"
BLENDER = "/opt/homebrew/bin/blender"
kind = sys.argv[1] if len(sys.argv) > 1 else "sunset"

scene = RUN / f"descent-{kind}-v2.blend"
if not scene.exists():
    shutil.copy2(ROOT / "film/test/city.blend", scene)   # frozen copy of the approved scene


def valid(path):
    try:
        with Image.open(path) as image:
            image.load()
            return image.size == (1600, 900)
    except Exception:  # noqa: BLE001
        return False


for suffix, first, last, hold in (("-open", 1, 95, 1), ("", 1, 239, None), ("-city", 146, 240, 240)):
    name = f"{kind}-v2{suffix}"
    out = RUN / "frames" / name
    out.mkdir(parents=True, exist_ok=True)
    frames = list(range(first, last + 1, 2))
    missing = [f for f in frames if not valid(out / f"{kind}-{f:04d}.png")]
    print(f"{name}: {len(frames) - len(missing)}/{len(frames)} done", flush=True)
    if missing:
        env = dict(os.environ)
        env.pop("HOLD", None)
        if hold:
            env["HOLD"] = str(hold)
        subprocess.run([BLENDER, "-b", str(scene), "--python-exit-code", "1", "--python", str(ROOT / "film/render.py"),
                        "--", kind, str(first), str(last), "2", f"{out}@" + ",".join(map(str, missing)), "100", "32"],
                       env=env, check=True, stdout=open(RUN / f"render-{name}.log", "a"), stderr=subprocess.STDOUT)
    print(f"{name}: complete", flush=True)
print("V2_DONE", kind, flush=True)
