"""Export the existing detailed Blender airliner for continuous browser flight.

Reads geometry and materials only; no render, scene save or GPU queue work.
"""
import json
import pathlib
import runpy

import bpy

root = pathlib.Path(bpy.path.abspath("//")).parent
# Reuse the aircraft refinement source; this remains an in-memory operation.
runpy.run_path(str(root / "film" / "build" / "aircraft.py"), run_name="__main__")

plane = bpy.data.objects["AirlinerNear"]
plane.animation_data_clear()
plane.rotation_mode = "XYZ"
plane.location = (0, 0, 0)
plane.rotation_euler = (0, 0, 0)
bpy.context.view_layer.update()
import sys
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from model_geometry import export_meshes
meshes = export_meshes((plane, *plane.children_recursive), plane.matrix_world.inverted())

output = root / "public" / "film" / "aircraft" / "airliner.json"
output.write_text(json.dumps({"model": plane.name, "forward": "+Y", "meshes": meshes}, separators=(",", ":")) + "\n")
print(f"Exported {sum(len(g['positions']) // 9 for g in meshes)} triangles, {len(meshes)} materials to {output}")
