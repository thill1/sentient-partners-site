"""Wind for the marine layer.

The fog's noises are 3D, so it is animated by moving the space they are read
in: the whole bank drifts with the wind, and the billows, erosion and wisps
are read in a space that drifts faster still, so the surface churns and rolls
instead of sliding past like a texture. Keys are linear over the shot.
"""
import bpy

FIRST, LAST = 1, 241
BANK_DRIFT = (-520.0, 260.0, 0.0)     # metres over the shot, toward the city
CHURN = (-1100.0, 380.0, 160.0)       # extra drift for the fine layers, with a lift

nt = bpy.data.materials["Marine Fog"].node_tree
coord = next(n for n in nt.nodes if n.type == "TEX_COORD")
src = coord.outputs["Object"]


def keyed_add(value, label):
    node = nt.nodes.new("ShaderNodeVectorMath")
    node.operation = "ADD"
    node.label = label
    node.name = label
    for frame, scale in ((FIRST, 0.0), (LAST, 1.0)):
        node.inputs[1].default_value = tuple(c * scale for c in value)
        node.inputs[1].keyframe_insert("default_value", frame=frame)
    return node


for name in ("WindBank", "WindChurn"):
    old = nt.nodes.get(name)
    if old:
        nt.nodes.remove(old)

bank = keyed_add(BANK_DRIFT, "WindBank")
targets = [link.to_socket for link in list(src.links)]
nt.links.new(src, bank.inputs[0])
for sock in targets:
    nt.links.new(bank.outputs[0], sock)

churn = keyed_add(CHURN, "WindChurn")
nt.links.new(bank.outputs[0], churn.inputs[0])
for name in ("Billow", "Erode", "Wisp", "EdgeNoise"):
    node = nt.nodes.get(name)
    if not node or not node.inputs["Vector"].is_linked:
        continue
    upstream = node.inputs["Vector"].links[0].from_socket
    # Feed the fine layers the same warped space, shifted by the extra churn.
    shift = nt.nodes.new("ShaderNodeVectorMath")
    shift.operation = "ADD"
    shift.name = f"Churn{name}"
    nt.links.new(upstream, shift.inputs[0])
    sub = nt.nodes.new("ShaderNodeVectorMath")
    sub.operation = "SUBTRACT"
    nt.links.new(churn.outputs[0], sub.inputs[0])
    nt.links.new(bank.outputs[0], sub.inputs[1])
    nt.links.new(sub.outputs[0], shift.inputs[1])
    nt.links.new(shift.outputs[0], node.inputs["Vector"])

anim = nt.animation_data
action = anim.action if anim else None
for layer in getattr(action, "layers", []):
    for strip in layer.strips:
        for bag in strip.channelbags:
            for curve in bag.fcurves:
                for key in curve.keyframe_points:
                    key.interpolation = "LINEAR"
for curve in getattr(action, "fcurves", []) or []:
    for key in curve.keyframe_points:
        key.interpolation = "LINEAR"
print("fog wind keyed")
