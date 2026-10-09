"""Photographic facades for downtown (the Skyline object).

The procedural towers were flat colour with drawn window grids. This gives
each building one real facade photograph (ambientCG, CC0, film/textures/
facades), chosen and offset per building by its "rnd" attribute so no two
neighbours repeat: curtain-wall glass for "kind" 0, stone, concrete and brick
office grids for kind 1. Facades are box-projected in world space at their
true floor scale; roofs (upward faces) get gravel and plant-room grey. Lit
windows come from the night window maps, scaled by WindowGlow as before.
Neighbourhoods keep the Building material. Idempotent.
"""
import pathlib

import bpy

ROOT = pathlib.Path(bpy.path.abspath("//")).resolve()
while not (ROOT / "film" / "textures").exists() and ROOT.parent != ROOT:
    ROOT = ROOT.parent
TEX = ROOT / "film" / "textures" / "facades"

# Texture, metres one tile spans (from its floor count at ~3.6 m a floor).
GLASS = [("Facade001", 32), ("Facade005", 40), ("Facade006", 32), ("Facade019A", 22), ("Facade002", 32), ("Facade003", 32)]
STONE = [("Facade012", 140), ("Facade013", 140), ("Facade014", 140), ("Facade015", 140), ("Facade017", 42), ("Facade018A", 22), ("Facade020A", 22)]
LIT = [("Facade007", 60), ("Facade008", 60), ("Facade010", 60)]

old = bpy.data.materials.get("Downtown")
if old:
    bpy.data.materials.remove(old)
mat = bpy.data.materials.new("Downtown")
mat.use_nodes = True
nt = mat.node_tree
nodes, links = nt.nodes, nt.links
nodes.clear()


def node(kind, **values):
    n = nodes.new(kind)
    for key, value in values.items():
        setattr(n, key, value)
    return n


def math(op, a, b=None, c=None):
    n = node("ShaderNodeMath", operation=op)
    for i, v in enumerate((a, b, c)):
        if v is None:
            continue
        if isinstance(v, (int, float)):
            n.inputs[i].default_value = v
        else:
            links.new(v, n.inputs[i])
    return n.outputs[0]


def attr(name):
    return node("ShaderNodeAttribute", attribute_name=name).outputs["Fac"]


kind, rnd = attr("kind"), attr("rnd")
geometry = node("ShaderNodeNewGeometry")
world = geometry.outputs["Position"]
normal_z = node("ShaderNodeSeparateXYZ")
links.new(geometry.outputs["Normal"], normal_z.inputs[0])
roof = math("GREATER_THAN", normal_z.outputs["Z"], 0.6)


def facade_set(entries, colour_space="sRGB", suffix="Color"):
    """One image per entry, picked by rnd; returns the selected colour."""
    result = None
    count = len(entries)
    for index, (name, metres) in enumerate(entries):
        # Each building shifts its tile by its own rnd, so neighbours differ.
        shift = node("ShaderNodeVectorMath", operation="ADD")
        links.new(world, shift.inputs[0])
        offset = node("ShaderNodeCombineXYZ")
        for axis in ("X", "Y", "Z"):
            links.new(math("MULTIPLY", rnd, 997.0 if axis != "Z" else 0.0), offset.inputs[axis])
        links.new(offset.outputs[0], shift.inputs[1])
        scale = node("ShaderNodeVectorMath", operation="SCALE")
        links.new(shift.outputs[0], scale.inputs[0])
        scale.inputs["Scale"].default_value = 1.0 / metres
        image = node("ShaderNodeTexImage", projection="BOX", projection_blend=0.15, interpolation="Cubic")
        image.image = bpy.data.images.load(str(TEX / name / f"{name}_2K-JPG_{suffix}.jpg"), check_existing=True)
        image.image.colorspace_settings.name = colour_space
        links.new(scale.outputs[0], image.inputs["Vector"])
        if result is None:
            result = image.outputs["Color"]
            continue
        pick = math("GREATER_THAN", rnd, index / count)
        mix = node("ShaderNodeMix", data_type="RGBA")
        links.new(pick, mix.inputs["Factor"])
        links.new(result, mix.inputs["A"])
        links.new(image.outputs["Color"], mix.inputs["B"])
        result = mix.outputs["Result"]
    return result


glass = facade_set(GLASS)
stone = facade_set(STONE)
lit = facade_set(LIT)
is_stone = math("GREATER_THAN", kind, 0.5)
wall = node("ShaderNodeMix", data_type="RGBA")
links.new(is_stone, wall.inputs["Factor"])
links.new(glass, wall.inputs["A"])
links.new(stone, wall.inputs["B"])

# Roofs: gravel and plant rooms, lightly varied per building.
roof_col = node("ShaderNodeMix", data_type="RGBA")
links.new(rnd, roof_col.inputs["Factor"])
roof_col.inputs["A"].default_value = (0.16, 0.16, 0.155, 1)
roof_col.inputs["B"].default_value = (0.3, 0.29, 0.27, 1)
colour = node("ShaderNodeMix", data_type="RGBA")
links.new(roof, colour.inputs["Factor"])
links.new(wall.outputs["Result"], colour.inputs["A"])
links.new(roof_col.outputs["Result"], colour.inputs["B"])

bsdf = node("ShaderNodeBsdfPrincipled")
links.new(colour.outputs["Result"], bsdf.inputs["Base Color"])
# Glass walls are smooth and mirror the sky; stone is matte; roofs rough.
glassy = math("MULTIPLY", math("SUBTRACT", 1.0, is_stone), math("SUBTRACT", 1.0, roof))
links.new(math("MULTIPLY_ADD", glassy, -0.68, 0.8), bsdf.inputs["Roughness"])
links.new(math("MULTIPLY_ADD", glassy, 0.6, 0.4), bsdf.inputs["Specular IOR Level"])

# Lit windows from the night maps, only on walls, scaled by WindowGlow.
share = node("ShaderNodeValue", name="WindowGlow", label="WindowGlow")
building = bpy.data.materials.get("Building")
source = building.node_tree.nodes.get("WindowGlow") if building else None
share.outputs[0].default_value = source.outputs[0].default_value if source else 0.35
links.new(lit, bsdf.inputs["Emission Color"])
links.new(math("MULTIPLY", math("SUBTRACT", 1.0, roof), math("MULTIPLY", share.outputs[0], 3.0)), bsdf.inputs["Emission Strength"])
links.new(bsdf.outputs[0], node("ShaderNodeOutputMaterial").inputs["Surface"])

sky = bpy.data.objects["Skyline"]
sky.data.materials.clear()
sky.data.materials.append(mat)
print("city facades:", len(GLASS), "glass,", len(STONE), "stone,", len(LIT), "lit-window maps on downtown")
