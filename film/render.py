"""Render the descent from film/descent.blend.

  blender -b film/descent.blend --python film/render.py -- <time> <first> <last> <step> <out_dir> [percent] [samples]

<time> is sunset, day or night. Frames are written as <out_dir>/<time>-0001.png.
The time of day only changes lights, sky and emission strengths; the scene,
camera path and animation are the same for all three.
"""
import math
import sys

import bpy
from mathutils import Vector

args = sys.argv[sys.argv.index("--") + 1:]
kind, first, last, step, out = args[0], int(args[1]), int(args[2]), int(args[3]), args[4]
percent = int(args[5]) if len(args) > 5 else 100
samples = int(args[6]) if len(args) > 6 else 32

s = bpy.context.scene
world = s.world.node_tree
sky = next(n for n in world.nodes if n.type == "TEX_SKY")
bg = world.nodes["Background"]
sun = bpy.data.objects["Sun"]
moon = bpy.data.objects["Moon"]
fill = bpy.data.objects["FogCeiling"]
floods = [o for o in bpy.data.objects if o.name.startswith("Flood")]


def emission(material, value):
    m = bpy.data.materials.get(material)
    if m:
        next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED").inputs["Emission Strength"].default_value = value


# Sun elevation and azimuth (degrees), sky strength, sun energy and colour,
# exposure, air density, fill (watts per square metre of the overcast panel)
# and colour, window glow, deck lamps, how bright vehicle and vessel lights
# are, and the fog's stand-in for multiple scattering (glow and its colour).
CONFIG = {
    "sunset": dict(el=2.2, az=262, sky=0.35, sun=8.0, col=(1.0, 0.5, 0.26), exposure=-0.7, air=2.6,
                   fill=18.0, fill_col=(1.0, 0.74, 0.66), windows=0.35, deck=8.0, lights=1.0, stars=0.0, night_sky=0.0,
                   fog_glow=0.3, fog_col=(1.0, 0.8, 0.76)),
    "day": dict(el=34, az=200, sky=0.18, sun=4.2, col=(1.0, 0.96, 0.9), exposure=-2.5, air=1.0,
                fill=14.0, fill_col=(0.85, 0.9, 1.0), windows=0.0, deck=0.0, lights=0.15, stars=0.0, night_sky=0.0,
                fog_glow=1.2, fog_col=(0.92, 0.95, 1.0)),
    "night": dict(el=-14, az=262, sky=0.0, sun=0.22, col=(0.6, 0.7, 0.92), exposure=0.4, air=1.0,
                  fill=1.7, fill_col=(0.55, 0.65, 0.9), windows=0.55, deck=14.0, lights=1.4, stars=3.0, night_sky=1.0,
                  fog_glow=0.035, fog_col=(0.5, 0.6, 0.85)),
}[kind]

sky.sun_elevation = math.radians(CONFIG["el"])
sky.sun_rotation = math.radians(CONFIG["az"])
sky.air_density = CONFIG["air"]
bg.inputs["Strength"].default_value = CONFIG["sky"]
world.nodes["StarGain"].inputs[1].default_value = CONFIG["stars"]
world.nodes["NightSky"].inputs["Strength"].default_value = CONFIG["night_sky"]
s.view_settings.exposure = CONFIG["exposure"]

az = math.radians(CONFIG["az"])
el = math.radians(CONFIG["el"] if kind != "night" else 9.0)
direction = Vector((math.sin(az) * math.cos(el), math.cos(az) * math.cos(el), math.sin(el)))
sun.rotation_euler = (-direction).to_track_quat("-Z", "Y").to_euler()
sun.data.energy = CONFIG["sun"]
sun.data.color = CONFIG["col"]
fill.data.energy = CONFIG["fill"] * fill.data.size * fill.data.size_y
fill.data.color = CONFIG["fill_col"]
fog_nodes = bpy.data.materials["Marine Fog"].node_tree.nodes
fog_nodes["FogGlow"].outputs[0].default_value = CONFIG["fog_glow"]
fog_nodes["FogGlowColor"].outputs[0].default_value = (*CONFIG["fog_col"], 1.0)
for f in floods:
    f.data.energy = 2.5e6 if kind == "night" else 0.0

bpy.data.materials["Building"].node_tree.nodes["WindowGlow"].outputs[0].default_value = CONFIG["windows"]
bpy.data.materials["DeckLamp"].node_tree.nodes["Lamp"].inputs["Emission Strength"].default_value = CONFIG["deck"]
for name, base in (("NavWhite", 6), ("NavRed", 5), ("NavGreen", 5), ("CabinLight", 3), ("Headlamp", 8), ("Taillamp", 5)):
    emission(name, base * CONFIG["lights"])

moon.hide_render = kind != "night"

s.render.engine = "CYCLES"
s.cycles.samples = samples
s.cycles.use_denoising = True
s.cycles.volume_bounces = 1
s.cycles.volume_step_rate = 5.0
s.cycles.volume_max_steps = 128
s.render.resolution_x, s.render.resolution_y = 1600, 900
s.render.resolution_percentage = percent
s.render.image_settings.file_format = "PNG"
try:
    prefs = bpy.context.preferences.addons["cycles"].preferences
    prefs.compute_device_type = "METAL"
    prefs.get_devices()
    for d in prefs.devices:
        d.use = d.type != "CPU"
    s.cycles.device = "GPU"
except Exception as error:  # noqa: BLE001
    print("GPU unavailable:", error)

import time
frames = [int(x) for x in out.split('@')[1].split(',')] if '@' in out else list(range(first, last + 1, step))
out = out.split('@')[0]
# HOLD=<frame> keeps the camera where it is at that frame while the scene
# (fog, traffic, boats, aircraft) carries on: the idle loops the page plays
# when the visitor stops scrolling.
import os
hold = os.environ.get("HOLD")
if hold:
    s.frame_set(int(hold))
    held = s.camera.matrix_world.copy()
    s.camera.animation_data_clear()
    s.camera.matrix_world = held
for frame in frames:
    t0 = time.time()
    s.frame_set(frame)
    # The moon sits in frame, up and to the left of where the camera looks.
    cam = s.camera
    forward = cam.matrix_world.to_quaternion() @ Vector((0, 0, -1))
    md = (forward + Vector((-0.3, 0, 0))).normalized()
    md.z = 0.16
    md.normalize()
    moon.location = cam.matrix_world.translation + md * 9000
    s.render.filepath = f"{out}/{kind}-{frame:04d}.png"
    bpy.ops.render.render(write_still=True)
    print("FRAME", frame, round(time.time() - t0, 1), flush=True)
