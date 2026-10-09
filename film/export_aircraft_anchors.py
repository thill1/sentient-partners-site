"""Export light positions from the same geometry and camera used by sprites.py.

This does not render or save the scene. Run after changing the aircraft model:
  blender -b film/descent.blend --python-exit-code 1 --python film/export_aircraft_anchors.py
"""
import json
import math
import pathlib

import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector

scene = bpy.context.scene
plane = bpy.data.objects["AirlinerNear"]
plane.animation_data_clear()
plane.rotation_mode = "XYZ"
plane.location = (0, 0, 0)
plane.rotation_euler = (0, 0, 0)

anchors = {}
for name, material_name in {"red": "NavRed", "green": "NavGreen", "tail": "NavWhite", "strobe": "Strobe"}.items():
    material_index = next(i for i, material in enumerate(plane.data.materials) if material.name == material_name)
    indices = {index for face in plane.data.polygons if face.material_index == material_index for index in face.vertices}
    vertices = [plane.data.vertices[index].co for index in indices]
    # These housings are symmetric meshes. Their bounding-box centre is the
    # actual bulb, including the swept-back wing and its height above the skin.
    anchors[name] = Vector(tuple((min(v[axis] for v in vertices) + max(v[axis] for v in vertices)) / 2 for axis in range(3)))

camera_data = bpy.data.cameras.new("AnchorCamera")
camera_data.lens = 85
camera = bpy.data.objects.new("AnchorCamera", camera_data)
scene.collection.objects.link(camera)
scene.render.resolution_x = scene.render.resolution_y = 384
scene.render.resolution_percentage = 100
scene.render.pixel_aspect_x = scene.render.pixel_aspect_y = 1
views = {}
for elevation_name, elevation in (("below", -10), ("above", 12)):
    for heading in range(16):
        azimuth = heading * math.tau / 16
        angle = math.radians(elevation)
        view = Vector((math.sin(azimuth) * math.cos(angle), -math.cos(azimuth) * math.cos(angle), math.sin(angle)))
        camera.location = view * 190
        camera.rotation_euler = (-view).to_track_quat("-Z", "Y").to_euler()
        bpy.context.view_layer.update()
        positions = {}
        for name, point in anchors.items():
            projected = world_to_camera_view(scene, camera, plane.matrix_world @ point)
            direction = point - camera.location
            hit, location, _normal, _face = plane.ray_cast(camera.location, direction.normalized(), distance=direction.length + 1)
            visible = hit and (location - point).length < 1.2
            positions[name] = {"x": round(projected.x - 0.5, 8), "y": round(0.5 - projected.y, 8), "visible": bool(visible)}
        views[f"{elevation_name}-{heading}"] = positions

root = pathlib.Path(bpy.path.abspath("//")).parent
output = root / "public" / "film" / "aircraft" / "anchors.json"
output.write_text(json.dumps({"model": plane.name, "bulbs": {name: list(point) for name, point in anchors.items()}, "views": views}, separators=(",", ":")) + "\n")
print(f"Exported {len(views)} aircraft views to {output}")
