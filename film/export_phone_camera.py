"""Per-frame camera for the phone film (lens and framing change per shot).

  blender -b <run>/phone/phone-sunset.blend --python film/export_phone_camera.py -- OUT.json

Like film/export_camera.py, plus each frame's horizontal half-angle tangent
`tx` (the lens is animated) and the portrait aspect 9/16. Browser layers use
pose.tx when present.
"""
import json
import math
import sys

import bpy

out = sys.argv[sys.argv.index("--") + 1]
s = bpy.context.scene
cam = s.camera
aspect = 9 / 16
frames = []
for f in range(s.frame_start, s.frame_end + 1):
    s.frame_set(f)
    m = cam.matrix_world
    r = (m.to_3x3().col[0]).normalized()
    u = (m.to_3x3().col[1]).normalized()
    fw = (-m.to_3x3().col[2]).normalized()
    tan_v = cam.data.sensor_height / (2 * cam.data.lens)
    frames.append({"p": [round(c, 3) for c in m.translation], "r": [round(c, 5) for c in r],
                   "u": [round(c, 5) for c in u], "f": [round(c, 5) for c in fw], "tx": round(tan_v * aspect, 6)})
first = frames[0]
data = {"fov": round(2 * math.atan(first["tx"]), 6), "aspect": aspect, "frames": frames, "open": first, "city": frames[-1]}
open(out, "w").write(json.dumps(data, separators=(",", ":")))
print("phone camera:", len(frames), "frames ->", out)
