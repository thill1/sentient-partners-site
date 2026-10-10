"""The phone film's camera: six composed shots joined by smooth flight.

Shots (owner-approved composition, 2026-10-09), each held at its keyframe:
  1 tower top above the fog   2 descending the tower   3 at the deck
  4 the swoop under the span  5 crossing the Bay       6 the city
The camera and a look-at target are keyframed with ease in/out so the
flight settles on each shot. 24 frames between shots: frames 1, 25, 49,
73, 97, 121. Portrait 9:16, vertical sensor fit.
"""
import bpy
from mathutils import Vector

SHOTS = [
    ((-300, -430, 236), (0, -640, 205), 34),
    ((-190, -470, 200), (0, -640, 165), 30),  # fog surface at eye level (top ~150-205 m)
    ((-140, -540, 118), (0, -640, 95), 28),
    ((-40, -430, 28), (25, -120, 72), 22),
    ((3000, 650, 42), (5800, -3300, 70), 40),
    ((4700, -1450, 46), (6440, -4455, 140), 52),
]
STEP = 24
s = bpy.context.scene
cam = s.camera
cam.animation_data_clear()
if cam.data.animation_data:
    cam.data.animation_data_clear()
for c in list(cam.constraints):
    cam.constraints.remove(c)
target = bpy.data.objects.get("PhoneLook") or bpy.data.objects.new("PhoneLook", None)
if target.name not in s.collection.objects:
    s.collection.objects.link(target)
target.animation_data_clear()
track = cam.constraints.new("TRACK_TO")
track.target = target
track.track_axis = "TRACK_NEGATIVE_Z"
track.up_axis = "UP_Y"
cam.data.sensor_fit = "VERTICAL"
cam.data.sensor_height = cam.data.sensor_width
for k, (pos, look, lens) in enumerate(SHOTS):
    f = 1 + k * STEP
    cam.location = pos
    cam.keyframe_insert("location", frame=f)
    target.location = look
    target.keyframe_insert("location", frame=f)
    cam.data.lens = lens
    cam.data.keyframe_insert("lens", frame=f)
# A waypoint between shots 5 and 6 so the flight passes south of Alcatraz
# (the straight line crossed the island 5 m above the rock).
s.frame_set(109)
cam.location = (3900, -820, 45)
cam.keyframe_insert("location", frame=109)
for owner in (cam, target, cam.data):
    for curve in owner.animation_data.action.fcurves if hasattr(owner.animation_data.action, "fcurves") else []:
        for key in curve.keyframe_points:
            key.interpolation = "BEZIER"
            key.easing = "AUTO"
s.frame_start, s.frame_end = 1, 1 + STEP * (len(SHOTS) - 1)

# Keep the flight off the ground: sample the path against the terrain.
dg = bpy.context.evaluated_depsgraph_get()
low = []
for f in range(s.frame_start, s.frame_end + 1):
    s.frame_set(f)
    p = cam.matrix_world.translation
    hit, loc, *_ = s.ray_cast(bpy.context.evaluated_depsgraph_get(), p + Vector((0, 0, 0.5)), Vector((0, 0, -1)))
    if hit and p.z - loc.z < 8:
        low.append((f, round(p.z - loc.z, 1)))
print("phone path:", len(SHOTS), "shots,", s.frame_end, "frames; low clearance:", low[:10])
