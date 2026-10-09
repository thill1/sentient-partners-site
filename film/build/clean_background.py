"""Hide every moving vehicle and its attached geometry in background renders.

Preserve the source models for the independent browser renderer. Run this
on a queue scene copy, never destructively on the source blend.
"""
import bpy

hidden = set()
for name in ("Traffic", "Boats", "Aircraft Details"):
    collection = bpy.data.collections.get(name)
    if collection:
        hidden.update(collection.all_objects)
for obj in bpy.data.objects:
    if obj.name.startswith(("Airliner", "AirNav", "AirStrobe", "AirLanding")):
        hidden.add(obj)
        hidden.update(obj.children_recursive)
for obj in hidden:
    obj.hide_render = True
print("CLEAN_BACKGROUND: hidden", len(hidden), "vehicle and wake objects", flush=True)
