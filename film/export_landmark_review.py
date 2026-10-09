"""Export the revised bridge geometry for inspection without a GPU render."""
import json
import pathlib
import runpy
import sys

import bpy
from mathutils import Matrix

root = pathlib.Path(bpy.path.abspath("//")).parent
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from model_geometry import export_meshes

runpy.run_path(str(root / "film" / "build" / "landmarks.py"), run_name="__main__")
models = {}
for name, objects in {
    "west": ["BayBridge", "BayBridgeCables"],
    "east": ["BayBridgeEast", "BayBridgeEastCables"],
    "transition": ["BayBridgeIslandTransition"],
}.items():
    models[name] = export_meshes([bpy.data.objects[obj] for obj in objects], Matrix.Identity(4))
output = root / "output" / "playwright" / "geometry" / "bay-bridge-review.json"
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(json.dumps({"models": models}, separators=(",", ":")) + "\n")
print(f"Bridge review geometry exported to {output}")
