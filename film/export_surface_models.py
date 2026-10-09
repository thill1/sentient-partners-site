"""Reuse the film's cars and vessels without waiting for sprite rendering."""
import json
import pathlib
import sys

import bpy
from mathutils import Matrix

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from model_geometry import export_meshes

root = pathlib.Path(bpy.path.abspath("//")).parent
models = {}
for kind, name in {"sedan": "Car000", "suv": "Car003", "truck": "Car001", "coach": "Car018", "ship": "ContainerShip", "ferry": "Ferry1", "pilot": "Boat_Pilot", "sail": "Sail0"}.items():
    obj = bpy.data.objects[name]
    obj.animation_data_clear()
    obj.rotation_mode = "XYZ"
    obj.location = (0, 0, 0)
    obj.rotation_euler = (0, 0, 0)
    bpy.context.view_layer.update()
    models[kind] = export_meshes((obj, *(child for child in obj.children_recursive if not child.name.startswith("Wake"))), obj.matrix_world.inverted())

# These write depth only in the browser, hiding boats behind land and vehicles
# behind deck/tower geometry. Simplify terrain only for the invisible mask.
occluders = []
for obj in list(bpy.data.objects):
    if obj.name in {"Roadway", "TowerN", "TowerS", "DeckSurface", "Terrain", "Alcatraz", "YerbaBuena", "AngelIsland", "EastBayHills"} or (obj.name.startswith("Tower") and obj.type == "MESH"):
        copy = obj.copy()
        copy.data = obj.data.copy()
        bpy.context.scene.collection.objects.link(copy)
        if obj.name == "Terrain":
            modifier = copy.modifiers.new("Occlusion simplification", "DECIMATE")
            modifier.ratio = .1
        bpy.context.view_layer.update()
        for mesh in export_meshes([copy], Matrix.Identity(4)):
            occluders.append(mesh["positions"])
        bpy.data.objects.remove(copy, do_unlink=True)

# Water writes depth without repainting the film, hiding submerged hulls.
occluders.append([-50000, -50000, 0, 50000, -50000, 0, 50000, 50000, 0, -50000, -50000, 0, 50000, 50000, 0, -50000, 50000, 0])
output = root / "public" / "film" / "traffic" / "models.json"
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(json.dumps({"models": models, "occluders": occluders}, separators=(",", ":")) + "\n")
print(f"Exported {len(models)} traffic models and {len(occluders)} occlusion meshes to {output}")

# Conservative navigation cells include their four corners, keeping complete
# hulls clear of the terrain and islands rather than clipping them afterward.
land = []
for name in ("Terrain", "Alcatraz", "YerbaBuena", "AngelIsland", "EastBayHills"):
    obj = bpy.data.objects.get(name)
    if not obj:
        continue
    bounds = [obj.matrix_world @ __import__('mathutils').Vector(v) for v in obj.bound_box]
    land.append((obj, obj.matrix_world.inverted(), [min(v[i] for v in bounds) for i in range(2)], [max(v[i] for v in bounds) for i in range(2)]))
from mathutils import Vector


def is_water(x, y):
    for obj, inverse, minimum, maximum in land:
        if not (minimum[0] <= x <= maximum[0] and minimum[1] <= y <= maximum[1]):
            continue
        hit, location, _normal, _face = obj.ray_cast(inverse @ Vector((x, y, 1500)), inverse.to_3x3() @ Vector((0, 0, -1)))
        if hit and (obj.matrix_world @ location).z > -2:
            return False
    return True


grid = {"x": -2500, "y": -6500, "step": 100, "width": 126, "height": 111}
grid["cells"] = [int(all(is_water(grid["x"] + ix * 100 + ox, grid["y"] + iy * 100 + oy) for ox, oy in ((0, 0), (-50, -50), (-50, 50), (50, -50), (50, 50)))) for iy in range(grid["height"]) for ix in range(grid["width"])]
water_output = output.parent / "water.json"
water_output.write_text(json.dumps(grid, separators=(",", ":")) + "\n")
print(f"Exported {len(grid['cells'])} navigable-water cells to {water_output}")
