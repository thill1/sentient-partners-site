"""Render the airliner as sprites for the page to fly live on random paths.

  blender -b film/descent.blend --python film/sprites.py

For each time of day, the aircraft is rendered alone on a transparent
background from 16 headings around it (0 = flying straight away from the
viewer, 90 = flying to the viewer's right, 180 = straight toward) and two
elevations (seen from a little below, and from a little above), lit by that
time of day's sun and sky. Night sprites are dark airframes; the page adds
their lights. Writes public/film/aircraft/<kind>-<elev>-<yaw>.webp.
"""
import math
import pathlib

import bpy
from mathutils import Vector

ROOT = pathlib.Path(bpy.path.abspath("//")).parent
OUT = ROOT / "public" / "film" / "aircraft"
OUT.mkdir(parents=True, exist_ok=True)

s = bpy.context.scene
plane = bpy.data.objects["AirlinerNear"]
keep = {plane.name, *(c.name for c in plane.children), "Sun"}
for obj in bpy.data.objects:
    if obj.name not in keep and obj.type != "CAMERA":
        obj.hide_render = True
plane.hide_render = False
for child in plane.children:
    child.hide_render = False
plane.animation_data_clear()
plane.location = (0, 0, 0)
plane.rotation_euler = (0, 0, 0)

cam_data = bpy.data.cameras.new("SpriteCam")
cam_data.lens = 85
cam = bpy.data.objects.new("SpriteCam", cam_data)
s.collection.objects.link(cam)
s.camera = cam
s.render.engine = "CYCLES"
s.cycles.samples = 48
s.cycles.use_denoising = True
s.render.film_transparent = True
s.render.resolution_x = s.render.resolution_y = 384
s.render.resolution_percentage = 100
s.render.image_settings.file_format = "PNG"
s.render.image_settings.color_mode = "RGBA"
try:
    prefs = bpy.context.preferences.addons["cycles"].preferences
    prefs.compute_device_type = "METAL"
    prefs.get_devices()
    for d in prefs.devices:
        d.use = d.type != "CPU"
    s.cycles.device = "GPU"
except Exception as error:  # noqa: BLE001
    print("GPU unavailable:", error)

world = s.world.node_tree
sky = next(n for n in world.nodes if n.type == "TEX_SKY")
bg = world.nodes["Background"]
sun = bpy.data.objects["Sun"]
LIGHT = {
    "sunset": dict(el=2.2, az=262, sky=0.35, sun=8.0, col=(1.0, 0.5, 0.26), exposure=-0.7),
    "day": dict(el=34, az=200, sky=0.18, sun=4.2, col=(1.0, 0.96, 0.9), exposure=-2.5),
    "night": dict(el=9, az=262, sky=0.0, sun=0.22, col=(0.6, 0.7, 0.92), exposure=0.4),
}
for name in ("StarGain",):
    if name in world.nodes:
        world.nodes[name].inputs[1].default_value = 0.0

DIST = 190.0  # the 384 px frame then spans 2 * 190 * 18 / 85 = 80.5 m
for kind, cfg in LIGHT.items():
    sky.sun_elevation = math.radians(cfg["el"] if kind != "night" else -14)
    sky.sun_rotation = math.radians(cfg["az"])
    bg.inputs["Strength"].default_value = cfg["sky"] if kind != "night" else 0.02
    s.view_settings.exposure = cfg["exposure"]
    az, el = math.radians(cfg["az"]), math.radians(cfg["el"])
    d = Vector((math.sin(az) * math.cos(el), math.cos(az) * math.cos(el), math.sin(el)))
    sun.rotation_euler = (-d).to_track_quat("-Z", "Y").to_euler()
    sun.data.energy = cfg["sun"]
    sun.data.color = cfg["col"]
    for elev_name, elev in (("below", -10.0), ("above", 12.0)):
        for k in range(16):
            yaw = 22.5 * k
            # The viewer stands behind the aircraft at yaw 0 and walks round it.
            a = math.radians(yaw)
            view = Vector((math.sin(a), -math.cos(a), 0.0)) * math.cos(math.radians(elev))
            view.z = math.sin(math.radians(elev))
            cam.location = view * DIST
            cam.rotation_euler = (-view).to_track_quat("-Z", "Y").to_euler()
            s.render.filepath = str(OUT / f"{kind}-{elev_name}-{k:02d}.png")
            bpy.ops.render.render(write_still=True)
    print("sprites:", kind, flush=True)
