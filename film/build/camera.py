"""The camera path.

Above the fog, down through it beside the north tower, out of its base just
above deck height (so the traffic on the roadway is in view), under the span,
then low over the water along the north shore and round to face the downtown
skyline across open water. Every point is over water or above the terrain.
"""
import math

import bpy

cam = bpy.data.objects["Camera"]
cam.animation_data_clear()


def yaw_towards(fx, fy):
    """rotation_euler.z for a camera pitched to the horizon looking along (fx, fy)."""
    return math.atan2(-fx, fy)


# frame: (x, y, z), pitch (rad from straight down; pi/2 = horizon), facing (x, y)
KEYS = [
    (1, (-2900, 1700, 900), 1.41, (0.73, -0.68)),
    (55, (-2100, 1250, 560), 1.45, (0.71, -0.70)),
    (100, (-1150, 760, 300), 1.50, (0.66, -0.75)),
    (125, (-680, 520, 196), 1.53, (0.64, -0.77)),
    (140, (-440, 370, 146), 1.50, (0.68, -0.73)),
    (150, (-300, 290, 118), 1.46, (0.74, -0.67)),
    (159, (-170, 215, 96), 1.44, (0.80, -0.60)),
    (167, (-100, 145, 70), 1.50, (0.84, -0.54)),
    (174, (-55, 75, 40), 1.55, (0.87, -0.50)),
    (182, (20, -10, 24), 1.565, (0.88, -0.48)),
    (197, (700, -260, 26), 1.57, (0.92, -0.40)),
    (212, (1900, -480, 28), 1.575, (0.90, -0.43)),
    (226, (3400, -560, 34), 1.58, (0.74, -0.67)),
    (240, (4700, -1450, 46), 1.585, (0.47, -0.88)),
]

previous = None
for frame, loc, pitch, facing in KEYS:
    yaw = yaw_towards(*facing)
    # Keep yaw continuous so interpolation never spins the long way round.
    if previous is not None:
        while yaw - previous > math.pi:
            yaw -= 2 * math.pi
        while yaw - previous < -math.pi:
            yaw += 2 * math.pi
    previous = yaw
    cam.location = loc
    cam.rotation_euler = (pitch, 0.0, yaw)
    cam.keyframe_insert("location", frame=frame)
    cam.keyframe_insert("rotation_euler", frame=frame)

action = cam.animation_data.action
curves = []
try:
    curves = list(action.fcurves)
except AttributeError:
    for layer in action.layers:
        for strip in layer.strips:
            for bag in strip.channelbags:
                curves += list(bag.fcurves)
for fc in curves:
    for k in fc.keyframe_points:
        k.interpolation = "BEZIER"
        k.handle_left_type = k.handle_right_type = "AUTO_CLAMPED"
    fc.update()

s = bpy.context.scene
deps = bpy.context.evaluated_depsgraph_get()
from mathutils import Vector  # noqa: E402

SOLID = ("Terrain", "Buildings", "BuildingsInfill", "Transamerica", "Sky_")
for f in range(1, 241):
    s.frame_set(f)
    deps = bpy.context.evaluated_depsgraph_get()
    p = cam.matrix_world.translation.copy()
    probes = [Vector((0, 0, 1))] + [Vector((math.cos(a), math.sin(a), 0)) for a in (0, 1.57, 3.14, 4.71)]
    for d in probes:
        hit = s.ray_cast(deps, p, d, distance=600 if d.z else 25)
        if hit[0] and hit[4].name.startswith(SOLID):
            print(f"camera: WARNING frame {f} at {tuple(round(v) for v in p)} hits {hit[4].name} towards {tuple(d)}")
s.frame_set(1)
print("camera: path set")
