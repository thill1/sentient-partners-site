"""Replace the invented terrain with real elevation (film/geo/prepare_terrain.py).

One "Terrain" mesh: a 4 m grid around the Golden Gate and the phone shots, a
16 m grid elsewhere with a hole under the fine one, its border dropped 1 m so
the seam hides under the fine grid's edge. Keeps the old terrain's materials.
The old Terrain and the hand-made islands (now in the real data) are hidden.
"""
import pathlib
import numpy as np
import bpy

ROOT = pathlib.Path(__file__).resolve().parents[2]
d = np.load(ROOT / "film/geo/cache/terrain.npz")
old = bpy.data.objects.get("Terrain")
mats = [s.material for s in old.material_slots] if old else []
colls = list(old.users_collection) if old else [bpy.context.scene.collection]
if old:
    old.name = "TerrainInvented"
    old.hide_render = True
    old.hide_viewport = True
for name in ("Alcatraz", "AlcatrazRock", "AlcatrazBuildings", "YerbaBuena", "AngelIsland", "EastBayHills"):
    o = bpy.data.objects.get(name)
    if o:
        o.hide_render = True

verts, faces = [], []

def add(gx, gy, h, skip=None, drop_edge=False):
    base = len(verts)
    X, Y = np.meshgrid(gx, gy)
    H = h.copy()
    if drop_edge and skip is not None:
        x0, x1, y0, y1 = skip
        edge = (X > x0 - 40) & (X < x1 + 40) & (Y > y0 - 40) & (Y < y1 + 40)
        H = np.where(edge, H - 1.0, H)
    verts.extend(np.stack([X.ravel(), Y.ravel(), H.ravel()], 1).tolist())
    ny, nx = h.shape
    idx = np.arange(nx * ny).reshape(ny, nx) + base
    q = np.stack([idx[:-1, :-1], idx[:-1, 1:], idx[1:, 1:], idx[1:, :-1]], -1).reshape(-1, 4)
    if skip is not None:
        x0, x1, y0, y1 = skip
        cx = ((X[:-1, :-1] + X[1:, 1:]) / 2).ravel(); cy = ((Y[:-1, :-1] + Y[1:, 1:]) / 2).ravel()
        q = q[~((cx > x0 + 8) & (cx < x1 - 8) & (cy > y0 + 8) & (cy < y1 - 8))]
    faces.extend(q.tolist())

box = tuple(float(v) for v in d["near_box"])
add(d["far_x"], d["far_y"], d["far_h"], skip=box, drop_edge=True)
add(d["near_x"], d["near_y"], d["near_h"])
mesh = bpy.data.meshes.new("Terrain")
mesh.from_pydata(verts, [], faces)
mesh.polygons.foreach_set("use_smooth", [True] * len(mesh.polygons))
mesh.update()
obj = bpy.data.objects.new("Terrain", mesh)
for m in mats:
    obj.data.materials.append(m)
for c in colls:
    c.objects.link(obj)
print(f"real terrain: {len(verts)} vertices, {len(faces)} faces")
