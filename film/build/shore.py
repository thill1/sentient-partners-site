"""Keep the low shoreline from glowing.

The overcast panel under the fog (FogCeiling) lights everything below it,
which on its own would leave a pale band along every shore. Low ground is
darkened toward the water's edge so it reads as wet scrub and rock.
"""
import bpy

# Golden dry grass over olive scrub, as the Marin Headlands and San Francisco's
# open slopes look in late summer.
_ramp = next(n for n in bpy.data.materials["Hills"].node_tree.nodes if n.type == "VALTORGB")
_ramp.color_ramp.elements[0].color = (0.075, 0.085, 0.04, 1)
_ramp.color_ramp.elements[1].color = (0.3, 0.24, 0.12, 1)

nt = bpy.data.materials["Hills"].node_tree
for name in ("ShoreZ", "ShoreDim", "ShoreMix", "ShorePatch", "ShorePatchRange", "ShoreBoth"):
    if nt.nodes.get(name):
        nt.nodes.remove(nt.nodes[name])
bsdf = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
ramp = next(n for n in nt.nodes if n.type == "VALTORGB")
coords = nt.nodes.new("ShaderNodeTexCoord")
sep = nt.nodes.new("ShaderNodeSeparateXYZ")
sep.name = "ShoreZ"
nt.links.new(coords.outputs["Object"], sep.inputs[0])
dim = nt.nodes.new("ShaderNodeMapRange")
dim.name = "ShoreDim"
dim.inputs["From Min"].default_value = 0.0
dim.inputs["From Max"].default_value = 150.0
dim.inputs["To Min"].default_value = 0.0
dim.inputs["To Max"].default_value = 1.0
nt.links.new(sep.outputs["Z"], dim.inputs["Value"])
mix = nt.nodes.new("ShaderNodeMix")
mix.data_type = "RGBA"
mix.blend_type = "MIX"
mix.name = "ShoreMix"
mix.inputs["Factor"].default_value = 1.0
comb = nt.nodes.new("ShaderNodeCombineColor")
for k in ("Red", "Green", "Blue"):
    nt.links.new(dim.outputs["Result"], comb.inputs[k])
nt.links.new(comb.outputs[0], mix.inputs["B"])
# Low slopes are wooded (the Presidio, the Marin shoreline): dark green.
# The mix runs from trees at the water to the ramp's grass above ~150 m,
# broken up by a patch noise so the line between them is never straight.
patch = nt.nodes.new("ShaderNodeTexNoise")
patch.name = "ShorePatch"
patch.inputs["Scale"].default_value = 0.004
patch.inputs["Detail"].default_value = 6.0
nt.links.new(coords.outputs["Object"], patch.inputs["Vector"])
pr = nt.nodes.new("ShaderNodeMapRange")
pr.name = "ShorePatchRange"
pr.inputs["From Min"].default_value = 0.3
pr.inputs["From Max"].default_value = 0.7
pr.inputs["To Min"].default_value = -0.35
pr.inputs["To Max"].default_value = 0.35
nt.links.new(patch.outputs["Fac"], pr.inputs["Value"])
both = nt.nodes.new("ShaderNodeMath")
both.name = "ShoreBoth"
both.operation = "ADD"
both.use_clamp = True
nt.links.new(dim.outputs["Result"], both.inputs[0])
nt.links.new(pr.outputs["Result"], both.inputs[1])
nt.links.new(both.outputs[0], mix.inputs["Factor"])
mix.inputs["A"].default_value = (0.028, 0.045, 0.026, 1)
nt.links.new(ramp.outputs["Color"], mix.inputs["B"])
nt.links.new(mix.outputs["Result"], bsdf.inputs["Base Color"])
bsdf.inputs["Roughness"].default_value = 0.97
print("shore dimmed")
