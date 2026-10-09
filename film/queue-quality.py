"""Render an isolated 1600x900 / 32-sample candidate without replacing site assets.

Run: python3 film/queue-quality.py <run-directory>
Repeat the same command to resume. Inputs are snapshotted on first launch.
Completed WebP sequences remain in <run-directory>/web for visual review.
"""
import fcntl
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
RUN = Path(sys.argv[1]).resolve()
RUN.mkdir(parents=True, exist_ok=True)
lock = (RUN / "queue.lock").open("w")
fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
BLENDER = "/opt/homebrew/bin/blender"


def checked_image(path, size):
    try:
        with Image.open(path) as image:
            image.load()
            return image.size == size
    except (OSError, ValueError):
        return False


def command(args, log, env=None):
    with (RUN / log).open("a") as output:
        subprocess.run(args, cwd=ROOT, env=env, stdout=output,
                       stderr=subprocess.STDOUT, check=True)


inputs = RUN / "inputs"
if not inputs.exists():
    pending = RUN / "inputs-pending"
    pending.mkdir(exist_ok=True)
    shutil.copy2(ROOT / "film/descent.blend", pending / "descent.blend")
    shutil.copy2(ROOT / "film/render.py", pending / "render.py")
    shutil.copy2(ROOT / "film/rebuild.py", pending / "rebuild.py")
    shutil.copytree(ROOT / "film/build", pending / "build", dirs_exist_ok=True)
    pending.rename(inputs)

for kind, seed in (("sunset", 1903), ("day", 2718), ("night", 3141)):
    scene = RUN / f"descent-{kind}.blend"
    if not scene.exists():
        rebuilt = RUN / f"rebuilt-{kind}.blend"
        if not rebuilt.exists():
            command([BLENDER, "-b", str(inputs / "descent.blend"),
                     "--python-exit-code", "1", "--python", str(inputs / "rebuild.py"),
                     "--", str(rebuilt)], f"rebuild-{kind}.log")
        pending_scene = RUN / f"pending-{kind}.blend"
        command([BLENDER, "-b", str(rebuilt),
                 "--python-exit-code", "1", "--python", str(inputs / "build/clean_background.py"),
                 "--python", str(inputs / "build/ceiling_link.py"),
                 "--python-expr", f"import bpy; bpy.ops.wm.save_as_mainfile(filepath={str(pending_scene)!r})"],
                f"build-{kind}.log", dict(os.environ, BOAT_SEED=str(seed)))
        pending_scene.rename(scene)
    for suffix, first, last, hold in (("-open", 1, 95, 1), ("", 1, 239, None), ("-city", 146, 240, 240)):
        name = kind + suffix
        frames = list(range(first, last + 1, 2))
        directory = RUN / "frames" / name
        directory.mkdir(parents=True, exist_ok=True)
        missing = [n for n in frames if not checked_image(directory / f"{kind}-{n:04d}.png", (1600, 900))]
        print(f"{name}: {len(frames) - len(missing)}/{len(frames)} rendered; 1600x900, 32 samples", flush=True)
        if missing:
            env = dict(os.environ)
            env.pop("HOLD", None)
            if hold is not None:
                env["HOLD"] = str(hold)
            command([BLENDER, "-b", str(scene), "--python-exit-code", "1",
                     "--python", str(inputs / "render.py"), "--", kind,
                     str(first), str(last), "2", str(directory) + "@" + ",".join(map(str, missing)),
                     "100", "32"], f"render-{name}.log", env)
        web = RUN / "web" / name
        (web / "m").mkdir(parents=True, exist_ok=True)
        for index, frame in enumerate(frames, 1):
            source = directory / f"{kind}-{frame:04d}.png"
            if not checked_image(source, (1600, 900)):
                raise RuntimeError(f"Incomplete render: {source}")
            with Image.open(source) as image:
                image = image.convert("RGB")
                image.save(web / f"{index:04d}.webp", "WEBP", quality=90, method=6)
                image.resize((768, 432), Image.Resampling.LANCZOS).save(
                    web / "m" / f"{index:04d}.webp", "WEBP", quality=88, method=6)
            for path, size in ((web / f"{index:04d}.webp", (1600, 900)),
                               (web / "m" / f"{index:04d}.webp", (768, 432))):
                if not checked_image(path, size):
                    raise RuntimeError(f"Invalid encoded frame: {path}")
        (web / "complete.json").write_text(json.dumps({"frames": len(frames), "samples": 32, "size": [1600, 900]}))
        print(f"{name}: complete, validated, ready for visual review at {web}", flush=True)
print("QUEUE_DONE: candidates ready for review; current site assets preserved", flush=True)
