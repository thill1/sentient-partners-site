"""Golden Gate tower detail for the close hero shot.

The towers were plain boxes (four 6-face segments per leg). The real towers
read through their Art Deco detail, so this adds, for both towers:

- vertical ribs on every face of every leg segment, standing proud by 0.35 m
  between recessed panels (the fluted look in the owner's references);
- reveal bands where each leg steps in, at the strut levels;
- stepped lintels above and below each portal strut;
- the big X-brace between the legs below the roadway;
- a stepped cap on each leg top, with a red aviation beacon.

Geometry joins the existing International Orange material. Idempotent.
"""
import bmesh
import bpy
from mathutils import Matrix, Vector

NAMES = ("TowerDetail-640", "TowerDetail640")
for name in NAMES:
    if name in bpy.data.objects:
        bpy.data.objects.remove(bpy.data.objects[name], do_unlink=True)

orange = bpy.data.materials["International Orange"]
beacon = bpy.data.materials.get("NavRed")
collection = bpy.data.objects["Leg-640-10"].users_collection[0]


def box(bm, x0, x1, y0, y1, z0, z1, mi=0):
    geom = bmesh.ops.create_cube(bm, size=1.0, matrix=Matrix.Translation(((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)) @ Matrix.Diagonal(((x1 - x0), (y1 - y0), (z1 - z0), 1)))
    for v in geom["verts"]:
        for f in v.link_faces:
            f.material_index = mi


def bounds(name):
    o = bpy.data.objects[name]
    pts = [o.matrix_world @ Vector(c) for c in o.bound_box]
    return (min(p.x for p in pts), max(p.x for p in pts), min(p.y for p in pts), max(p.y for p in pts), min(p.z for p in pts), max(p.z for p in pts))


for tower in ("-640", "640"):
    bm = bmesh.new()
    sign_y = 1 if tower == "640" else -1
    for side in ("-1", "1"):
        for seg in range(4):
            name = f"Leg{tower}{side}{seg}"
            if name not in bpy.data.objects:
                continue
            x0, x1, y0, y1, z0, z1 = bounds(name)
            p = 0.35          # how far a rib stands proud
            w = 0.9           # rib width
            # Ribs on the two faces along the bridge (y faces): five across.
            for k in range(5):
                cx = x0 + (x1 - x0) * (k + 0.5) / 5
                box(bm, cx - w / 2, cx + w / 2, y0 - p, y0, z0 + 1.0, z1 - 1.0)
                box(bm, cx - w / 2, cx + w / 2, y1, y1 + p, z0 + 1.0, z1 - 1.0)
            # Ribs on the two faces across the bridge (x faces): six across.
            for k in range(6):
                cy = y0 + (y1 - y0) * (k + 0.5) / 6
                box(bm, x0 - p, x0, cy - w / 2, cy + w / 2, z0 + 1.0, z1 - 1.0)
                box(bm, x1, x1 + p, cy - w / 2, cy + w / 2, z0 + 1.0, z1 - 1.0)
            # Reveal band where the leg steps in.
            box(bm, x0 - 0.6, x1 + 0.6, y0 - 0.6, y1 + 0.6, z1 - 1.4, z1)
            if seg == 3:
                # Stepped cap and beacon.
                box(bm, x0 + 0.6, x1 - 0.6, y0 + 0.6, y1 - 0.6, z1, z1 + 2.2)
                box(bm, x0 + 1.8, x1 - 1.8, y0 + 1.8, y1 - 1.8, z1 + 2.2, z1 + 3.8)
                cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
                box(bm, cx - 0.5, cx + 0.5, cy - 0.5, cy + 0.5, z1 + 3.8, z1 + 5.0, mi=1)
    # Stepped lintels above and below each portal strut.
    for strut in [o for o in bpy.data.objects if o.name.startswith(f"Strut{tower}_")]:
        x0, x1, y0, y1, z0, z1 = bounds(strut.name)
        box(bm, x0, x1, y0 - 0.5, y1 + 0.5, z1, z1 + 1.6)
        box(bm, x0 + 2.0, x1 - 2.0, y0 - 0.3, y1 + 0.3, z1 + 1.6, z1 + 2.8)
        box(bm, x0 + 3.0, x1 - 3.0, y0 - 0.3, y1 + 0.3, z0 - 2.0, z0)
    # X-brace between the legs below the roadway.
    lx0, lx1, ly0, ly1, _, _ = bounds(f"Leg{tower}-10")
    rx0, rx1, _, _, _, _ = bounds(f"Leg{tower}10")
    cy = (ly0 + ly1) / 2
    for z_low, z_high, flip in ((8.0, 58.0, 1), (8.0, 58.0, -1)):
        start = Vector((lx1, cy, z_low if flip > 0 else z_high))
        end = Vector((rx0, cy, z_high if flip > 0 else z_low))
        mid = (start + end) / 2
        length = (end - start).length
        geom = bmesh.ops.create_cube(bm, size=1.0)
        direction = (end - start).normalized()
        rot = direction.to_track_quat("X", "Y").to_matrix().to_4x4()
        bmesh.ops.transform(bm, matrix=Matrix.Translation(mid) @ rot @ Matrix.Diagonal((length, 3.0, 2.4, 1)), verts=geom["verts"])
    box(bm, lx1, rx0, cy - 1.5, cy + 1.5, 6.0, 9.0)
    mesh = bpy.data.meshes.new(f"TowerDetail{tower}")
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(f"TowerDetail{tower}", mesh)
    obj.data.materials.append(orange)
    if beacon:
        obj.data.materials.append(beacon)
    collection.objects.link(obj)
    bevel = obj.modifiers.new("Bevel", "BEVEL")
    bevel.width = 0.08
    bevel.segments = 1

print("tower detail: ribs, reveals, lintels, X-brace, caps and beacons on both towers")
