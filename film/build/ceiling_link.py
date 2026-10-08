"""The overcast panel under the fog lights the water, the vessels, the bridge
and the fog itself, but not the land: low hills sit only metres under it and
would otherwise be floodlit into a pale band along every coast."""
import bpy

panel = bpy.data.objects["FogCeiling"]
receivers = bpy.data.collections.get("CeilingReceivers") or bpy.data.collections.new("CeilingReceivers")
for obj in list(receivers.objects):
    receivers.objects.unlink(obj)
skip = {"Terrain", "Skyline", "Neighbourhoods"}
for obj in bpy.data.objects:
    if obj.type in {"MESH", "CURVE"} and obj.name not in skip:
        receivers.objects.link(obj)
panel.light_linking.receiver_collection = receivers
print("ceiling link:", len(receivers.objects), "receivers")
