"""Geometry depth for one film frame, matching the browser's camera exactly.

  blender -b <scene>.blend --python film/export_depth.py -- FRAME OUT.png [WIDTH]

Rendered with Cycles in one sample: every surface emits its distance from the
camera (Camera Data > View Distance, the distance along the ray), the fog and
haze volumes are switched off, the sky emits nothing. The float result is
log-encoded into RGB (24 bits, 5 m to 60 km); white means sky. The camera,
lens and crop are the film's own, which src/components/epic/liveFog.ts
reconstructs (film/export_camera.py exports the same pose and fov).

(An earlier version ray-cast every pixel from Python: correct, but 1.4
million casts against the city took most of an hour.)
"""
import math
import os
import sys

import bpy
import numpy as np

args = sys.argv[sys.argv.index("--") + 1:]
# FRAME OUT.png, or FIRST-LAST OUTDIR (one session renders every frame;
# OUTDIR/0001-depth.png is FIRST). Starting Blender per frame took ~70 s each.
if "-" in args[0]:
    first, last = map(int, args[0].split("-"))
    jobs = [(f, os.path.join(args[1], f"{f - first + 1:04d}-depth.png")) for f in range(first, last + 1)]
else:
    jobs = [(int(args[0]), args[1])]
frame, out = jobs[0]
width = int(args[2]) if len(args) > 2 else 1600
height = round(width * 16 / 9) if os.environ.get("PORTRAIT") else round(width * 9 / 16)

s = bpy.context.scene
s.frame_set(frame)
for name in ("Fog", "Haze"):
    if name in bpy.data.objects:
        bpy.data.objects[name].hide_render = True
for obj in bpy.data.objects:
    if obj.type == "LIGHT":
        obj.hide_render = True

depth = bpy.data.materials.new("DepthEmission")
depth.use_nodes = True
nt = depth.node_tree
nt.nodes.clear()
camera_data = nt.nodes.new("ShaderNodeCameraData")
emit = nt.nodes.new("ShaderNodeEmission")
nt.links.new(camera_data.outputs["View Distance"], emit.inputs["Strength"])
emit.inputs["Color"].default_value = (1, 1, 1, 1)
nt.links.new(emit.outputs[0], nt.nodes.new("ShaderNodeOutputMaterial").inputs["Surface"])
s.view_layers[0].material_override = depth

world = s.world.node_tree
for node in world.nodes:
    if node.type == "BACKGROUND":
        node.inputs["Strength"].default_value = 0

s.render.engine = "CYCLES"
s.cycles.samples = 1
s.cycles.use_denoising = False
s.cycles.max_bounces = 0
s.cycles.filter_width = 0.01          # one ray per pixel centre, no filtering across edges
s.render.film_transparent = True
s.render.resolution_x, s.render.resolution_y, s.render.resolution_percentage = width, height, 100
s.view_settings.view_transform = "Standard"
s.view_settings.look = "None"
s.view_settings.exposure = 0
s.render.image_settings.file_format = "OPEN_EXR"
s.render.image_settings.color_depth = "32"
try:
    prefs = bpy.context.preferences.addons["cycles"].preferences
    prefs.compute_device_type = "METAL"
    prefs.get_devices()
    for d in prefs.devices:
        d.use = d.type != "CPU"
    s.cycles.device = "GPU"
except Exception as error:  # noqa: BLE001
    print("GPU unavailable:", error)

for frame, out in jobs:
    s.frame_set(frame)
    raw = out + ".exr"
    s.render.filepath = raw
    bpy.ops.render.render(write_still=True)
    image = bpy.data.images.load(raw)
    pixels = np.array(image.pixels[:], dtype=np.float32).reshape(height, width, 4)[::-1]
    os.remove(raw)
    distance, alpha = pixels[..., 0], pixels[..., 3]
    sky = alpha < 0.5
    near, far = math.log(5.0), math.log(60000.0)
    n = np.clip((np.log(np.maximum(distance, 5.0)) - near) / (far - near), 0.0, 0.99999)
    a = np.floor(n * 255); rem = n * 255 - a
    b = np.floor(rem * 255); rem2 = rem * 255 - b
    c = np.floor(rem2 * 255)
    rgb = np.stack([a, b, c], axis=-1)
    rgb[sky] = 255

    png = bpy.data.images.new("Depth", width, height, alpha=False)
    png.colorspace_settings.name = "Non-Color"
    flat = np.concatenate([rgb[::-1].astype(np.float32) / 255.0, np.ones((height, width, 1), np.float32)], axis=2)
    png.pixels = flat.ravel()
    png.filepath_raw = out
    png.file_format = "PNG"
    png.save()
    print("DEPTH", out, width, height, "sky", round(float(sky.mean()), 3), "median m", round(float(np.median(distance[~sky])), 1))
