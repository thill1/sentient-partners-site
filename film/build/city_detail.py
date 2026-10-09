"""Details that make the city read as San Francisco: Coit Tower, trees, haze.

- Coit Tower: the fluted concrete column on Telegraph Hill (the old model sat
  on a 40 m white box that read as a blank block in front of downtown).
- Trees: the wooded crown of Telegraph Hill, the Presidio forest, and street
  trees through the neighbourhoods, instanced from three tree shapes.
- Haze: a thin homogeneous atmosphere below 800 m, so distance softens and
  warms the way it does over the Bay.

Run after city.py and landmarks.py. Idempotent.
"""
import math
import pathlib
import random
import sys

import bmesh
import bpy
from mathutils import Vector

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from common import collection, remove_objects  # noqa: E402

rng = random.Random(1906)
terrain = bpy.data.objects["Terrain"]
inv = terrain.matrix_world.inverted()


def ground(x, y):
    hit, loc, _n, _i = terrain.ray_cast(inv @ Vector((x, y, 900.0)), inv.to_3x3() @ Vector((0, 0, -1)))
    return (terrain.matrix_world @ loc).z if hit else None


def principled(name, colour, roughness=0.8):
    material = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    material.use_nodes = True
    bsdf = next(n for n in material.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    bsdf.inputs["Base Color"].default_value = (*colour, 1)
    bsdf.inputs["Roughness"].default_value = roughness
    return material


remove_objects(["CoitTower", "Trees", "TreePoints", "TreeShapes", "Haze"])
for name in ("TreeA", "TreeB", "TreeC"):
    if name in bpy.data.objects:
        bpy.data.objects.remove(bpy.data.objects[name], do_unlink=True)
landmarks = collection("Landmarks", clear=False)
nature = collection("Nature", clear=False)

# ---------------------------------------------------------------- Coit Tower
CX, CY = 5675.0, -3300.0
gz = ground(CX, CY) or 60.0
stone = principled("CoitConcrete", (0.74, 0.71, 0.64), 0.75)
bm = bmesh.new()


def ring_solid(r_of, z0, z1, segments=32):
    lower = [bm.verts.new((CX + r_of(i) * math.cos(math.tau * i / segments), CY + r_of(i) * math.sin(math.tau * i / segments), z0)) for i in range(segments)]
    upper = [bm.verts.new((CX + r_of(i) * math.cos(math.tau * i / segments), CY + r_of(i) * math.sin(math.tau * i / segments), z1)) for i in range(segments)]
    bm.faces.new(list(reversed(lower)))
    bm.faces.new(upper)
    for i in range(segments):
        j = (i + 1) % segments
        bm.faces.new((lower[i], lower[j], upper[j], upper[i]))


ring_solid(lambda i: 11.0, gz - 2, gz + 6)                                   # base terrace
ring_solid(lambda i: 5.4 if i % 2 else 6.0, gz + 6, gz + 58)                 # fluted shaft
ring_solid(lambda i: 6.5, gz + 58, gz + 62)                                  # observation crown
ring_solid(lambda i: 5.2, gz + 62, gz + 64)
mesh = bpy.data.meshes.new("CoitTower")
bm.to_mesh(mesh)
bm.free()
coit = bpy.data.objects.new("CoitTower", mesh)
coit.data.materials.append(stone)
landmarks.objects.link(coit)

# ---------------------------------------------------------------- Trees
foliage = bpy.data.materials.get("Foliage") or bpy.data.materials.new("Foliage")
foliage.use_nodes = True
nt = foliage.node_tree
nt.nodes.clear()
info = nt.nodes.new("ShaderNodeObjectInfo")
ramp = nt.nodes.new("ShaderNodeValToRGB")
ramp.color_ramp.elements[0].color = (0.025, 0.05, 0.02, 1)
ramp.color_ramp.elements[1].color = (0.08, 0.1, 0.04, 1)
nt.links.new(info.outputs["Random"], ramp.inputs["Fac"])
leaf = nt.nodes.new("ShaderNodeBsdfPrincipled")
leaf.inputs["Roughness"].default_value = 0.85
nt.links.new(ramp.outputs["Color"], leaf.inputs["Base Color"])
nt.links.new(leaf.outputs[0], nt.nodes.new("ShaderNodeOutputMaterial").inputs["Surface"])

shapes = collection("TreeShapes", clear=True)
shapes.hide_render = False
tree_objects = []
for name, blobs in (("TreeA", ((0, 0, 7, 4.2),)),
                    ("TreeB", ((-1.6, 0, 6, 3.2), (1.5, 0.6, 6.8, 3.4), (0, -1.2, 8.5, 2.8))),
                    ("TreeC", ((0, 0, 9, 2.6), (0, 0, 12, 2.1), (0, 0, 6.5, 2.9)))):   # cypress-like
    bm = bmesh.new()
    for x, y, z, r in blobs:
        bmesh.ops.create_icosphere(bm, subdivisions=1, radius=r, matrix=__import__("mathutils").Matrix.Translation((x, y, z)))
    bmesh.ops.create_cone(bm, cap_ends=True, segments=5, radius1=0.4, radius2=0.3, depth=5,
                          matrix=__import__("mathutils").Matrix.Translation((0, 0, 2.5)))
    for v in bm.verts:   # break up the spheres so crowns are lumpy
        v.co += Vector((rng.uniform(-0.4, 0.4), rng.uniform(-0.4, 0.4), rng.uniform(-0.4, 0.4)))
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    obj.data.materials.append(foliage)
    shapes.objects.link(obj)
    tree_objects.append(obj)
# The shapes themselves sit far below the scene; only their instances render.
for obj in tree_objects:
    obj.location = (0, 0, -5000)

points = []
# Telegraph Hill's wooded crown around Coit Tower.
for _ in range(900):
    a, r = rng.uniform(0, math.tau), 190 * math.sqrt(rng.random())
    points.append((CX + r * math.cos(a), CY + r * math.sin(a)))
# The Presidio forest, west of the city and south of the Gate.
for _ in range(32000):
    points.append((rng.uniform(300, 2700), rng.uniform(-3300, -1050)))
# Street trees through the neighbourhoods (outside the downtown core).
for _ in range(60000):
    x, y = rng.uniform(1500, 10500), rng.uniform(-9500, -1100)
    if math.hypot((x - 6200) / 1350, (y + 4300) / 1050) < 1.05:
        continue
    points.append((x, y))

verts, scales = [], []
for x, y in points:
    z = ground(x, y)
    if z is None or z < 1.5:
        continue
    verts.append((x, y, z - 0.5))
mesh = bpy.data.meshes.new("TreePoints")
mesh.from_pydata(verts, [], [])
tp = bpy.data.objects.new("TreePoints", mesh)
nature.objects.link(tp)

group = bpy.data.node_groups.new("ScatterTrees", "GeometryNodeTree")
group.interface.new_socket("Geometry", in_out="INPUT", socket_type="NodeSocketGeometry")
group.interface.new_socket("Geometry", in_out="OUTPUT", socket_type="NodeSocketGeometry")
n, l = group.nodes, group.links
gin, gout = n.new("NodeGroupInput"), n.new("NodeGroupOutput")
to_points = n.new("GeometryNodeMeshToPoints")
coll = n.new("GeometryNodeCollectionInfo")
coll.inputs["Collection"].default_value = shapes
coll.inputs["Separate Children"].default_value = True
coll.inputs["Reset Children"].default_value = True
inst = n.new("GeometryNodeInstanceOnPoints")
inst.inputs["Pick Instance"].default_value = True
pick = n.new("FunctionNodeRandomValue")
pick.data_type = "INT"
pick.inputs["Min"].default_value = 0
pick.inputs["Max"].default_value = 2
size = n.new("FunctionNodeRandomValue")
size.data_type = "FLOAT"
size.inputs["Min"].default_value = 0.7
size.inputs["Max"].default_value = 1.5
size.inputs["Seed"].default_value = 3
turn = n.new("FunctionNodeRandomValue")
turn.data_type = "FLOAT_VECTOR"
turn.inputs["Max"].default_value = (0, 0, math.tau)
turn.inputs["Seed"].default_value = 5
l.new(gin.outputs[0], to_points.inputs["Mesh"])
l.new(to_points.outputs[0], inst.inputs["Points"])
l.new(coll.outputs[0], inst.inputs["Instance"])
l.new(pick.outputs[0], inst.inputs["Instance Index"])
l.new(size.outputs[0], inst.inputs["Scale"])
l.new(turn.outputs[0], inst.inputs["Rotation"])
l.new(inst.outputs[0], gout.inputs[0])
tp.modifiers.new("Scatter", "NODES").node_group = group
tp.name = "Trees"

# ---------------------------------------------------------------- Haze
haze_mat = bpy.data.materials.get("Haze") or bpy.data.materials.new("Haze")
haze_mat.use_nodes = True
ht = haze_mat.node_tree
ht.nodes.clear()
vol = ht.nodes.new("ShaderNodeVolumePrincipled")
vol.inputs["Density"].default_value = 0.00003      # light haze; denser washed out the aerial shots
vol.inputs["Color"].default_value = (0.8, 0.84, 0.92, 1)
vol.inputs["Anisotropy"].default_value = 0.35
ht.links.new(vol.outputs[0], ht.nodes.new("ShaderNodeOutputMaterial").inputs["Volume"])
bpy.ops.mesh.primitive_cube_add(size=1, location=(4000, -3000, 197))
haze = bpy.context.active_object
haze.name = "Haze"
haze.scale = (26000, 22000, 406)
haze.data.materials.append(haze_mat)
for c in haze.users_collection:
    c.objects.unlink(haze)
nature.objects.link(haze)
haze.visible_shadow = False

# ---------------------------------------------------------------- Urban ground
# Between rows of houses on the slopes the bare hillside showed as dark
# terraces; within the city it is gardens, paving and street.
hills = bpy.data.materials["Hills"].node_tree
if "UrbanGround" not in hills.nodes:
    bsdf = next(nd for nd in hills.nodes if nd.type == "BSDF_PRINCIPLED")
    source = bsdf.inputs["Base Color"].links[0].from_socket
    pos = hills.nodes.new("ShaderNodeNewGeometry").outputs["Position"]
    sep = hills.nodes.new("ShaderNodeSeparateXYZ")
    hills.links.new(pos, sep.inputs[0])

    def band(socket, low, high):
        a = hills.nodes.new("ShaderNodeMath"); a.operation = "GREATER_THAN"; a.inputs[1].default_value = low
        b = hills.nodes.new("ShaderNodeMath"); b.operation = "LESS_THAN"; b.inputs[1].default_value = high
        hills.links.new(socket, a.inputs[0]); hills.links.new(socket, b.inputs[0])
        m = hills.nodes.new("ShaderNodeMath"); m.operation = "MULTIPLY"
        hills.links.new(a.outputs[0], m.inputs[0]); hills.links.new(b.outputs[0], m.inputs[1])
        return m.outputs[0]

    inside = hills.nodes.new("ShaderNodeMath"); inside.operation = "MULTIPLY"
    hills.links.new(band(sep.outputs["X"], 2700, 10500), inside.inputs[0])
    hills.links.new(band(sep.outputs["Y"], -9500, -1100), inside.inputs[1])
    mix = hills.nodes.new("ShaderNodeMix"); mix.data_type = "RGBA"; mix.name = "UrbanGround"
    hills.links.new(inside.outputs[0], mix.inputs["Factor"])
    hills.links.new(source, mix.inputs["A"])
    mix.inputs["B"].default_value = (0.2, 0.2, 0.18, 1)
    hills.links.new(mix.outputs["Result"], bsdf.inputs["Base Color"])

print(f"city detail: Coit Tower, {len(verts)} trees, haze")
