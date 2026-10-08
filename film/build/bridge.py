"""Bridge detail: the stiffening trusses become an open lattice (chords,
verticals and X-bracing on a 7.6 m panel, see-through between members), and
the deck underside shows its floor beams.
"""
import pathlib
import sys

import bpy

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from common import fresh_material  # noqa: E402

ORANGE = (0.62, 0.11, 0.035)
orange_src = bpy.data.materials["International Orange"]

# Lattice for the truss plates (z 59..66 in world space; objects sit at the origin).
mat, n = fresh_material("Truss Lattice")
coord = n.new("ShaderNodeTexCoord").outputs["Object"]
sep = n.new("ShaderNodeSeparateXYZ", Vector=coord)
u = n.math("FRACT", n.math("DIVIDE", sep.outputs["Y"], 7.62))
v = n.math("DIVIDE", n.math("SUBTRACT", sep.outputs["Z"], 59.0), 7.0)
chord = n.math("MAXIMUM", n.math("LESS_THAN", v, 0.14), n.math("GREATER_THAN", v, 0.86))
vert = n.math("LESS_THAN", n.math("ABSOLUTE", n.math("SUBTRACT", u, 0.5)), 0.045)
d1 = n.math("LESS_THAN", n.math("ABSOLUTE", n.math("SUBTRACT", u, v)), 0.06)
d2 = n.math("LESS_THAN", n.math("ABSOLUTE", n.math("SUBTRACT", n.math("SUBTRACT", 1.0, u), v)), 0.06)
member = n.math("MAXIMUM", n.math("MAXIMUM", chord, vert), n.math("MAXIMUM", d1, d2))
grime = n.noise(coord, 0.08, detail=5.0).outputs[0]
paint = n.new("ShaderNodeMix")
paint.data_type = "RGBA"
n.set(paint.inputs["Factor"], n.map_range(grime, 0.35, 0.7))
paint.inputs["A"].default_value = (ORANGE[0] * 0.75, ORANGE[1] * 0.75, ORANGE[2] * 0.8, 1)
paint.inputs["B"].default_value = (*ORANGE, 1)
bsdf = n.new("ShaderNodeBsdfPrincipled")
n.set(bsdf.inputs["Base Color"], paint.outputs["Result"])
bsdf.inputs["Roughness"].default_value = 0.55
transparent = n.new("ShaderNodeBsdfTransparent")
mix = n.new("ShaderNodeMixShader")
n.set(mix.inputs["Fac"], member)
n.links.new(transparent.outputs[0], mix.inputs[1])
n.links.new(bsdf.outputs[0], mix.inputs[2])
n.links.new(mix.outputs[0], n.new("ShaderNodeOutputMaterial").inputs["Surface"])
for name in ("TrussL", "TrussR"):
    obj = bpy.data.objects[name]
    obj.data.materials.clear()
    obj.data.materials.append(mat)

# Deck slab: floor beams across the underside every panel, darker in the recesses.
mat, n = fresh_material("Deck Steel")
coord = n.new("ShaderNodeTexCoord").outputs["Object"]
sep = n.new("ShaderNodeSeparateXYZ", Vector=coord)
beam = n.math("LESS_THAN", n.math("FRACT", n.math("DIVIDE", sep.outputs["Y"], 7.62)), 0.12)
stringer = n.math("LESS_THAN", n.math("FRACT", n.math("DIVIDE", n.math("ADD", sep.outputs["X"], 14.0), 2.8)), 0.1)
lit = n.math("MAXIMUM", beam, stringer)
col = n.new("ShaderNodeMix")
col.data_type = "RGBA"
n.set(col.inputs["Factor"], lit)
col.inputs["A"].default_value = (ORANGE[0] * 0.35, ORANGE[1] * 0.35, ORANGE[2] * 0.4, 1)
col.inputs["B"].default_value = (*ORANGE, 1)
bsdf = n.new("ShaderNodeBsdfPrincipled")
n.set(bsdf.inputs["Base Color"], col.outputs["Result"])
bsdf.inputs["Roughness"].default_value = 0.6
n.links.new(bsdf.outputs[0], n.new("ShaderNodeOutputMaterial").inputs["Surface"])
road = bpy.data.objects["Roadway"]
road.data.materials.clear()
road.data.materials.append(mat)

# The shared orange: slightly weathered rather than flat plastic.
nodes = orange_src.node_tree.nodes
bsdf = next(nd for nd in nodes if nd.type == "BSDF_PRINCIPLED")
bsdf.inputs["Roughness"].default_value = 0.55
s = bpy.context.scene
s.cycles.transparent_max_bounces = 16
print("bridge: truss lattice and deck beams")
