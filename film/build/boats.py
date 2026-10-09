"""Vessels on the bay, all placed ahead of the camera's low run across the
water: an inbound container ship, two ferries, a tug, a pilot boat and a
scatter of sailboats, each with lit windows, navigation lights and a foam wake.
Hulls are lofted from cross-sections (fine bow, transom stern).
"""
import math
import pathlib
import random
import sys

import bmesh
import bpy

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from common import collection, emissive, fresh_material, principled, remove_objects  # noqa: E402

random.seed(2026)
remove_objects(["ContainerShip", "Ferry", "Sail", "Tug", "Wake", "Vessel", "Boat"])
fleet = collection("Boats")

# ---------------------------------------------------------------- materials
def get(name, maker):
    return bpy.data.materials.get(name) or maker()


hull_black = principled("HullBlack", (0.025, 0.028, 0.032), roughness=0.5)
hull_red = principled("HullRed", (0.32, 0.04, 0.03), roughness=0.6)
# Bay ferries, yachts and ship accommodation blocks are painted white.
hull_white = principled("HullWhite", (0.72, 0.73, 0.72), roughness=0.4, Coat_Weight=0.3)
super_white = principled("Superstructure", (0.68, 0.69, 0.68), roughness=0.5)
hull_navy = principled("HullNavy", (0.025, 0.055, 0.085), roughness=0.52)
deck_grey = principled("DeckGrey", (0.18, 0.19, 0.2), roughness=0.8)
funnel = principled("Funnel", (0.06, 0.12, 0.3), roughness=0.5)
mast_mat = principled("Mast", (0.55, 0.56, 0.58), roughness=0.3, metallic=1.0)
tug_red = principled("TugRed", (0.5, 0.05, 0.03), roughness=0.5)
pilot_orange = principled("PilotOrange", (0.7, 0.2, 0.03), roughness=0.4)
window = emissive("CabinLight", (1.0, 0.78, 0.5), 3.0)
nav_white = emissive("NavWhite", (1.0, 0.97, 0.9), 6.0)
nav_red = emissive("NavRed", (1.0, 0.05, 0.03), 5.0)
nav_green = emissive("NavGreen", (0.05, 1.0, 0.25), 5.0)

sail_mat, n = fresh_material("Sail")
bsdf = n.new("ShaderNodeBsdfPrincipled")
bsdf.inputs["Base Color"].default_value = (0.86, 0.84, 0.78, 1)
bsdf.inputs["Roughness"].default_value = 0.55
bsdf.inputs["Subsurface Weight"].default_value = 0.0
trans = n.new("ShaderNodeBsdfTranslucent")
trans.inputs["Color"].default_value = (0.8, 0.75, 0.65, 1)
mix = n.new("ShaderNodeMixShader")
mix.inputs["Fac"].default_value = 0.35
n.links.new(bsdf.outputs[0], mix.inputs[1])
n.links.new(trans.outputs[0], mix.inputs[2])
n.links.new(mix.outputs[0], n.new("ShaderNodeOutputMaterial").inputs["Surface"])

CONTAINERS = [
    (0.45, 0.06, 0.04), (0.04, 0.16, 0.35), (0.06, 0.28, 0.12), (0.55, 0.35, 0.06),
    (0.6, 0.6, 0.58), (0.2, 0.05, 0.05), (0.08, 0.3, 0.38), (0.5, 0.22, 0.03),
]
container_mats = [principled(f"Container{i}", c, roughness=0.7) for i, c in enumerate(CONTAINERS)]

# Foam wake: a V of broken white water spreading behind the stern, fading out.
wake_mat, n = fresh_material("Wake")
coord = n.new("ShaderNodeTexCoord").outputs["Generated"]
sep = n.new("ShaderNodeSeparateXYZ", Vector=coord)
gx = n.math("MULTIPLY_ADD", sep.outputs["X"], 2.0, -1.0)  # -1..1 across
gy = sep.outputs["Y"]  # 0 at the far end, 1 at the stern
spread = n.math("MULTIPLY_ADD", gy, -0.85, 1.0)  # half-width of the V at this distance
arm = n.math("ABSOLUTE", n.math("SUBTRACT", n.math("ABSOLUTE", gx), spread))
arms = n.map_range(arm, 0.14, 0.0)
centre = n.math("MULTIPLY", n.map_range(n.math("ABSOLUTE", gx), 0.22, 0.0), n.map_range(gy, 0.55, 1.0))
foam_shape = n.math("MAXIMUM", arms, centre)
fade = n.math("MULTIPLY", n.map_range(gy, 0.0, 0.85), n.map_range(gy, 1.0, 0.97))
noise = n.noise(n.new("ShaderNodeTexCoord").outputs["Object"], 0.25, detail=6.0, roughness=0.6).outputs[0]
breakup = n.map_range(noise, 0.42, 0.62)
alpha = n.math("MULTIPLY", n.math("MULTIPLY", foam_shape, fade), breakup)
alpha = n.math("MULTIPLY", alpha, 0.85)
foam = n.new("ShaderNodeBsdfPrincipled")
foam.inputs["Base Color"].default_value = (0.75, 0.78, 0.8, 1)
foam.inputs["Roughness"].default_value = 0.9
trn = n.new("ShaderNodeBsdfTransparent")
mx = n.new("ShaderNodeMixShader")
n.set(mx.inputs["Fac"], alpha)
n.links.new(trn.outputs[0], mx.inputs[1])
n.links.new(foam.outputs[0], mx.inputs[2])
n.links.new(mx.outputs[0], n.new("ShaderNodeOutputMaterial").inputs["Surface"])


# ---------------------------------------------------------------- geometry helpers
class Builder:
    def __init__(self):
        self.bm = bmesh.new()
        self.mats = []

    def mat(self, m):
        if m not in self.mats:
            self.mats.append(m)
        return self.mats.index(m)

    def box(self, x0, x1, y0, y1, z0, z1, m):
        bm, i = self.bm, self.mat(m)
        v = [bm.verts.new(c) for c in (
            (x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0),
            (x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1))]
        for f in ((0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)):
            bm.faces.new([v[k] for k in f]).material_index = i

    def cyl(self, x, y, z0, z1, r, m, seg=8):
        ret = bmesh.ops.create_cone(self.bm, cap_ends=True, segments=seg, radius1=r, radius2=r, depth=z1 - z0)
        i = self.mat(m)
        for v in ret["verts"]:
            v.co.x += x
            v.co.y += y
            v.co.z += (z0 + z1) / 2
        for f in {f for v in ret["verts"] for f in v.link_faces}:
            f.material_index = i

    def tri(self, a, b, c, m):
        v = [self.bm.verts.new(p) for p in (a, b, c)]
        self.bm.faces.new(v).material_index = self.mat(m)

    def hull(self, L, B, top, bottom, m_top, m_bottom, bow=0.22, stern=0.08, flare=1.0, stations=16, boot=0.6):
        """A closed hull along +y: half-breadth narrows to a point over the
        forward `bow` fraction and to a transom over the aft `stern` fraction."""
        bm = self.bm
        it, ib = self.mat(m_top), self.mat(m_bottom)
        rings = []
        made = []
        for k in range(stations + 1):
            t = k / stations
            y = -L / 2 + t * L
            if t > 1 - bow:
                # Floating-point rounding can put the final station a few
                # ulps past pi/2; clamp before the fractional power so the
                # bow remains a real-valued mesh at t == 1.
                bow_t = min(1.0, max(0.0, (t - (1 - bow)) / bow))
                f = max(0.0, math.cos(bow_t * math.pi / 2)) ** 0.8
            elif t < stern:
                f = 0.86 + 0.14 * t / stern
            else:
                f = 1.0
            hw = B / 2 * max(f, 0.015)
            sheer = top + (0.02 * L * ((t - 0.75) / 0.25) ** 2 if t > 0.75 else 0)
            keel_hw = hw * 0.55
            ring = [
                bm.verts.new((-keel_hw, y, bottom)), bm.verts.new((-hw, y, bottom * 0.35)),
                bm.verts.new((-hw * flare, y, boot)), bm.verts.new((-hw * flare, y, sheer)),
                bm.verts.new((hw * flare, y, sheer)), bm.verts.new((hw * flare, y, boot)),
                bm.verts.new((hw, y, bottom * 0.35)), bm.verts.new((keel_hw, y, bottom)),
            ]
            rings.append(ring)
            made += ring
        for a, b in zip(rings, rings[1:]):
            for j in range(8):
                if j == 3:  # deck between the two sheer points
                    face = bm.faces.new((a[3], a[4], b[4], b[3]))
                    face.material_index = self.mat(deck_grey)
                    continue
                jn = (j + 1) % 8
                face = bm.faces.new((a[j], b[j], b[jn], a[jn]))
                upper = j in (2, 4)
                face.material_index = it if upper else ib
        bm.faces.new(list(reversed(rings[0]))).material_index = it
        bm.faces.new(rings[-1]).material_index = it
        return made

    def finish(self, name):
        bmesh.ops.recalc_face_normals(self.bm, faces=self.bm.faces)
        mesh = bpy.data.meshes.new(name)
        self.bm.to_mesh(mesh)
        self.bm.free()
        for m in self.mats:
            mesh.materials.append(m)
        obj = bpy.data.objects.new(name, mesh)
        fleet.objects.link(obj)
        return obj


def nav_lights(b, half, y, z, mast_y, mast_z):
    """Side lights on the structure's own sides at `y`, masthead light on the mast."""
    b.box(-half - 0.3, -half, y - 0.3, y + 0.3, z, z + 0.5, nav_red)
    b.box(half, half + 0.3, y - 0.3, y + 0.3, z, z + 0.5, nav_green)
    b.box(-0.3, 0.3, mast_y - 0.3, mast_y + 0.3, mast_z, mast_z + 0.6, nav_white)


def container_ship(name):
    L, B = 300.0, 40.0
    b = Builder()
    b.hull(L, B, 14.0, -12.0, hull_black, hull_red, bow=0.18, stern=0.06, boot=1.2)
    # Accommodation block and bridge, a third of the way from the stern.
    yb = -L / 2 + 70
    b.box(-14, 14, yb - 9, yb + 9, 14, 40, super_white)
    b.box(-20, 20, yb + 4, yb + 9, 40, 44, super_white)  # bridge with wings
    for z in range(17, 40, 3):
        b.box(-14.05, 14.05, yb + 9.0, yb + 9.06, z, z + 1.1, window)
    b.box(-20.05, 20.05, yb + 9.0, yb + 9.06, 41, 43, window)
    b.box(-3.5, 3.5, yb - 20, yb - 12, 14, 46, funnel)
    b.cyl(0, yb + 2, 44, 58, 0.5, mast_mat)
    nav_lights(b, 20.0, yb + 6, 41, yb + 2, 58)
    b.box(-0.3, 0.3, L / 2 - 6, L / 2 - 5.4, 28, 28.6, nav_white)
    # Container bays forward and aft of the house.
    bays = [y for y in range(int(-L / 2 + 14), int(yb - 22), 13)] + [y for y in range(int(yb + 12), int(L / 2 - 30), 13)]
    for y0 in bays:
        rows = 15
        for r in range(rows):
            x0 = -B / 2 + 1.7 + r * 2.44
            tiers = random.choice([4, 5, 5, 6, 6, 7, 7, 8])
            if y0 > L / 2 - 60:
                tiers = min(tiers, 5)
            for t in range(tiers):
                b.box(x0, x0 + 2.36, y0, y0 + 12.1, 14 + t * 2.6, 14 + t * 2.6 + 2.5, random.choice(container_mats))
    return b.finish(name)


def ferry(name):
    L, B = 42.0, 11.0
    b = Builder()
    for sx in (-1, 1):
        for v in b.hull(L, 3.2, 2.2, -1.6, hull_white, hull_navy, bow=0.3, stern=0.05, boot=0.4):
            v.co.x += sx * 3.6
    b.box(-B / 2, B / 2, -L / 2 + 1, L / 2 - 6, 2.2, 3.0, hull_white)
    b.box(-B / 2 + 0.4, B / 2 - 0.4, -L / 2 + 3, L / 2 - 9, 3.0, 5.6, super_white)
    b.box(-B / 2 + 1.2, B / 2 - 1.2, -L / 2 + 8, L / 2 - 13, 5.6, 8.0, super_white)
    b.box(-2.5, 2.5, L / 2 - 16, L / 2 - 12, 8.0, 9.8, super_white)
    for sx in (-1, 1):
        x = sx * (B / 2 - 0.39)
        b.box(min(x, x + sx * 0.05), max(x, x + sx * 0.05), -L / 2 + 4, L / 2 - 10, 3.6, 5.0, window)
        x = sx * (B / 2 - 1.19)
        b.box(min(x, x + sx * 0.05), max(x, x + sx * 0.05), -L / 2 + 9, L / 2 - 14, 6.2, 7.4, window)
    b.box(-2.4, 2.4, L / 2 - 12.05, L / 2 - 12, 8.4, 9.4, window)
    nav_lights(b, B / 2 - 1.2, L / 2 - 14, 7.0, L / 2 - 14, 11.5)
    b.cyl(0, L / 2 - 14, 9.8, 11.5, 0.12, mast_mat)
    return b.finish(name)


def tug(name):
    L, B = 30.0, 10.0
    b = Builder()
    b.hull(L, B, 3.2, -3.5, tug_red, hull_black, bow=0.35, stern=0.1, boot=0.8)
    b.box(-3.5, 3.5, -2, 6, 3.2, 6.5, super_white)
    b.box(-3, 3, 0, 5.5, 6.5, 9.2, super_white)
    b.box(-3.05, 3.05, 5.45, 5.5, 7.3, 8.6, window)
    b.box(-1.0, 1.0, -5, -3, 3.2, 10.5, hull_black)
    nav_lights(b, 3.0, 3, 8.4, 3, 12.5)
    b.cyl(0, 3, 9.2, 12.5, 0.1, mast_mat)
    return b.finish(name)


def pilot_boat(name):
    L, B = 19.0, 5.6
    b = Builder()
    b.hull(L, B, 2.0, -1.4, pilot_orange, hull_black, bow=0.4, stern=0.06, boot=0.4)
    b.box(-2.0, 2.0, -3, 3, 2.0, 4.6, super_white)
    b.box(-2.05, 2.05, 2.95, 3.0, 3.2, 4.2, window)
    nav_lights(b, 2.0, 1.5, 3.9, 0, 6.6)
    b.cyl(0, 0, 4.6, 6.6, 0.08, mast_mat)
    return b.finish(name)


def sailboat(name, L):
    B = L * 0.32
    mast = L * 1.35
    b = Builder()
    b.hull(L, B, 1.2, -0.9, hull_white, hull_white, bow=0.45, stern=0.04, boot=0.25)
    b.box(-B * 0.28, B * 0.28, -L * 0.15, L * 0.12, 1.2, 1.9, super_white)  # coachroof
    my = L * 0.08
    b.cyl(0, my, 1.2, mast, 0.09, mast_mat, seg=6)
    boom = L * 0.42
    b.box(-0.06, 0.06, my - boom, my, 2.4, 2.55, mast_mat)
    # Mainsail and jib as thin double-sided triangles.
    for dx in (-0.02, 0.02):
        b.tri((dx, my - 0.1, 2.6), (dx, my - boom, 2.6), (dx, my - 0.1, mast - 0.4), sail_mat)
        b.tri((dx, L / 2 - 0.3, 1.4), (dx, my + 0.15, 1.6), (dx, my + 0.1, mast * 0.86), sail_mat)
    b.box(-0.15, 0.15, my - 0.15, my + 0.15, mast, mast + 0.3, nav_white)
    return b.finish(name)


def wake(boat, L, B, length):
    mesh = bpy.data.meshes.new(f"Wake{boat.name}")
    w = B * 0.5 + length * 0.36
    verts = [(-w, -L / 2 - length, 0.06), (w, -L / 2 - length, 0.06), (B * 0.55, -L / 2 + L * 0.15, 0.06), (-B * 0.55, -L / 2 + L * 0.15, 0.06)]
    mesh.from_pydata(verts, [], [(0, 1, 2, 3)])
    mesh.materials.append(wake_mat)
    obj = bpy.data.objects.new(f"Wake{boat.name}", mesh)
    fleet.objects.link(obj)
    obj.parent = boat
    return obj


def place(obj, start, heading, speed, heel=0.0):
    """Keyframe a straight run at `speed` m/s on `heading` (dx, dy) over 240 frames at 24 fps."""
    dx, dy = heading
    norm = math.hypot(dx, dy)
    dx, dy = dx / norm, dy / norm
    obj.rotation_euler = (0, heel, math.atan2(-dx, dy))
    travel = speed * 10.0
    obj.location = (start[0], start[1], 0.0)
    obj.keyframe_insert("location", frame=1)
    obj.location = (start[0] + dx * travel, start[1] + dy * travel, 0.0)
    obj.keyframe_insert("location", frame=240)
    action = obj.animation_data.action
    try:
        curves = list(action.fcurves)
    except AttributeError:
        curves = [fc for layer in action.layers for strip in layer.strips for bag in strip.channelbags for fc in bag.fcurves]
    for fc in curves:
        for k in fc.keyframe_points:
            k.interpolation = "LINEAR"


# A fresh layout for each render: BOAT_SEED picks it, so sunset, day and
# night each get their own traffic. Every vessel starts and ends on open
# water (checked against the terrain), spread from close by the camera's run
# to far across the bay.
import os
from mathutils import Vector

rng = random.Random(int(os.environ.get("BOAT_SEED", "2026")))
terrain = bpy.data.objects["Terrain"]
inv = terrain.matrix_world.inverted()


def on_water(x, y, margin=60.0):
    for ox, oy in ((0, 0), (margin, 0), (-margin, 0), (0, margin), (0, -margin)):
        origin = inv @ Vector((x + ox, y + oy, 900.0))
        hit, loc, _n, _i = terrain.ray_cast(origin, inv.to_3x3() @ Vector((0, 0, -1)))
        if hit and (terrain.matrix_world @ loc).z > -2.0:
            return False
    return True


# The camera runs low from the Gate (x~-300) to the city waterfront (x~4300,
# y~-2300); vessels are drawn from a band around that run.
def pick(speed, length, near):
    for _ in range(400):
        t = rng.random()
        cx, cy = -300 + 4700 * t, 300 - 2700 * t
        spread = rng.uniform(80, 700) if near else rng.uniform(500, 2600)
        side = rng.choice((-1, 1))
        x, y = cx + side * spread * 0.55, cy + side * spread * 0.85
        angle = rng.uniform(0, math.tau)
        heading = (math.cos(angle), math.sin(angle))
        travel = speed * 10.0
        ex, ey = x + heading[0] * travel, y + heading[1] * travel
        if on_water(x, y, margin=length) and on_water(ex, ey, margin=length):
            return (x, y), heading
    return (cx, cy), (1.0, 0.0)


def launch(obj, speed, length, beam, wake_len, near, heel=0.0):
    start, heading = pick(speed, length, near)
    place(obj, start, heading, speed, heel=heel)
    wake(obj, length, beam, wake_len)


launch(container_ship("ContainerShip"), rng.uniform(5.5, 8.0), 300, 40, 520, near=rng.random() < 0.6)
if rng.random() < 0.5:
    launch(container_ship("ContainerShip2"), rng.uniform(5.0, 7.0), 300, 40, 520, near=False)
for i in range(rng.randint(1, 3)):
    launch(ferry(f"Ferry{i + 1}"), rng.uniform(9.0, 13.0), 42, 11, 160, near=rng.random() < 0.5)
for i in range(rng.randint(0, 2)):
    launch(tug(f"Tug{i}"), rng.uniform(4.0, 6.0), 30, 10, 90, near=rng.random() < 0.5)
if rng.random() < 0.7:
    launch(pilot_boat("Boat_Pilot"), rng.uniform(10.0, 14.0), 19, 5.6, 110, near=rng.random() < 0.5)
for i in range(rng.randint(7, 16)):
    L = rng.uniform(8.0, 16.0)
    launch(sailboat(f"Sail{i}", L), rng.uniform(2.5, 5.5), L, L * 0.32, L * 4, near=rng.random() < 0.45,
           heel=math.radians(rng.uniform(-18, 18)))
print(f"boats: {len(fleet.objects)} objects")
