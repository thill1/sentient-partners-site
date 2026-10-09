"""Render reusable transparent traffic sprites from the film's real models.

Run only when a Blender render slot is free:
  blender -b film/descent.blend --python film/traffic_sprites.py

The live browser layer samples 16 camera azimuths so heading changes stay
smooth and use the same detailed geometry/materials as the film.
"""
import math
import pathlib

import bpy
from mathutils import Vector

ROOT = pathlib.Path(bpy.path.abspath("//")).parent
OUT = ROOT / "public" / "film" / "traffic"
OUT.mkdir(parents=True, exist_ok=True)

SCENE = bpy.context.scene
MODELS = {
    "sedan": "Car000",
    "suv": "Car003",
    "truck": "Car001",
    "coach": "Car018",
    "ship": "ContainerShip",
    "ferry": "Ferry1",
    "pilot": "Boat_Pilot",
    "sail": "Sail0",
}
PHASES = ("day", "sunset", "night")
HEADINGS = 16


def set_phase(name):
    world = SCENE.world.node_tree
    sky = next((node for node in world.nodes if node.type == "TEX_SKY"), None)
    sun = bpy.data.objects.get("Sun")
    settings = {
        "day": (34, 200, 0.18, 4.2, (1.0, 0.96, 0.9), -2.5),
        "sunset": (2.2, 262, 0.35, 8.0, (1.0, 0.5, 0.26), -0.7),
        "night": (-14, 262, 0.02, 0.22, (0.6, 0.7, 0.92), 0.4),
    }[name]
    elevation, azimuth, strength, energy, colour, exposure = settings
    if sky:
        sky.sun_elevation = math.radians(elevation)
        sky.sun_rotation = math.radians(azimuth)
    if "Background" in world.nodes:
        world.nodes["Background"].inputs["Strength"].default_value = strength
    if sun:
        direction = Vector((
            math.sin(math.radians(azimuth)) * math.cos(math.radians(elevation)),
            math.cos(math.radians(azimuth)) * math.cos(math.radians(elevation)),
            math.sin(math.radians(elevation)),
        ))
        sun.rotation_euler = (-direction).to_track_quat("-Z", "Y").to_euler()
        sun.data.energy = energy
        sun.data.color = colour
    SCENE.view_settings.exposure = exposure


def prepare(model):
    target = bpy.data.objects[model]
    keep = {target.name, "Sun"}
    keep.update(child.name for child in target.children_recursive)
    for obj in bpy.data.objects:
        if obj.type != "CAMERA" and obj.name not in keep:
            obj.hide_render = True
    target.hide_render = False
    for child in target.children_recursive:
        child.hide_render = False
    if target.animation_data:
        target.animation_data_clear()
    target.location = (0, 0, 0)
    target.rotation_euler = (0, 0, 0)
    return target


SCENE.render.engine = "CYCLES"
SCENE.cycles.samples = 32
SCENE.cycles.use_denoising = True
SCENE.render.film_transparent = True
SCENE.render.resolution_x = SCENE.render.resolution_y = 256
SCENE.render.resolution_percentage = 100
SCENE.render.image_settings.file_format = "WEBP"
SCENE.render.image_settings.color_mode = "RGBA"
SCENE.render.image_settings.quality = 96
camera_data = bpy.data.cameras.new("TrafficSpriteCamera")
camera = bpy.data.objects.new("TrafficSpriteCamera", camera_data)
SCENE.collection.objects.link(camera)
SCENE.camera = camera
camera.data.type = "ORTHO"
camera.data.lens = 70

for phase in PHASES:
    set_phase(phase)
    for kind, model in MODELS.items():
        target = prepare(model)
        bounds = [target.matrix_world @ Vector(corner) for corner in target.bound_box]
        longest = max((max(v[i] for v in bounds) - min(v[i] for v in bounds) for i in range(3)), default=5)
        camera.data.ortho_scale = max(longest * 1.65, 8)
        height = max(longest * 1.8, 10)
        for heading in range(HEADINGS):
            yaw = math.tau * heading / HEADINGS
            view = Vector((math.sin(yaw), -math.cos(yaw), 0.28)).normalized()
            camera.location = view * height
            camera.rotation_euler = (-view).to_track_quat("-Z", "Y").to_euler()
            SCENE.render.filepath = str(OUT / f"{phase}-{kind}-{heading:02d}.webp")
            bpy.ops.render.render(write_still=True)
        print(f"traffic sprites: {phase}/{kind}", flush=True)
