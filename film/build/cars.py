"""Traffic on the bridge: an asphalt deck with lane markings, and modelled
sedans, SUVs, vans, box trucks and buses in six lanes, driving on the right
(northbound on the east side), headlights forward and tail lamps aft.
"""
import math
import pathlib
import random
import sys

import bmesh
import bpy

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from common import collection, fresh_material, principled, remove_objects  # noqa: E402

random.seed(1937)
DECK_Z = 67.6
Y_MIN, Y_MAX = -1260.0, 1220.0

remove_objects(["Car"])
traffic = collection("Traffic")

# ---------------------------------------------------------------- materials
glass = principled("CarGlass", (0.012, 0.016, 0.022), roughness=0.04, Coat_Weight=1.0)
tyre = principled("Tyre", (0.02, 0.02, 0.02), roughness=0.8)
chrome = principled("Trim", (0.6, 0.6, 0.62), roughness=0.25, metallic=1.0)
for name, color in (("Headlamp", (1.0, 0.93, 0.8)), ("Taillamp", (1.0, 0.04, 0.02))):
    mat, n = fresh_material(name)
    bsdf = n.new("ShaderNodeBsdfPrincipled", "BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Emission Color"].default_value = (*color, 1)
    bsdf.inputs["Emission Strength"].default_value = 8.0
    n.links.new(bsdf.outputs[0], n.new("ShaderNodeOutputMaterial").inputs["Surface"])

PAINTS = [
    ((0.75, 0.75, 0.76), 0.3, 0.7), ((0.02, 0.02, 0.025), 0.25, 0.4), ((0.35, 0.36, 0.38), 0.3, 0.8),
    ((0.55, 0.02, 0.02), 0.3, 0.3), ((0.03, 0.08, 0.25), 0.3, 0.4), ((0.82, 0.82, 0.8), 0.35, 0.0),
    ((0.12, 0.13, 0.14), 0.3, 0.6), ((0.5, 0.42, 0.3), 0.35, 0.5),
]
paints = []
for i, (col, rough, metal) in enumerate(PAINTS):
    paints.append(principled(f"CarPaint{i}", col, roughness=rough, metallic=metal, Coat_Weight=0.8))
white_body = principled("FleetWhite", (0.85, 0.85, 0.83), roughness=0.45)
bus_paint = principled("BusRed", (0.6, 0.06, 0.04), roughness=0.4, Coat_Weight=0.5)


# ---------------------------------------------------------------- geometry
def box(bm, x0, x1, y0, y1, z0, z1, mat, taper_front=0.0, taper_back=0.0, inset=0.0):
    """An axis-aligned box; the top face is pulled in by taper (m) front/back and inset (m) at the sides."""
    v = [
        bm.verts.new((x0, y0, z0)), bm.verts.new((x1, y0, z0)), bm.verts.new((x1, y1, z0)), bm.verts.new((x0, y1, z0)),
        bm.verts.new((x0 + inset, y0 + taper_back, z1)), bm.verts.new((x1 - inset, y0 + taper_back, z1)),
        bm.verts.new((x1 - inset, y1 - taper_front, z1)), bm.verts.new((x0 + inset, y1 - taper_front, z1)),
    ]
    faces = [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
    for f in faces:
        face = bm.faces.new([v[i] for i in f])
        face.material_index = mat


def quad_y(bm, x0, x1, y, z0, z1, mat, facing):
    """A small panel on a face pointing along +y (facing=1) or -y (facing=-1)."""
    a = [bm.verts.new((x0, y, z0)), bm.verts.new((x1, y, z0)), bm.verts.new((x1, y, z1)), bm.verts.new((x0, y, z1))]
    face = bm.faces.new(a if facing > 0 else list(reversed(a)))
    face.material_index = mat


def wheel(bm, x, y, r, w, mat):
    ret = bmesh.ops.create_cone(bm, cap_ends=True, segments=10, radius1=r, radius2=r, depth=w)
    for vert in ret["verts"]:
        vert.co = (vert.co.z + x, vert.co.y + y, vert.co.x + r)
    for face in {f for vert in ret["verts"] for f in vert.link_faces}:
        face.material_index = mat


# material slots: 0 paint, 1 glass, 2 tyre, 3 trim, 4 headlamp, 5 taillamp
PAINT, GLASS, TYRE, TRIM, HEAD, TAIL = range(6)


def make(kind):
    bm = bmesh.new()
    if kind in ("sedan", "suv"):
        L, W = (4.7, 1.84) if kind == "sedan" else (4.9, 1.95)
        hb, ht = (0.85, 1.44) if kind == "sedan" else (1.0, 1.76)
        h, w = L / 2, W / 2
        box(bm, -w, w, -h, h, 0.28, hb, PAINT, taper_front=0.18, taper_back=0.1)
        front, back = (0.95, -1.55) if kind == "sedan" else (1.2, -2.2)
        box(bm, -w + 0.12, w - 0.12, back, front, hb, ht, GLASS, taper_front=0.55 if kind == "sedan" else 0.25, taper_back=0.35 if kind == "sedan" else 0.08, inset=0.1)
        box(bm, -w + 0.24, w - 0.24, back + 0.4, front - 0.6, ht, ht + 0.03, PAINT)
        for sx in (-1, 1):
            quad_y(bm, sx * (w - 0.42) - 0.2, sx * (w - 0.42) + 0.2, h + 0.01, 0.6, 0.72, HEAD, 1)
            quad_y(bm, sx * (w - 0.3) - 0.22, sx * (w - 0.3) + 0.22, -h - 0.01, 0.68, 0.8, TAIL, -1)
        quad_y(bm, -w + 0.1, w - 0.1, h + 0.005, 0.3, 0.42, TRIM, 1)
        for sy in (h - 0.9, -h + 0.85):
            for sx in (-1, 1):
                wheel(bm, sx * (w - 0.1), sy, 0.34, 0.24, TYRE)
    elif kind == "van":
        L, W = 7.2, 2.3
        h, w = L / 2, W / 2
        box(bm, -w, w, h - 2.1, h, 0.35, 1.25, PAINT, taper_front=0.25)
        box(bm, -w + 0.08, w - 0.08, h - 2.0, h - 0.5, 1.25, 2.35, GLASS, taper_front=0.5, inset=0.05)
        box(bm, -w, w, -h, h - 2.15, 0.45, 3.1, PAINT)
        for sx in (-1, 1):
            quad_y(bm, sx * 0.8 - 0.18, sx * 0.8 + 0.18, h + 0.01, 0.75, 0.88, HEAD, 1)
            quad_y(bm, sx * 1.0 - 0.1, sx * 1.0 + 0.1, -h - 0.01, 0.6, 1.0, TAIL, -1)
        for sy in (h - 1.2, -h + 1.4, -h + 2.5):
            for sx in (-1, 1):
                wheel(bm, sx * (w - 0.15), sy, 0.45, 0.3, TYRE)
    else:  # bus
        L, W = 12.0, 2.55
        h, w = L / 2, W / 2
        box(bm, -w, w, -h, h, 0.35, 1.35, PAINT)
        box(bm, -w, w, -h, h, 1.35, 2.55, GLASS)
        box(bm, -w, w, -h, h, 2.55, 3.2, PAINT, taper_front=0.15, taper_back=0.1, inset=0.05)
        for sx in (-1, 1):
            quad_y(bm, sx * 0.9 - 0.2, sx * 0.9 + 0.2, h + 0.01, 0.6, 0.75, HEAD, 1)
            quad_y(bm, sx * 1.05 - 0.12, sx * 1.05 + 0.12, -h - 0.01, 0.6, 1.1, TAIL, -1)
        for sy in (h - 2.3, -h + 2.8):
            for sx in (-1, 1):
                wheel(bm, sx * (w - 0.18), sy, 0.5, 0.32, TYRE)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    mesh = bpy.data.meshes.new(f"Car_{kind}")
    bm.to_mesh(mesh)
    bm.free()
    for mat in (paints[0], glass, tyre, chrome, bpy.data.materials["Headlamp"], bpy.data.materials["Taillamp"]):
        mesh.materials.append(mat)
    return mesh


MESHES = {kind: make(kind) for kind in ("sedan", "suv", "van", "bus")}
LENGTH = {"sedan": 4.7, "suv": 4.9, "van": 7.2, "bus": 12.0}

# ---------------------------------------------------------------- deck surface
remove_objects(["DeckSurface"])
road_mat, n = fresh_material("Asphalt")
coord = n.new("ShaderNodeTexCoord").outputs["Object"]
sep = n.new("ShaderNodeSeparateXYZ", Vector=coord)
ax = n.math("ABSOLUTE", sep.outputs["X"])
# Lane lines every 3.3 m from the median, dashed 3 m on / 9 m off; solid edge lines.
lane_phase = n.math("FRACT", n.math("DIVIDE", n.math("SUBTRACT", ax, 1.0), 3.3))
lane = n.math("LESS_THAN", n.math("ABSOLUTE", n.math("SUBTRACT", lane_phase, 0.5)), 0.022)
dash = n.math("LESS_THAN", n.math("FRACT", n.math("DIVIDE", sep.outputs["Y"], 12.0)), 0.25)
inner = n.math("MULTIPLY", n.math("GREATER_THAN", ax, 1.5), n.math("LESS_THAN", ax, 10.4))
marks = n.math("MULTIPLY", n.math("MULTIPLY", lane, dash), inner)
edge = n.math("MULTIPLY", n.math("GREATER_THAN", ax, 10.75), n.math("LESS_THAN", ax, 10.9))
paint_mask = n.math("MAXIMUM", marks, edge)
grit = n.noise(coord, 1.2, detail=6.0).outputs[0]
asphalt = n.new("ShaderNodeMix")
asphalt.data_type = "RGBA"
n.set(asphalt.inputs["Factor"], grit)
asphalt.inputs["A"].default_value = (0.035, 0.035, 0.037, 1)
asphalt.inputs["B"].default_value = (0.07, 0.068, 0.066, 1)
# Sidewalks outside the traffic barrier, a pale concrete median barrier at the centre.
walk = n.math("GREATER_THAN", ax, 11.4)
median = n.math("LESS_THAN", ax, 0.5)
concrete = n.math("MAXIMUM", walk, median)
col = n.new("ShaderNodeMix")
col.data_type = "RGBA"
n.set(col.inputs["Factor"], paint_mask)
n.set(col.inputs["A"], asphalt.outputs["Result"])
col.inputs["B"].default_value = (0.75, 0.74, 0.7, 1)
col2 = n.new("ShaderNodeMix")
col2.data_type = "RGBA"
n.set(col2.inputs["Factor"], concrete)
n.set(col2.inputs["A"], col.outputs["Result"])
col2.inputs["B"].default_value = (0.13, 0.128, 0.122, 1)
bsdf = n.new("ShaderNodeBsdfPrincipled")
n.set(bsdf.inputs["Base Color"], col2.outputs["Result"])
n.set(bsdf.inputs["Roughness"], n.math("MULTIPLY_ADD", paint_mask, -0.3, 0.85))
n.links.new(bsdf.outputs[0], n.new("ShaderNodeOutputMaterial").inputs["Surface"])

bm = bmesh.new()
box(bm, -13.6, 13.6, Y_MIN - 30, Y_MAX + 30, DECK_Z - 0.05, DECK_Z + 0.02, 0)
# Median barrier and the outer traffic barriers.
for x0, x1, h in ((-0.3, 0.3, 0.85), (-11.3, -11.0, 1.0), (11.0, 11.3, 1.0)):
    box(bm, x0, x1, Y_MIN - 30, Y_MAX + 30, DECK_Z, DECK_Z + h, 1)
deck_mesh = bpy.data.meshes.new("DeckSurface")
bm.to_mesh(deck_mesh)
bm.free()
deck_mesh.materials.append(road_mat)
deck_mesh.materials.append(principled("Barrier", (0.42, 0.075, 0.03), roughness=0.7))
deck = bpy.data.objects.new("DeckSurface", deck_mesh)
bpy.data.collections["Bridge"].objects.link(deck)

# ---------------------------------------------------------------- traffic
LANES = [(-2.65, -1), (-5.95, -1), (-9.25, -1), (2.65, 1), (5.95, 1), (9.25, 1)]  # x, direction (+1 north)
FRAMES = 240
count = 0
for lane_x, direction in LANES:
    speed = random.uniform(19.0, 25.0)  # metres per second, 24 fps
    travel = speed * FRAMES / 24.0
    # Every car stays on the deck for the whole film.
    y = Y_MIN if direction > 0 else Y_MIN + travel
    end = Y_MAX - travel if direction > 0 else Y_MAX
    while y < end - LENGTH["bus"]:
        r = random.random()
        kind = "bus" if r < 0.04 else "van" if r < 0.12 else "suv" if r < 0.45 else "sedan"
        mesh = MESHES[kind].copy()
        mesh.materials[0] = bus_paint if kind == "bus" else white_body if kind == "van" and random.random() < 0.7 else random.choice(paints)
        car = bpy.data.objects.new(f"Car{count:03d}", mesh)
        traffic.objects.link(car)
        car.rotation_euler = (0, 0, 0 if direction > 0 else math.pi)
        x = lane_x + random.uniform(-0.25, 0.25)
        start = y
        stop = y + direction * travel
        car.location = (x, start, DECK_Z)
        car.keyframe_insert("location", index=1, frame=1)
        car.location = (x, stop, DECK_Z)
        car.keyframe_insert("location", index=1, frame=FRAMES)
        count += 1
        gap = random.choice([7, 9, 12, 16, 22, 30, 45, 70])
        y += LENGTH[kind] + gap

for car in traffic.objects:
    action = car.animation_data.action
    try:
        curves = list(action.fcurves)
    except AttributeError:
        curves = [fc for layer in action.layers for strip in layer.strips for bag in strip.channelbags for fc in bag.fcurves]
    for fc in curves:
        for k in fc.keyframe_points:
            k.interpolation = "LINEAR"
print(f"cars: {count} vehicles in 6 lanes")
