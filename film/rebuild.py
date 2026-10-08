"""Rebuild the Blender scene from its source passes and save to a new file.

  blender -b film/descent.blend --python film/rebuild.py -- /tmp/descent.blend

The output path is required so an incomplete build can never overwrite the
last known-good scene.
"""
import pathlib
import runpy
import sys

import bpy

ROOT = pathlib.Path(__file__).resolve().parent
PASSES = ("bridge.py", "boats.py", "cars.py", "aircraft.py", "water.py", "fog.py", "camera.py")
args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
if len(args) != 1:
    raise SystemExit("usage: blender -b film/descent.blend --python film/rebuild.py -- OUTPUT.blend")

for filename in PASSES:
    print(f"rebuild: {filename}", flush=True)
    runpy.run_path(str(ROOT / "build" / filename))

scene = bpy.context.scene
scene.frame_set(1)
print("rebuild counts:", [(coll.name, len(coll.objects)) for coll in bpy.data.collections], flush=True)
bpy.ops.wm.save_as_mainfile(filepath=str(pathlib.Path(args[0]).resolve()))
