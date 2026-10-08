"""Bevelled edges on the Golden Gate's towers, struts and piers, so each
member catches a line of light along its edges as riveted steel does."""
import bpy

count = 0
for obj in bpy.data.collections["Bridge"].objects:
    if obj.type != "MESH" or not obj.name.startswith(("Leg", "Strut", "Pier", "Roadway", "Truss")):
        continue
    mod = obj.modifiers.get("Edges") or obj.modifiers.new("Edges", "BEVEL")
    mod.width = 0.45 if obj.name.startswith(("Leg", "Strut")) else 0.25
    mod.segments = 2
    mod.limit_method = "ANGLE"
    count += 1
print("bridge bevel:", count, "members")
