"""Keep the low shoreline from glowing.

The overcast panel under the fog (FogCeiling) lights everything below it,
which on its own would leave a pale band along every shore. Low ground is
darkened toward the water's edge so it reads as wet scrub and rock.
"""
import bpy

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
dim.inputs["To Min"].default_value = 0.2
dim.inputs["To Max"].default_value = 1.0
nt.links.new(sep.outputs["Z"], dim.inputs["Value"])
mix = nt.nodes.new("ShaderNodeMix")
mix.data_type = "RGBA"
mix.blend_type = "MULTIPLY"
mix.name = "ShoreMix"
mix.inputs["Factor"].default_value = 1.0
nt.links.new(ramp.outputs["Color"], mix.inputs["A"])
comb = nt.nodes.new("ShaderNodeCombineColor")
for k in ("Red", "Green", "Blue"):
    nt.links.new(dim.outputs["Result"], comb.inputs[k])
nt.links.new(comb.outputs[0], mix.inputs["B"])
# Patchy scrub and chaparral: a second, finer noise breaks up the colour.
patch = nt.nodes.new("ShaderNodeTexNoise")
patch.name = "ShorePatch"
patch.inputs["Scale"].default_value = 0.03
patch.inputs["Detail"].default_value = 8.0
nt.links.new(coords.outputs["Object"], patch.inputs["Vector"])
pr = nt.nodes.new("ShaderNodeMapRange")
pr.name = "ShorePatchRange"
pr.inputs["From Min"].default_value = 0.35
pr.inputs["From Max"].default_value = 0.65
pr.inputs["To Min"].default_value = 0.45
pr.inputs["To Max"].default_value = 1.0
nt.links.new(patch.outputs["Fac"], pr.inputs["Value"])
both = nt.nodes.new("ShaderNodeMath")
both.name = "ShoreBoth"
both.operation = "MULTIPLY"
nt.links.new(dim.outputs["Result"], both.inputs[0])
nt.links.new(pr.outputs["Result"], both.inputs[1])
for k in ("Red", "Green", "Blue"):
    nt.links.new(both.outputs[0], comb.inputs[k])
nt.links.new(mix.outputs["Result"], bsdf.inputs["Base Color"])
bsdf.inputs["Roughness"].default_value = 0.97
print("shore dimmed")
