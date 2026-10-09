"""San Francisco's landmarks beyond downtown, placed from their real offsets
(east, north) from the Transamerica Pyramid, adjusted where this scene's
simplified coastline differs:

  Bay Bridge              west suspension spans, island transition, eastern
                          single-tower suspension span and Oakland skyway
  Yerba Buena Island       about 3.2 km E, 1.6 km N
  Alcatraz                 about 1.8 km W, 3.5 km N
  Angel Island             about 2.6 km W, 7 km N (placed clear of the Marin shore)
  Coit Tower               on Telegraph Hill, 0.25 km W, 0.8 km N
  Sutro Tower              on Twin Peaks, 4.4 km W, 4.4 km S
  East Bay hills           Oakland and Berkeley, a ridge across the bay

The Bay Bridge carries the Bay Lights on its cables (BayLights material,
lit at night by render.py).
"""
import math
import pathlib
import random
import sys

import bmesh
import bpy
from mathutils import Vector, noise

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from common import collection, emissive, principled, remove_objects  # noqa: E402

rng = random.Random(1937)
remove_objects(["BayBridge", "Alcatraz", "AngelIsland", "YerbaBuena", "CoitTower", "Telegraph", "Sutro", "EastBay", "BayLights"])
group = collection("Landmarks")
terrain = bpy.data.objects["Terrain"]
inv = terrain.matrix_world.inverted()
hills = bpy.data.materials["Hills"]
steel = principled("BayBridgeSteel", (0.42, 0.44, 0.47), roughness=0.45, metallic=0.6)
concrete = principled("Concrete", (0.5, 0.48, 0.44), roughness=0.85)
cellhouse = principled("Cellhouse", (0.62, 0.58, 0.5), roughness=0.8)
sutro_red = principled("SutroRed", (0.5, 0.08, 0.05), roughness=0.55)
sutro_white = principled("SutroWhite", (0.75, 0.75, 0.73), roughness=0.55)
deck_lamp = bpy.data.materials.get("DeckLamp") or emissive("DeckLamp", (1.0, 0.72, 0.38), 8.0)
bay_lights = emissive("BayLights", (0.92, 0.95, 1.0), 0.0)
beacon = bpy.data.materials.get("NavRed") or emissive("NavRed", (1.0, 0.05, 0.03), 5.0)

TX, TY = 5925.0, -3897.0   # Transamerica Pyramid in this scene


def ground(x, y):
    origin = inv @ Vector((x, y, 900.0))
    hit, loc, _n, _i = terrain.ray_cast(origin, inv.to_3x3() @ Vector((0, 0, -1)))
    return (terrain.matrix_world @ loc).z if hit else -10.0


class Mesh:
    def __init__(self, materials):
        self.bm = bmesh.new()
        self.materials = materials

    def box(self, centre, size, rot=0.0, mi=0, taper=1.0):
        bm = self.bm
        c, s = math.cos(rot), math.sin(rot)
        rings = []
        for z, k in ((centre[2] - size[2] / 2, 1.0), (centre[2] + size[2] / 2, taper)):
            ring = []
            for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
                lx, ly = sx * size[0] / 2 * k, sy * size[1] / 2 * k
                ring.append(bm.verts.new((centre[0] + lx * c - ly * s, centre[1] + lx * s + ly * c, z)))
            rings.append(ring)
        faces = [bm.faces.new(rings[1]), bm.faces.new(list(reversed(rings[0])))]
        for i in range(4):
            j = (i + 1) % 4
            faces.append(bm.faces.new((rings[0][i], rings[0][j], rings[1][j], rings[1][i])))
        for f in faces:
            f.material_index = mi

    def sphere(self, centre, r, mi):
        g = bmesh.ops.create_uvsphere(self.bm, u_segments=6, v_segments=4, radius=r)
        bmesh.ops.translate(self.bm, vec=centre, verts=g["verts"])
        for f in {f for v in g["verts"] for f in v.link_faces}:
            f.material_index = mi

    def beam(self, a, b, radius, mi=0, segments=8):
        a, b = Vector(a), Vector(b)
        delta = b - a
        geometry = bmesh.ops.create_cone(self.bm, cap_ends=True, cap_tris=False, segments=segments, radius1=radius, radius2=radius, depth=delta.length)
        bmesh.ops.rotate(self.bm, matrix=delta.to_track_quat("Z", "Y").to_matrix(), verts=geometry["verts"])
        bmesh.ops.translate(self.bm, vec=(a + b) / 2, verts=geometry["verts"])
        for face in {face for vertex in geometry["verts"] for face in vertex.link_faces}:
            face.material_index = mi

    def deck_segment(self, a, b, width, depth, mi=0):
        a, b = Vector(a), Vector(b)
        delta = b - a
        geometry = bmesh.ops.create_cube(self.bm, size=1)
        bmesh.ops.scale(self.bm, vec=(delta.length + .05, width, depth), verts=geometry["verts"])
        bmesh.ops.rotate(self.bm, matrix=delta.to_track_quat("X", "Z").to_matrix(), verts=geometry["verts"])
        bmesh.ops.translate(self.bm, vec=(a + b) / 2, verts=geometry["verts"])
        for face in {face for vertex in geometry["verts"] for face in vertex.link_faces}:
            face.material_index = mi

    def finish(self, name, smooth=False):
        me = bpy.data.meshes.new(name)
        if smooth:
            for f in self.bm.faces:
                f.smooth = True
        self.bm.normal_update()
        self.bm.to_mesh(me)
        self.bm.free()
        for m in self.materials:
            me.materials.append(m)
        ob = bpy.data.objects.new(name, me)
        group.objects.link(ob)
        return ob


def island(name, cx, cy, rx, ry, height, rot=0.0, seed=0.0, rings=26, spokes=72):
    """A hill rising out of the water: an elliptical dome with noisy slopes."""
    m = Mesh([hills])
    bm = m.bm
    c, s = math.cos(rot), math.sin(rot)
    grid = []
    for i in range(rings + 1):
        r = i / rings
        row = []
        for j in range(spokes):
            a = math.tau * j / spokes
            wob = 1.0 + 0.18 * noise.noise(Vector((math.cos(a) * 2 + seed, math.sin(a) * 2, r)))
            lx, ly = math.cos(a) * rx * r * wob, math.sin(a) * ry * r * wob
            h = height * max(0.0, 1 - r * r) ** 0.7 * (0.85 + 0.3 * noise.noise(Vector((lx / 300 + seed, ly / 300, 0.5))))
            z = h - (40.0 if i == rings else 0.0)
            row.append(bm.verts.new((cx + lx * c - ly * s, cy + lx * s + ly * c, z)))
        grid.append(row)
    for i in range(rings):
        for j in range(spokes):
            k = (j + 1) % spokes
            bm.faces.new((grid[i][j], grid[i][k], grid[i + 1][k], grid[i + 1][j]))
    bm.faces.new(grid[0]) if False else None
    return m.finish(name, smooth=True)


# ---------------------------------------------------------------- islands
alcatraz = island("Alcatraz", TX - 1800, -380, 280, 95, 41, rot=math.radians(20), seed=1.0)
cell = Mesh([cellhouse, concrete])
cell.box((TX - 1800 + 20, -380 + 8, 47), (150, 40, 14), rot=math.radians(20))
cell.box((TX - 1800 - 70, -380 - 24, 44), (60, 30, 10), rot=math.radians(20), mi=1)
cell.box((TX - 1800 - 95, -380 + 2, 41 + 16), (6, 6, 32), mi=1, taper=0.7)      # lighthouse
cell.box((TX - 1800 + 150, -380 + 60, 30), (40, 30, 26), rot=math.radians(20), mi=1)   # water tower block
cell.finish("AlcatrazBuildings")
island("AngelIsland", 4950, 2650, 1250, 950, 240, rot=math.radians(-15), seed=4.0, rings=34, spokes=96)
ybi_x, ybi_y = TX + 3200, -2300
island("YerbaBuena", ybi_x, ybi_y, 700, 480, 105, rot=math.radians(10), seed=7.0)

# ---------------------------------------------------------------- Telegraph Hill and Coit Tower
cx, cy = TX - 250, -3300
gz = ground(cx, cy)
coit = Mesh([concrete, beacon])
coit.box((cx, cy, gz + 32), (40, 40, 64), mi=0)          # the hilltop and park
coit.box((cx, cy, gz + 64 + 32), (11, 11, 64), mi=0, taper=0.92)
coit.box((cx, cy, gz + 64 + 66), (12, 12, 5), mi=0)
coit.finish("CoitTower")

# ---------------------------------------------------------------- Sutro Tower on Twin Peaks
sx, sy = TX - 4400, -8300
gz = max(ground(sx, sy), 160.0)
sutro = Mesh([sutro_red, sutro_white, beacon])
legs = [(sx + 45 * math.cos(a), sy + 45 * math.sin(a)) for a in (math.radians(90), math.radians(210), math.radians(330))]
for i, (lx, ly) in enumerate(legs):
    # Each leg leans in to the waist and out again, in red and white bands.
    for k in range(8):
        t0, t1 = k / 8, (k + 1) / 8
        waist = lambda t: 1 - 0.55 * math.sin(math.pi * min(1, t / 0.75))
        px = sx + (lx - sx) * waist((t0 + t1) / 2)
        py = sy + (ly - sy) * waist((t0 + t1) / 2)
        sutro.box((px, py, gz + 298 * (t0 + t1) / 2), (5.5, 5.5, 298 / 8), mi=k % 2)
    sutro.sphere((lx, ly, gz + 300), 1.8, 2)
for z in (gz + 120, gz + 190, gz + 230):   # cross arms
    for i in range(3):
        a, b = legs[i], legs[(i + 1) % 3]
        mx, my = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2
        sutro.box(((mx + sx) / 2, (my + sy) / 2, z), (math.dist(a, b) * 0.5, 2.5, 2.5), rot=math.atan2(b[1] - a[1], b[0] - a[0]), mi=0)
sutro.finish("SutroTower")

# ---------------------------------------------------------------- Bay Bridge (west spans)
A = Vector((TX + 1350, -3180, 0))           # the San Francisco anchorage at the waterfront
B = Vector((ybi_x - 560, ybi_y - 140, 0))   # the west face of Yerba Buena Island
axis = (B - A).normalized()
side = Vector((-axis.y, axis.x, 0))
L = (B - A).length
rot = math.atan2(axis.y, axis.x)
DECK, TOP = 62.0, 160.0
bb = Mesh([steel, concrete, deck_lamp, bay_lights, beacon])
at = lambda t, z=0.0, off=0.0: A + axis * (L * t) + side * off + Vector((0, 0, z))
bb.box(at(0.5, DECK - 3), (L, 22, 6), rot=rot, mi=0)                   # double deck
bb.box(at(0.5, DECK - 10), (L, 20, 4), rot=rot, mi=0)
towers = [0.16, 0.36, 0.64, 0.84]
for t in towers:
    for off in (-12, 12):
        bb.box(at(t, TOP / 2, off), (6, 6, TOP), rot=rot, mi=0, taper=0.85)
    for z in (DECK + 18, TOP - 30, TOP - 4):
        bb.box(at(t, z), (4, 28, 4), rot=rot, mi=0)
    bb.box(at(t, 6), (30, 40, 20), rot=rot, mi=1)                       # pier
    bb.sphere(at(t, TOP + 2), 1.4, 4)
bb.box(at(0.5, 70), (70, 50, 140), rot=rot, mi=1)                       # central anchorage
bb.box(at(0.0, 30), (60, 50, 60), rot=rot, mi=1)
for k in range(0, 61):
    for off in (-11.5, 11.5):
        bb.sphere(at(k / 60, DECK + 1, off), 0.6, 2)                     # roadway lamps


def cable_z(t):
    """Main cable height: towers at TOP, sagging to near the deck mid-span."""
    knots = [(0.0, DECK + 8), (0.16, TOP), (0.26, DECK + 6), (0.36, TOP), (0.5, DECK + 40),
             (0.64, TOP), (0.74, DECK + 6), (0.84, TOP), (1.0, DECK + 8)]
    for (t0, z0), (t1, z1) in zip(knots, knots[1:]):
        if t <= t1:
            u = (t - t0) / (t1 - t0)
            high_first = z0 > z1
            # A parabola from each tower down to the low point between.
            return z1 + (z0 - z1) * (1 - u) ** 2 if high_first else z0 + (z1 - z0) * u ** 2
    return DECK + 8


cable_mesh = Mesh([steel, bay_lights])
for off in (-12, 12):
    pts = [at(k / 400, cable_z(k / 400), off) for k in range(401)]
    for p0, p1 in zip(pts, pts[1:]):
        cable_mesh.beam(p0, p1, .45)
    # The Bay Lights: LEDs along the vertical cables, every 18 m.
    for k in range(0, 400, 2):
        t = k / 400
        top = cable_z(t)
        if top - DECK < 6:
            continue
        cable_mesh.beam(at(t, DECK, off), at(t, top, off), .13, segments=6)
        for z in range(int(DECK + 4), int(top), 9):
            cable_mesh.sphere(at(t, z, off), 0.5, 1)
cable_mesh.finish("BayBridgeCables")
bb.finish("BayBridge")

# ---------------------------------------------------------------- East Bay hills
eb = Mesh([hills])
bm = eb.bm
rows = []
for i in range(25):
    v = i / 24
    row = []
    for j in range(161):
        u = j / 160
        x = 15500 + 6000 * v
        y = -16000 + 30000 * u
        h = 380 * v ** 0.8 * (0.7 + 0.5 * noise.noise(Vector((u * 9, v * 3, 2.0)))) - 20
        row.append(bm.verts.new((x, y, h)))
    rows.append(row)
for i in range(24):
    for j in range(160):
        bm.faces.new((rows[i][j], rows[i][j + 1], rows[i + 1][j + 1], rows[i + 1][j]))
east = eb.finish("EastBayHills", smooth=True)

# ---------------------------------------------------------------- Bay Bridge east span
# MTC describes the single-tower self-anchored span followed by a concrete
# skyway. Its tower is 525 ft (160 m); the main/back spans are 385/180 m.
# The longer approach below follows this scene's simplified East Bay coast.
# Reference: https://mtc.ca.gov/operations/programs-projects/bridges/san-francisco-oakland-bay-bridge
east_white = principled("BayBridgeEastWhite", (.76, .77, .75), roughness=.55, metallic=.18)
east_asphalt = principled("BayBridgeEastRoad", (.065, .07, .075), roughness=.92)
E0 = Vector((ybi_x + 330, ybi_y - 80, 0))
E1 = Vector((16200, -2350, 0))
east_axis = (E1 - E0).normalized()
east_side = Vector((-east_axis.y, east_axis.x, 0))
east_length = (E1 - E0).length
east_rot = math.atan2(east_axis.y, east_axis.x)
hit, shore, _normal, _face = east.ray_cast(Vector((E1.x, E1.y, 1500)), Vector((0, 0, -1)))
touchdown = shore.z + .3 if hit else 24


def east_deck_z(distance):
    return 62 if distance < 665 else 62 + (touchdown - 62) * min(1, (distance - 665) / (east_length - 665))


def east_at(distance, z=None, off=0):
    return E0 + east_axis * distance + east_side * off + Vector((0, 0, east_deck_z(distance) if z is None else z))


eastern = Mesh([east_white, concrete, east_asphalt, deck_lamp, beacon])
for start in range(0, math.ceil(east_length), 80):
    end = min(start + 80, east_length)
    for offset in (-20, 20):
        p0, p1 = east_at(start, off=offset), east_at(end, off=offset)
        eastern.deck_segment(p0 - Vector((0, 0, 2.5)), p1 - Vector((0, 0, 2.5)), 31, 5)
        eastern.deck_segment(p0 + Vector((0, 0, .05)), p1 + Vector((0, 0, .05)), 29, .12, mi=2)
        for edge in (-15.3, 15.3):
            eastern.deck_segment(east_at(start, off=offset + edge) + Vector((0, 0, .7)), east_at(end, off=offset + edge) + Vector((0, 0, .7)), .4, 1.4)
    # Southern bicycle/pedestrian path, outside the traffic decks.
    eastern.deck_segment(east_at(start, off=-38) - Vector((0, 0, .3)), east_at(end, off=-38) - Vector((0, 0, .3)), 3.5, .7)

# Four closely spaced steel shafts read as the east span's single tower.
tower_distance = 280
for along in (-4.4, 4.4):
    for off in (-4.4, 4.4):
        eastern.box(east_at(tower_distance + along, 80, off), (5.8, 5.8, 160), rot=east_rot, taper=.62)
for z in (65, 94, 124, 157):
    eastern.box(east_at(tower_distance, z), (16, 16, 3.5), rot=east_rot)
eastern.box(east_at(tower_distance, -4), (36, 32, 20), rot=east_rot, mi=1)
eastern.sphere(east_at(tower_distance, 161), .8, 4)

east_cables = Mesh([east_white])
for off in (-34, 34):
    for start, end, rising in ((100, 280, True), (280, 665, False)):
        points = []
        for i in range(151):
            u = i / 150
            height = 64 + 96 * (u*u if rising else (1-u)*(1-u))
            side_offset = off * (1-u if rising else u) + math.copysign(4, off) * (u if rising else 1-u)
            points.append(east_at(start + (end-start)*u, height, side_offset))
        for a, b in zip(points, points[1:]):
            east_cables.beam(a, b, .45)
        for i in range(0, 151, 4):
            point = points[i]
            distance = start + (end-start)*i/150
            if point.z > 66:
                east_cables.beam(east_at(distance, 62, off), point, .1, segments=6)
east_cables.finish("BayBridgeEastCables")

# Paired concrete bents support the skyway to the Oakland touchdown.
for distance in range(665, int(east_length - 120), 150):
    deck_z = east_deck_z(distance)
    for off in (-20, 20):
        eastern.box(east_at(distance, (deck_z - 8) / 2, off), (7, 13, deck_z + 8), rot=east_rot, mi=1, taper=.85)
        eastern.box(east_at(distance, -2, off), (24, 29, 8), rot=east_rot, mi=1)
        eastern.box(east_at(distance, deck_z - 6, off), (10, 29, 4), rot=east_rot, mi=1)
for distance in range(0, int(east_length), 60):
    for off in (-35, 35):
        eastern.beam(east_at(distance, off=off), east_at(distance, off=off) + Vector((0, 0, 8)), .13)
        eastern.sphere(east_at(distance, off=off) + Vector((0, 0, 8)), .3, 3)
eastern.finish("BayBridgeEast")

# Connect the island tunnel/transition to both side-by-side eastern decks.
transition = Mesh([concrete, east_asphalt])
west_end = B + Vector((0, 0, 62))
for off in (-20, 20):
    transition.deck_segment(west_end, east_at(0, off=off), 23, 4)
transition.finish("BayBridgeIslandTransition")
# Oakland and Berkeley: a carpet of low buildings along the shore under the hills.
town = Mesh([bpy.data.materials["Building"]])
kind = town.bm.faces.layers.float.new("kind")
rnd = town.bm.faces.layers.float.new("rnd")
east_inv = east.matrix_world.inverted()
for k in range(9000):
    x = rng.uniform(15550, 17400)
    y = rng.uniform(-12000, 9000)
    hit, loc, _n, _i = east.ray_cast(east_inv @ Vector((x, y, 2000)), Vector((0, 0, -1)))
    if not hit or loc.z < 2:
        continue
    base = loc.z
    h = rng.uniform(8, 30) if rng.random() > 0.03 else rng.uniform(60, 120)
    g = bmesh.ops.create_cube(town.bm, size=1.0)
    bmesh.ops.scale(town.bm, vec=(rng.uniform(12, 40), rng.uniform(12, 40), h), verts=g["verts"])
    bmesh.ops.translate(town.bm, vec=(x, y, base + h / 2 - 1), verts=g["verts"])
    val = rng.random()
    for f in {f for v in g["verts"] for f in v.link_faces}:
        f[kind] = 2.0 if h < 40 else 1.0
        f[rnd] = val
town.finish("EastBayTowns")
print("landmarks: complete Bay Bridge crossing (west, island transition, eastern SAS and Oakland skyway), Yerba Buena, Alcatraz, Angel Island, Coit Tower, Sutro Tower, East Bay")
