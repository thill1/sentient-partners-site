"""Alcatraz as a recognisable island for close shots.

The old island was a smooth flattened ellipsoid with a box on it. This builds
the real silhouette: a rocky outcrop with steep cliffs and a flat-topped
summit (~41 m), the long three-storey cellhouse on top with rows of windows,
the lighthouse beside it, the water tower on the north end, and lower
buildings and terraces down the slopes. Hides the old meshes. Idempotent.
"""
import math
import random

import bmesh
import bpy
from mathutils import Matrix, Vector, noise

rng = random.Random(1934)
for name in ("AlcatrazRock", "AlcatrazBuildings"):
    if name in bpy.data.objects:
        bpy.data.objects.remove(bpy.data.objects[name], do_unlink=True)
old = bpy.data.objects.get("Alcatraz")
cx, cy, rot = 4125.0, -380.0, math.radians(20)
if old:
    pts = [old.matrix_world @ Vector(c) for c in old.bound_box]
    cx, cy = sum(p.x for p in pts) / 8, sum(p.y for p in pts) / 8
    old.hide_render = True
for o in bpy.data.objects:
    if o.name.startswith("AlcatrazCell") or (o.name != "Alcatraz" and o.name.startswith("Alcatraz") and o.name not in ("AlcatrazRock", "AlcatrazBuildings")):
        o.hide_render = True
# Landmarks is in the scene; CeilingReceivers is only a light-linking set
# (film/build/ceiling_link.py), so the island joins both, like the old one.
collection = bpy.data.collections.get("Landmarks") or bpy.context.scene.collection
receivers = bpy.data.collections.get("CeilingReceivers")


def mat(name, colour, rough):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    b = next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    b.inputs["Base Color"].default_value = (*colour, 1)
    b.inputs["Roughness"].default_value = rough
    return m


rock = mat("AlcatrazStone", (0.15, 0.13, 0.11), 0.95)
scrub = mat("AlcatrazScrub", (0.16, 0.18, 0.09), 0.9)
concrete = mat("AlcatrazConcrete", (0.72, 0.7, 0.65), 0.8)
window = mat("AlcatrazWindow", (0.05, 0.055, 0.06), 0.4)

# Rock: a grid lofted into cliffs, flat on top, eroded at the edges.
L, W, H = 470.0, 170.0, 41.0
bm = bmesh.new()
nx, ny = 64, 28
verts = []
for j in range(ny + 1):
    row = []
    for i in range(nx + 1):
        u, v = i / nx * 2 - 1, j / ny * 2 - 1
        r = math.hypot(u * 1.0, v * 1.0)
        n = noise.noise(Vector((u * 3.1, v * 3.1, 7.0)))
        edge = 1.0 - r + 0.12 * n
        # Steep cliffs: the profile rises fast from the waterline to the
        # summit, with rough benches; never below the water (the old dip
        # left an overhang that read as an arch).
        rough = 5.0 * noise.noise(Vector((u * 11, v * 11, 3.0))) + 2.5 * noise.noise(Vector((u * 31, v * 31, 5.0)))
        z = H * min(1.0, max(0.0, edge * 5.0)) ** 0.35 + rough * min(1.0, max(0.0, edge * 4.0))
        # The rim sinks well under the water so no gap shows at the shore.
        z = z if edge > 0.02 else -12.0
        x, y = u * L / 2 * (1 + 0.08 * n), v * W / 2 * (1 + 0.1 * n)
        row.append(bm.verts.new((cx + x * math.cos(rot) - y * math.sin(rot), cy + x * math.sin(rot) + y * math.cos(rot), z)))
    verts.append(row)
for j in range(ny):
    for i in range(nx):
        f = bm.faces.new((verts[j][i], verts[j][i + 1], verts[j + 1][i + 1], verts[j + 1][i]))
        top = sum(v.co.z for v in f.verts) / 4
        steep = max(v.co.z for v in f.verts) - min(v.co.z for v in f.verts)
        f.material_index = 1 if top > 18 and steep < 6 else 0
mesh = bpy.data.meshes.new("AlcatrazRock")
bm.to_mesh(mesh)
bm.free()
island = bpy.data.objects.new("AlcatrazRock", mesh)
island.data.materials.append(rock)
island.data.materials.append(scrub)
for p in island.data.polygons:
    p.use_smooth = False
collection.objects.link(island)
if receivers:
    receivers.objects.link(island)

# Buildings.
bm = bmesh.new()


def block(lx, ly, lz, w, d, h, mi=0, turn=0.0):
    a = rot + turn
    m = Matrix.Translation((cx + lx * math.cos(rot) - ly * math.sin(rot), cy + lx * math.sin(rot) + ly * math.cos(rot), lz + h / 2)) @ Matrix.Rotation(a, 4, "Z") @ Matrix.Diagonal((w, d, h, 1))
    g = bmesh.ops.create_cube(bm, size=1.0, matrix=m)
    for v in g["verts"]:
        for f in v.link_faces:
            f.material_index = mi


top = H - 1.0
block(-10, 5, top, 150, 32, 16)                     # the cellhouse
for k in range(14):                                 # its rows of windows, both long sides
    for side in (-1, 1):
        block(-74 + k * 10.6, 5 + side * 16.1, top + 5, 4.0, 0.3, 7.5, mi=1)
block(-10, 5, top + 16, 120, 20, 2.5)               # roof lantern
block(72, -6, top, 10, 10, 18)                      # lighthouse base
block(72, -6, top + 18, 6, 6, 10)                   # lighthouse tower
block(72, -6, top + 28, 4.4, 4.4, 3.2, mi=1)        # lantern room
block(150, 30, top - 6, 14, 14, 24)                 # water tower legs/drum (north end)
block(150, 30, top + 18, 18, 18, 9)
for k in range(5):                                  # lower buildings and terraces down the slopes
    block(rng.uniform(-170, 160), rng.uniform(-55, 55), rng.uniform(4, 18), rng.uniform(18, 46), rng.uniform(10, 18), rng.uniform(6, 12), turn=rng.uniform(-0.2, 0.2))
block(-190, -20, 2, 60, 22, 8)                      # dock buildings
mesh = bpy.data.meshes.new("AlcatrazBuildings")
bm.to_mesh(mesh)
bm.free()
buildings = bpy.data.objects.new("AlcatrazBuildings", mesh)
buildings.data.materials.append(concrete)
buildings.data.materials.append(window)
collection.objects.link(buildings)
if receivers:
    receivers.objects.link(buildings)
print("alcatraz: cliffs, cellhouse, lighthouse, water tower")
