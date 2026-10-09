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

    def gable(self, u, v, w, d, z, h, kind, rnd):
        """A pitched roof on a w x d footprint at height z, ridge h above it,
        running front to back so the gable end faces the street."""
        bm = self.bm
        c, s = math.cos(ANGLE), math.sin(ANGLE)
        cx, cy = to_world(u, v)

        def at(lx, ly, lz):
            return bm.verts.new((cx + lx * c - ly * s, cy + lx * s + ly * c, lz))

        a, b = at(-w / 2, -d / 2, z), at(w / 2, -d / 2, z)
        cc, dd = at(w / 2, d / 2, z), at(-w / 2, d / 2, z)
        r0, r1 = at(0, -d / 2, z + h), at(0, d / 2, z + h)
        faces = [bm.faces.new((a, b, r0)), bm.faces.new((cc, dd, r1)),
                 bm.faces.new((b, cc, r1, r0)), bm.faces.new((dd, a, r0, r1))]
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


def to_grid(x, y):
    return (x - CX) * ca + (y - CY) * sa, -(x - CX) * sa + (y - CY) * ca


# Landmarks at their real positions: metres east and north of Salesforce
# Tower, from their latitude and longitude, around the modelled Salesforce
# site. Heights are the real ones.
SALESFORCE = (6440.0, -4455.0)
REAL = [
    ("salesforce", 0, 0, 326),
    ("fremont", 167, 11, 245),
    ("millennium", 79, 89, 197),
    ("transamerica", -493, 611, 260),
    ("california555", -581, 256, 237),
    ("rincon", 413, -489, 188),
    ("embarcadero", 0, 570, 172),
    ("ferry", 308, 645, 75),
]
LANDMARKS = [(name, *to_grid(SALESFORCE[0] + e, SALESFORCE[1] + n), h) for name, e, n, h in REAL]
for name, u, v, h in LANDMARKS:
    gz = ground(*to_world(u, v)) or 4.0
    if name == "salesforce":
        # Pale rounded-square shaft tapering gently, and the open crown above
        # the top floor that reads lighter than the shaft.
        skyline.cylinder(u, v, 26, gz - 3, gz + h * 0.88, 1, 0.97, segments=32, taper=0.9)
        skyline.cylinder(u, v, 26 * 0.9, gz + h * 0.88, gz + h * 0.97, 1, 1.0, segments=32, taper=0.8)
        skyline.cylinder(u, v, 26 * 0.72, gz + h * 0.97, gz + h, 1, 1.0, segments=32, taper=0.5)
    elif name == "rincon":
        skyline.prism(u, v, 34, 34, gz - 3, gz + h * 0.93, 0, 0.55)
        skyline.prism(u, v, 30, 30, gz + h * 0.93, gz + h, 1, 0.8, taper=0.8)
    elif name == "embarcadero":
        # Four slab towers in a row running east-west, stepping in height.
        for k, (du, hh) in enumerate(((-160, 172), (-50, 150), (60, 140), (170, 130))):
            skyline.prism(u + du, v, 46, 16, gz - 3, gz + hh, 1, 0.85 - k * 0.03)
    elif name == "ferry":
        # The long low terminal on the waterfront and its clock tower.
        skyline.prism(u, v, 26, 200, gz - 3, gz + 14, 1, 0.95, rot=math.radians(40))
        skyline.prism(u, v, 12, 12, gz + 14, gz + 62, 1, 0.98)
        skyline.prism(u, v, 9, 9, gz + 62, gz + h, 1, 0.98, taper=0.2)
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
                if any(math.hypot(u - lu, v - lv) < (230 if n == "embarcadero" else 70) for n, lu, lv, _h in LANDMARKS):
                    continue
                # Telegraph Hill, under Coit Tower, has no towers.
                wx, wy = to_world(u, v)
                if math.hypot(wx - 5675.0, wy + 3300.0) < 380:
                    continue
                gz = ground(*to_world(u, v))
                if gz is None or gz < 0.3:
                    continue
                core = math.exp(-r * r * 2.6)
                # Apart from the landmarks, San Francisco towers top out
                # around 185 m; uncapped, random towers outgrew Salesforce.
                h = min(185.0, max(18.0, rng.gauss(40 + 150 * core, 20 + 35 * core)))
                w, d = lw * rng.uniform(0.7, 0.92), ld * rng.uniform(0.7, 0.92)
                if h > 85:
                    tower(skyline, u, v, h, min(w, 48), min(d, 44), 0 if rng.random() < 0.5 else 1, rng.random() * 0.88, gz)
                else:
                    skyline.prism(u, v, w, d, gz - 3, gz + h, 1, rng.random() * 0.88)
                    if rng.random() < 0.5:
                        skyline.prism(u, v, w * 0.4, d * 0.3, gz + h, gz + h + 4, 1, 0.5)
                count += 1

# Neighbourhoods: the hills are packed with rows of narrow houses, street by
# street, broken only by parks. Rows run every 40 m along the grid with a house
# every 8 m, set back either side of the street.
homes = Mesh()
houses = 0
# Occasional small parks only; a looser threshold left Telegraph Hill and
# North Beach, in front of downtown, as bare ground.
park = lambda u, v: (math.sin(u * 0.0021 + 1.3) + math.sin(v * 0.0017 - 0.4) + math.sin((u + v) * 0.0013)) > 2.55
# Streets every 44 m; a continuous row of 8 m lots faces each side of the
# street, so the backs of neighbouring rows meet mid-block as in the city.
for dv in range(-5200, 4200, 44):
    for du in range(-7600, 4400, 8):
        if math.hypot(du / 1350, dv / 1050) < 1:
            continue
        if park(du, dv):
            continue
        for side in (-1, 1):
            if rng.random() < 0.04:
                continue
            # Lots vary: narrow Victorians, wider flats, the odd apartment block.
            roll = rng.random()
            if roll < 0.7:
                d, h = rng.uniform(13, 18), rng.choice((6.5, 7.5, 9.0, 10.5, 12.0, 13.5))
            elif roll < 0.93:
                d, h = rng.uniform(16, 19), rng.uniform(10, 15)
            else:
                d, h = rng.uniform(17, 19), rng.uniform(16, 24)
            # Uneven setbacks: a ruled-straight row front read as terraces.
            off = side * (5.5 + d / 2 + rng.uniform(-1.6, 2.4))
            x, y = to_world(du, dv + off)
            # San Francisco only: Marin's headlands are open land.
            if y > -900:
                continue
            # The Presidio and Lands End, either side of the Gate, are wooded parkland.
            if x < 2700 and y > -3300:
                continue
            gz = ground(x, y)
            if gz is None or gz < 0.5:
                continue
            tone = rng.random()
            homes.prism(du, dv + off, 8.0, d, gz - 2, gz + h, 2, tone)
            # Victorians and Edwardians: a pitched roof with its gable to the
            # street on about half the houses; flats keep flat roofs.
            if roll < 0.7 and rng.random() < 0.6:
                homes.gable(du, dv + off, 8.0, d, gz + h, rng.uniform(3.2, 5.0), 2, tone)
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
# Rowhouses share their side walls: windows only on the street and garden
# faces (normal along the grid's v axis), and roofs are tar and gravel, not
# wall paint. Windows on all four sides and pastel roofs read as dice.
face_n = n.new("ShaderNodeNewGeometry").outputs["Normal"]
along_v = n.math("ABSOLUTE", n.vmath("DOT_PRODUCT", face_n, (-sa, ca, 0.0)))
roof = n.math("GREATER_THAN", n.new("ShaderNodeSeparateXYZ", Vector=face_n).outputs["Z"], 0.7)
street_face = n.math("GREATER_THAN", along_v, 0.7)
house_window_ok = n.math("MULTIPLY", street_face, n.math("SUBTRACT", 1.0, roof))
window = n.math("MULTIPLY", window, n.math("ADD", n.math("SUBTRACT", 1.0, is_house), n.math("MULTIPLY", is_house, house_window_ok)))

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
# San Francisco's painted houses: whites and creams with blue-grey, sage,
# mustard and dusty rose (all houses read white in the low golden sun before).
for pos, c in ((0.0, (0.7, 0.68, 0.63)), (0.17, (0.6, 0.47, 0.28)), (0.34, (0.36, 0.46, 0.55)), (0.5, (0.72, 0.69, 0.6)), (0.67, (0.56, 0.4, 0.37)), (0.84, (0.42, 0.5, 0.38)), (1.0, (0.64, 0.6, 0.5))):
    el = house_ramp.color_ramp.elements.new(pos) if pos not in (0.0, 1.0) else house_ramp.color_ramp.elements[0 if pos == 0.0 else 1]
    el.position = pos
    el.color = (*c, 1)
house_ramp.color_ramp.interpolation = "CONSTANT"   # one paint colour per house
n.links.new(rnd, house_ramp.inputs["Fac"])
wall = n.new("ShaderNodeMix")
wall.data_type = "RGBA"
n.set(wall.inputs["Factor"], is_house)
n.links.new(stone_ramp.outputs["Color"], wall.inputs["A"])
n.links.new(house_ramp.outputs["Color"], wall.inputs["B"])
roof_col = n.new("ShaderNodeMix")
roof_col.data_type = "RGBA"
n.set(roof_col.inputs["Factor"], n.math("MULTIPLY", roof, is_house))
n.links.new(wall.outputs["Result"], roof_col.inputs["A"])
roof_tone = n.new("ShaderNodeMix")
roof_tone.data_type = "RGBA"
n.set(roof_tone.inputs["Factor"], rnd)
roof_tone.inputs["A"].default_value = (0.16, 0.155, 0.15, 1)
roof_tone.inputs["B"].default_value = (0.3, 0.27, 0.23, 1)
n.links.new(roof_tone.outputs["Result"], roof_col.inputs["B"])
wall = roof_col
dark_window = n.new("ShaderNodeMix")
dark_window.data_type = "RGBA"
n.set(dark_window.inputs["Factor"], n.math("MULTIPLY", window, n.math("MULTIPLY_ADD", is_house, -0.55, 1.0)))
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
