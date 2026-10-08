"""Export the camera for every film frame, so the page can draw live objects
(aircraft on random paths) in the same 3D space as the rendered frames.

  blender -b film/descent.blend --python film/export_camera.py

Writes public/film/camera.json: for the descent (frames 1..239, step 2) and
the two held loops, the camera position and its right, up and forward
vectors in world space, plus the horizontal field of view.
"""
import json
import math
import pathlib

import bpy
from mathutils import Vector

s = bpy.context.scene
cam = s.camera


def pose():
    m = cam.matrix_world
    q = m.to_quaternion()
    return {
        "p": [round(c, 2) for c in m.translation],
        "r": [round(c, 5) for c in q @ Vector((1, 0, 0))],
        "u": [round(c, 5) for c in q @ Vector((0, 1, 0))],
        "f": [round(c, 5) for c in q @ Vector((0, 0, -1))],
    }


fov = 2 * math.atan(cam.data.sensor_width / (2 * cam.data.lens))
frames = []
for frame in range(1, 241, 2):
    s.frame_set(frame)
    frames.append(pose())
s.frame_set(1)
opening = pose()
s.frame_set(240)
city = pose()
out = {"fov": round(fov, 5), "aspect": 16 / 9, "frames": frames, "open": opening, "city": city}
path = pathlib.Path(bpy.path.abspath("//")).parent / "public" / "film" / "camera.json"
path.write_text(json.dumps(out))
print("camera:", len(frames), "frames, fov", round(math.degrees(fov), 1), "->", path)
