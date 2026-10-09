"""Render the live-layer models exactly as the website loads them, for review.

  blender -b --factory-startup --python film/preview_models.py -- MODELS.json OUT.png [name,name,...]

Rebuilds each model from the JSON (positions, normals, colours) and lays the
chosen ones out in a row, largest last, under a warm low sun.
"""
import json
import math
import sys

import bpy
from mathutils import Vector

args = sys.argv[sys.argv.index("--") + 1:]
data = json.loads(open(args[0]).read())
models = data.get("models") or {"model": data["meshes"]}
names = args[2].split(",") if len(args) > 2 else list(models)

for obj in list(bpy.data.objects):
    bpy.data.objects.remove(obj, do_unlink=True)
scene = bpy.context.scene

x = 0.0
extent = 0.0
for name in names:
    meshes = models[name]
    xs = [p for m in meshes for p in m["positions"][0::3]]
    ys = [p for m in meshes for p in m["positions"][1::3]]
    length = max(ys) - min(ys)
    width = max(xs) - min(xs)
    x += width / 2 + 4
    for m in meshes:
        verts = [tuple(m["positions"][i:i + 3]) for i in range(0, len(m["positions"]), 3)]
        faces = [(i, i + 1, i + 2) for i in range(0, len(verts), 3)]
        mesh = bpy.data.meshes.new(f"{name}-{m['name']}")
        mesh.from_pydata(verts, [], faces)
        mat = bpy.data.materials.new(m["name"])
        mat.use_nodes = True
        bsdf = next(n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
        bsdf.inputs["Base Color"].default_value = (*m["color"], 1)
        bsdf.inputs["Roughness"].default_value = m["roughness"]
        bsdf.inputs["Metallic"].default_value = m["metallic"]
        if any(m["emission"]):
            bsdf.inputs["Emission Color"].default_value = (*[min(1, c) for c in m["emission"]], 1)
            bsdf.inputs["Emission Strength"].default_value = max(m["emission"])
        mesh.materials.append(mat)
        obj = bpy.data.objects.new(mesh.name, mesh)
        obj.location = (x, 0, 0)
        obj.rotation_euler = (0, 0, math.radians(90))   # side-on to the camera
        scene.collection.objects.link(obj)
    x += width / 2 + 4
    extent = max(extent, length)

span = x
cam = bpy.data.objects.new("Cam", bpy.data.cameras.new("Cam"))
scene.collection.objects.link(cam)
scene.camera = cam
cam.data.lens = 50
centre = Vector((span / 2, 0, extent * 0.08))
cam.location = centre + Vector((-span * 0.25, -span * 0.9 - extent, span * 0.28))
cam.rotation_euler = (centre - cam.location).to_track_quat("-Z", "Y").to_euler()
sun = bpy.data.objects.new("Sun", bpy.data.lights.new("Sun", "SUN"))
scene.collection.objects.link(sun)
sun.rotation_euler = (math.radians(60), 0, math.radians(-40))
sun.data.energy = 4
sun.data.color = (1.0, 0.85, 0.7)
scene.world = bpy.data.worlds.new("W")
scene.world.use_nodes = True
scene.world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.42, 0.5, 0.62, 1)
scene.world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.8
engines = [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties["engine"].enum_items]
scene.render.engine = "BLENDER_EEVEE_NEXT" if "BLENDER_EEVEE_NEXT" in engines else "BLENDER_EEVEE"
scene.render.resolution_x, scene.render.resolution_y = 1600, 600
scene.render.filepath = args[1]
bpy.ops.render.render(write_still=True)
print("preview:", names)
