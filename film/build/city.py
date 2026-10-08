"""Downtown San Francisco and its neighbourhoods.

A street grid of 100 m blocks with 22 m streets. The Financial District and
South of Market carry towers built as podium, shaft with setbacks, and crown;
the tallest are modelled on the real skyline (Salesforce Tower with its
rounded crown, 181 Fremont's taper, the Transamerica Pyramid, 555 California's
dark slab). Around them are stone mid-rises, and over the hills, rows of
three- and four-storey houses.

Facades are shaded per face from two attributes: "kind" (0 glass curtain
wall, 1 stone, 2 painted house) and "rnd" (variation). Windows come from the
facade coordinate: mullions on a 3 m bay and 3.9 m floor, a share of them lit
(WindowGlow, set per time of day by render.py).
"""
import math
import pathlib
import random
import sys

import bmesh
import bpy
from mathutils import Vector

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from common import collection, fresh_material, remove_objects  # noqa: E402

rng = random.Random(415)
remove_objects(["Buildings", "BuildingsInfill", "Transamerica", "Skyline", "Neighbourhoods"])
city = collection("City", clear=False)
terrain = bpy.data.objects["Terrain"]
inv = terrain.matrix_world.inverted()

CX, CY = 6200.0, -4300.0      # the heart of the Financial District / SoMa
ANGLE = math.radians(-8)      # the downtown grid sits a little off north
ca, sa = math.cos(ANGLE), math.sin(ANGLE)


def ground(x, y):
    origin = inv @ Vector((x, y, 900.0))
    hit, loc, _n, _i = terrain.ray_cast(origin, inv.to_3x3() @ Vector((0, 0, -1)))
    return (terrain.matrix_world @ loc).z if hit else None


def to_world(u, v):
    return CX + u * ca - v * sa, CY + u * sa + v * ca


class Mesh:
    def __init__(self):
        self.bm = bmesh.new()
        self.kind = self.bm.faces.layers.float.new("kind")
        self.rnd = self.bm.faces.layers.float.new("rnd")

    def prism(self, u, v, w, d, z0, z1, kind, rnd, taper=1.0, rot=0.0):
        """A box on the grid (u, v centre, w x d footprint), optionally tapering."""
        bm = self.bm
        c, s = math.cos(ANGLE + rot), math.sin(ANGLE + rot)
        cx, cy = to_world(u, v)
        rings = []
        for z, k in ((z0, 1.0), (z1, taper)):
            ring = []
            for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
                lx, ly = sx * w / 2 * k, sy * d / 2 * k
                ring.append(bm.verts.new((cx + lx * c - ly * s, cy + lx * s + ly * c, z)))
            rings.append(ring)
        faces = [bm.faces.new(rings[1])]
        faces.append(bm.faces.new(list(reversed(rings[0]))))
        for i in range(4):
            j = (i + 1) % 4
            faces.append(bm.faces.new((rings[0][i], rings[0][j], rings[1][j], rings[1][i])))
        for f in faces:
            f[self.kind] = kind
            f[self.rnd] = rnd

    def cylinder(self, u, v, r, z0, z1, kind, rnd, segments=24, taper=1.0):
        bm = self.bm
        cx, cy = to_world(u, v)
        rings = []
        for z, k in ((z0, 1.0), (z1, taper)):
            rings.append([bm.verts.new((cx + r * k * math.cos(a), cy + r * k * math.sin(a), z))
                          for a in (math.tau * i / segments for i in range(segments))])
        faces = [bm.faces.new(rings[1]), bm.faces.new(list(reversed(rings[0])))]
        for i in range(segments):
            j = (i + 1) % segments
            faces.append(bm.faces.new((rings[0][i], rings[0][j], rings[1][j], rings[1][i])))
        for f in faces:
            f[self.kind] = kind
            f[self.rnd] = rnd

    def finish(self, name, material):
        me = bpy.data.meshes.new(name)
        self.bm.normal_update()
        self.bm.to_mesh(me)
        self.bm.free()
        ob = bpy.data.objects.new(name, me)
        ob.data.materials.append(material)
        city.objects.link(ob)
        return ob


def tower(m, u, v, height, w, d, kind, rnd, base_z):
    """Podium, a shaft with up to three setbacks, and a crown."""
    podium = rng.uniform(14, 28)
    m.prism(u, v, w * 1.15, d * 1.15, base_z - 3, base_z + podium, 1, rnd)
    steps = rng.choice((1, 2, 2, 3)) if height > 110 else 1
    z = base_z + podium
    top = base_z + height
    ww, dd = w, d
    for i in range(steps):
        z1 = z + (top - z) * (1.0 / (steps - i)) * rng.uniform(0.7, 1.0) if i < steps - 1 else top
        m.prism(u, v, ww, dd, z, z1, kind, rnd)
        z = z1
        ww *= rng.uniform(0.78, 0.92)
        dd *= rng.uniform(0.78, 0.92)
    crown = rng.random()
    if height > 140 and crown < 0.35:
        m.prism(u, v, ww * 0.7, dd * 0.7, top, top + height * 0.05, kind, rnd, taper=0.55)
    elif crown < 0.7:
        m.prism(u, v, ww * 0.55, dd * 0.4, top, top + 6, 1, rnd)   # plant room


skyline = Mesh()
# Landmarks, placed in grid units (metres) around the centre.
LANDMARKS = [
    ("salesforce", 260, -120, 326),
    ("fremont", 140, -10, 245),
    ("transamerica", -330, 360, 260),
    ("california555", -180, 210, 237),
    ("millennium", 330, -40, 197),
    ("embarcadero", 120, 260, 172),
]
for name, u, v, h in LANDMARKS:
    gz = ground(*to_world(u, v)) or 4.0
    if name == "salesforce":
        # Rounded square plan tapering gently, with a lattice crown.
        skyline.cylinder(u, v, 30, gz - 3, gz + h * 0.9, 0, 0.12, segments=28, taper=0.86)
        skyline.cylinder(u, v, 30 * 0.86, gz + h * 0.9, gz + h, 0, 0.95, segments=28, taper=0.55)
    elif name == "fremont":
        skyline.prism(u, v, 34, 34, gz - 3, gz + h * 0.85, 0, 0.3, taper=0.62)
        skyline.prism(u, v, 34 * 0.62, 34 * 0.62, gz + h * 0.85, gz + h, 0, 0.3, taper=0.08)
    elif name == "transamerica":
        skyline.prism(u, v, 46, 46, gz - 3, gz + h * 0.82, 1, 0.92, taper=0.32, rot=math.radians(45))
        skyline.prism(u, v, 46 * 0.32, 46 * 0.32, gz + h * 0.82, gz + h, 1, 0.92, taper=0.02, rot=math.radians(45))
        for side in (-1, 1):   # the "wings" for the lifts and stairs
            skyline.prism(u + side * 14, v, 10, 22, gz + 80, gz + 150, 1, 0.92)
    elif name == "california555":
        skyline.prism(u, v, 60, 40, gz - 3, gz + h, 0, 0.02)
    else:
        tower(skyline, u, v, h, 42, 38, 0, rng.random(), gz)

# The rest of downtown: towers falling away from the centre, then mid-rises.
BLOCK, STREET = 100.0, 22.0
count = 0
for i in range(-11, 12):
    for j in range(-9, 10):
        bu, bv = i * (BLOCK + STREET), j * (BLOCK + STREET)
        r = math.hypot(bu / 1100, bv / 850)
        if r > 1.25:
            continue
        # Two to four lots per block.
        lots = rng.choice(((1, 1), (2, 1), (1, 2), (2, 2)))
        for a in range(lots[0]):
            for b in range(lots[1]):
                lw, ld = BLOCK / lots[0], BLOCK / lots[1]
                u = bu - BLOCK / 2 + lw * (a + 0.5)
                v = bv - BLOCK / 2 + ld * (b + 0.5)
                if any(math.hypot(u - lu, v - lv) < 70 for _n, lu, lv, _h in LANDMARKS):
                    continue
                gz = ground(*to_world(u, v))
                if gz is None or gz < 1.0:
                    continue
                core = math.exp(-r * r * 2.6)
                h = max(18.0, rng.gauss(40 + 180 * core, 22 + 40 * core))
                w, d = lw * rng.uniform(0.7, 0.92), ld * rng.uniform(0.7, 0.92)
                if h > 85:
                    tower(skyline, u, v, h, min(w, 48), min(d, 44), 0 if rng.random() < 0.7 else 1, rng.random(), gz)
                else:
                    skyline.prism(u, v, w, d, gz - 3, gz + h, 1, rng.random())
                    if rng.random() < 0.5:
                        skyline.prism(u, v, w * 0.4, d * 0.3, gz + h, gz + h + 4, 1, 0.5)
                count += 1

# Neighbourhoods: the hills are packed with rows of narrow houses, street by
# street, broken only by parks. Rows run every 40 m along the grid with a house
# every 8 m, set back either side of the street.
homes = Mesh()
houses = 0
park = lambda u, v: (math.sin(u * 0.0021 + 1.3) + math.sin(v * 0.0017 - 0.4) + math.sin((u + v) * 0.0013)) > 1.55
for dv in range(-5200, 4200, 40):
    for du in range(-7600, 4400, 8):
        if math.hypot(du / 1350, dv / 1050) < 1:
            continue
        if park(du, dv) or rng.random() < 0.08:
            continue
        side = 7.0 if (du // 8) % 2 else -7.0
        x, y = to_world(du, dv + side)
        # San Francisco only: Marin's headlands are open land.
        if y > -900:
            continue
        # The Presidio and Lands End, either side of the Gate, are wooded parkland.
        if x < 2700 and y > -3300:
            continue
        gz = ground(x, y)
        if gz is None or gz < 3.0:
            continue
        # Lots vary: narrow Victorians, wider flats, the odd apartment block.
        roll = rng.random()
        if roll < 0.7:
            w, d, h = rng.uniform(5.5, 7.6), rng.uniform(10, 14), rng.choice((7.5, 9.0, 10.5, 12.0))
        elif roll < 0.93:
            w, d, h = rng.uniform(7.6, 8.0), rng.uniform(14, 20), rng.uniform(10, 15)
        else:
            w, d, h = 8.0, rng.uniform(18, 26), rng.uniform(16, 24)
        homes.prism(du + rng.uniform(-0.4, 0.4), dv + side, w, d, gz - 2, gz + h, 2, rng.random())
        houses += 1

material, n = fresh_material("Building")
attr_kind = n.new("ShaderNodeAttribute")
attr_kind.attribute_name = "kind"
attr_rnd = n.new("ShaderNodeAttribute")
attr_rnd.attribute_name = "rnd"
kind = attr_kind.outputs["Fac"]
rnd = attr_rnd.outputs["Fac"]
coord = n.new("ShaderNodeTexCoord").outputs["Object"]
sep = n.new("ShaderNodeSeparateXYZ", Vector=coord)
# Facade coordinate: x + y runs along whichever face this is (faces are near axis-aligned).
along = n.math("ADD", n.math("MULTIPLY", sep.outputs["X"], ca), n.math("MULTIPLY", sep.outputs["Y"], ca))
bay = n.math("DIVIDE", along, 3.0)
floor = n.math("DIVIDE", sep.outputs["Z"], 3.9)
fx = n.math("FRACT", bay)
fz = n.math("FRACT", floor)
pane = n.math("MULTIPLY", n.math("GREATER_THAN", fx, 0.1), n.math("GREATER_THAN", fz, 0.18))
is_glass = n.math("LESS_THAN", kind, 0.5)
is_stone = n.math("MULTIPLY", n.math("GREATER_THAN", kind, 0.5), n.math("LESS_THAN", kind, 1.5))
is_house = n.math("GREATER_THAN", kind, 1.5)
# Stone and houses have punched windows (smaller panes); glass is all pane.
punched = n.math("MULTIPLY", n.math("GREATER_THAN", fx, 0.32), n.math("GREATER_THAN", fz, 0.38))
window = n.math("ADD", n.math("MULTIPLY", is_glass, pane), n.math("MULTIPLY", n.math("SUBTRACT", 1.0, is_glass), punched))

# Colours.
glass_col = n.new("ShaderNodeMix")
glass_col.data_type = "RGBA"
n.set(glass_col.inputs["Factor"], rnd)
glass_col.inputs["A"].default_value = (0.035, 0.05, 0.065, 1)
glass_col.inputs["B"].default_value = (0.09, 0.1, 0.11, 1)
stone_ramp = n.new("ShaderNodeValToRGB")
stone_ramp.color_ramp.elements[0].color = (0.42, 0.39, 0.34, 1)
stone_ramp.color_ramp.elements[1].color = (0.74, 0.7, 0.62, 1)
n.links.new(rnd, stone_ramp.inputs["Fac"])
house_ramp = n.new("ShaderNodeValToRGB")
for pos, c in ((0.0, (0.46, 0.43, 0.38)), (0.25, (0.4, 0.43, 0.45)), (0.5, (0.5, 0.45, 0.36)), (0.75, (0.36, 0.4, 0.37)), (1.0, (0.52, 0.5, 0.47))):
    el = house_ramp.color_ramp.elements.new(pos) if pos not in (0.0, 1.0) else house_ramp.color_ramp.elements[0 if pos == 0.0 else 1]
    el.position = pos
    el.color = (*c, 1)
n.links.new(rnd, house_ramp.inputs["Fac"])
wall = n.new("ShaderNodeMix")
wall.data_type = "RGBA"
n.set(wall.inputs["Factor"], is_house)
n.links.new(stone_ramp.outputs["Color"], wall.inputs["A"])
n.links.new(house_ramp.outputs["Color"], wall.inputs["B"])
dark_window = n.new("ShaderNodeMix")
dark_window.data_type = "RGBA"
n.set(dark_window.inputs["Factor"], window)
n.links.new(wall.outputs["Result"], dark_window.inputs["A"])
dark_window.inputs["B"].default_value = (0.12, 0.13, 0.14, 1)
base = n.new("ShaderNodeMix")
base.data_type = "RGBA"
n.set(base.inputs["Factor"], is_glass)
n.links.new(dark_window.outputs["Result"], base.inputs["A"])
n.links.new(glass_col.outputs["Result"], base.inputs["B"])
# Mullions on glass read as slightly lighter metal.
mullion = n.math("MULTIPLY", is_glass, n.math("SUBTRACT", 1.0, pane))
final = n.new("ShaderNodeMix")
final.data_type = "RGBA"
n.set(final.inputs["Factor"], mullion)
n.links.new(base.outputs["Result"], final.inputs["A"])
final.inputs["B"].default_value = (0.11, 0.115, 0.12, 1)

bsdf = n.new("ShaderNodeBsdfPrincipled")
n.links.new(final.outputs["Result"], bsdf.inputs["Base Color"])
glassy = n.math("MULTIPLY", window, n.math("ADD", is_glass, 0.4))
n.set(bsdf.inputs["Roughness"], n.math("MULTIPLY_ADD", glassy, -0.78, 0.86))
n.set(bsdf.inputs["Metallic"], n.math("MULTIPLY", mullion, 0.8))
n.set(bsdf.inputs["Specular IOR Level"], n.math("MULTIPLY_ADD", glassy, 0.5, 0.5))

# Lit windows: decided per pane by a random value from the pane's cell, per building.
cell = n.new("ShaderNodeCombineXYZ")
n.links.new(n.math("FLOOR", bay), cell.inputs["X"])
n.links.new(n.math("FLOOR", floor), cell.inputs["Y"])
n.links.new(rnd, cell.inputs["Z"])
lit_noise = n.new("ShaderNodeTexWhiteNoise")
lit_noise.noise_dimensions = "3D"
n.links.new(cell.outputs[0], lit_noise.inputs["Vector"])
share = n.new("ShaderNodeValue")
share.name = "WindowGlow"
share.outputs[0].default_value = 0.35
# WindowGlow sets both how many windows are lit and how bright.
threshold = n.math("SUBTRACT", 1.0, n.math("MINIMUM", n.math("MULTIPLY", share.outputs[0], 0.3), 0.6))
lit = n.math("MULTIPLY", n.math("GREATER_THAN", lit_noise.outputs["Value"], threshold), window)
n.set(bsdf.inputs["Emission Strength"], n.math("MULTIPLY", lit, n.math("MULTIPLY", share.outputs[0], 2.2)))
tone = n.new("ShaderNodeMix")
tone.data_type = "RGBA"
n.links.new(lit_noise.outputs["Value"], tone.inputs["Factor"])
tone.inputs["A"].default_value = (1.0, 0.78, 0.5, 1)
tone.inputs["B"].default_value = (1.0, 0.9, 0.74, 1)
n.links.new(tone.outputs["Result"], bsdf.inputs["Emission Color"])
n.links.new(bsdf.outputs[0], n.new("ShaderNodeOutputMaterial").inputs["Surface"])

skyline.finish("Skyline", material)
homes.finish("Neighbourhoods", material)
print(f"city: {len(LANDMARKS)} landmarks, {count} downtown lots, {houses} houses")
