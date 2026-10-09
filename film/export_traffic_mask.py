"""Render where live traffic can actually be seen, through the real fog.

  # held opening loop (averaged over three moments of the fog)
  blender -b <run>/descent-sunset.blend --python film/export_traffic_mask.py -- OUT.png 1 1,48,95
  # every descent frame, one mask each (OUTDIR/0001.png = frame 1, 0002 = frame 3 ...)
  blender -b <run>/descent-sunset.blend --python film/export_traffic_mask.py -- OUTDIR - 1-239
  # held city loop
  blender -b <run>/descent-sunset.blend --python film/export_traffic_mask.py -- OUT.png 240 146,194,240

The browser traffic layer has no fog; it reads these masks instead: red =
open water visible to the camera, green = Golden Gate deck visible. Water is
lit pure red and the deck pure green as emission, every other object is a
holdout, lights are off, and the fog becomes pure extinction at its real
density, so it only hides what is behind it.
"""
import os
import pathlib
import sys

import bpy
import numpy as np

args = sys.argv[sys.argv.index("--") + 1:]
out, hold, spec = pathlib.Path(args[0]), args[1], args[2]
if "-" in spec:
    first, last = map(int, spec.split("-"))
    frames = list(range(first, last + 1, 2))
else:
    frames = [int(f) for f in spec.split(",")]

s = bpy.context.scene
if hold != "-":
    s.frame_set(int(hold))
    held = s.camera.matrix_world.copy()
    s.camera.animation_data_clear()
    s.camera.matrix_world = held

s.render.engine = "CYCLES"
s.cycles.samples = 16
s.cycles.use_denoising = True
s.render.film_transparent = True
s.render.resolution_x, s.render.resolution_y, s.render.resolution_percentage = 640, 360, 100
s.render.image_settings.file_format = "PNG"
s.render.image_settings.color_mode = "RGBA"
s.view_settings.view_transform = "Standard"
s.view_settings.look = "None"
s.view_settings.exposure = 0
try:
    prefs = bpy.context.preferences.addons["cycles"].preferences
    prefs.compute_device_type = "METAL"
    prefs.get_devices()
    for d in prefs.devices:
        d.use = d.type != "CPU"
    s.cycles.device = "GPU"
except Exception as error:  # noqa: BLE001
    print("GPU unavailable:", error)

for obj in bpy.data.objects:
    # Lights off; the thin haze volume would only dim every target evenly.
    if obj.type == "LIGHT" or obj.name == "Haze":
        obj.hide_render = True
for node in s.world.node_tree.nodes:
    if node.type == "BACKGROUND":
        node.inputs["Strength"].default_value = 0
# Fog as pure extinction at its real density: it hides what is behind it but
# neither glows nor scatters the targets back into the mask.
fog = bpy.data.materials["Marine Fog"].node_tree
volume = next(n for n in fog.nodes if n.type == "PRINCIPLED_VOLUME")
output = next(n for n in fog.nodes if n.type == "OUTPUT_MATERIAL")
absorb = fog.nodes.new("ShaderNodeVolumeAbsorption")
absorb.inputs["Color"].default_value = (0, 0, 0, 1)
fog.links.new(volume.inputs["Density"].links[0].from_socket, absorb.inputs["Density"])
fog.links.new(absorb.outputs[0], output.inputs["Volume"])


def emitter(name, colour):
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    nodes = material.node_tree.nodes
    nodes.clear()
    emit = nodes.new("ShaderNodeEmission")
    emit.inputs["Color"].default_value = colour
    material.node_tree.links.new(emit.outputs[0], nodes.new("ShaderNodeOutputMaterial").inputs["Surface"])
    return material


TARGETS = {"Water": emitter("MaskWater", (1, 0, 0, 1)),
           "Roadway": emitter("MaskDeck", (0, 1, 0, 1))}
TARGETS["DeckSurface"] = TARGETS["Roadway"]
for obj in bpy.data.objects:
    if obj.type not in {"MESH", "CURVE"}:
        continue
    obj.is_holdout = obj.name not in TARGETS and obj.name != "Fog"
    if obj.name in TARGETS:
        for slot in obj.material_slots:
            slot.material = TARGETS[obj.name]


def visibility(frame, scratch):
    s.frame_set(frame)
    s.render.filepath = str(scratch)
    bpy.ops.render.render(write_still=True)
    image = bpy.data.images.load(str(scratch))
    pixels = np.array(image.pixels[:], dtype=np.float32).reshape(image.size[1], image.size[0], 4)
    bpy.data.images.remove(image)
    os.remove(scratch)
    alpha = pixels[..., 3]
    # The fog looks opaque because its own scattered light swamps what is
    # behind it, long before its transmittance falls to zero: measured, clear
    # water transmits >0.99 and the visually solid bank 0.77-0.91. Water
    # counts as visible only through clear air; the deck, which stands above
    # the bank, fades only where fog really covers it.
    edge = np.clip((np.clip(pixels[..., 0] * alpha, 0, 1) - 0.95) / 0.04, 0, 1)
    water = edge * edge * (3 - 2 * edge)
    deck = np.clip(pixels[..., 1] * alpha, 0, 1) ** 2
    # The deck is a line one or two pixels wide; widen it so a car on the
    # deck never samples the pixel beside it.
    grown = deck.copy()
    for dy in (-2, -1, 0, 1, 2):
        for dx in (-2, -1, 0, 1, 2):
            grown = np.maximum(grown, np.roll(np.roll(deck, dy, 0), dx, 1))
    return water, grown


def save(water, deck, path):
    rgba = np.zeros((360, 640, 4), dtype=np.float32)
    rgba[..., 0], rgba[..., 1], rgba[..., 3] = water, deck, 1
    image = bpy.data.images.new("TrafficMask", 640, 360, alpha=True)
    image.pixels = rgba.ravel()
    image.filepath_raw = str(path)
    image.file_format = "PNG"
    image.save()
    bpy.data.images.remove(image)
    print("TRAFFIC_MASK", path, "water", round(float(water.mean()), 3), "deck", round(float(deck.mean()), 3), flush=True)


if hold != "-":
    masks = [visibility(frame, out.with_name(f".{out.stem}-{frame}.png")) for frame in frames]
    save(sum(m[0] for m in masks) / len(masks), sum(m[1] for m in masks) / len(masks), out)
else:
    out.mkdir(parents=True, exist_ok=True)
    for frame in frames:
        target = out / f"{(frame - frames[0]) // 2 + 1:04d}.png"
        if not target.exists():
            save(*visibility(frame, out / f".scratch-{frame}.png"), target)
