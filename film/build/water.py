"""Tune bay-water reflections and wave normals for a readable moving surface."""
import bpy

water = bpy.data.materials.get("Bay Water")
if water is None or water.node_tree is None:
    raise RuntimeError("Bay Water material is missing from film/descent.blend")

nodes = water.node_tree.nodes
surface = nodes.get("Principled BSDF")
wave = nodes.get("Wave Texture")
noise = nodes.get("Noise Texture")
bump = nodes.get("Bump")
if not all((surface, wave, noise, bump)):
    raise RuntimeError("Bay Water shader is missing its surface, wave, noise, or bump node")

# The prior bump distance was 0.001 m, making the million-metre water plane
# optically flat. Keep long reflections while letting smaller wavelets break
# them into a surface that reads as water at both aerial and low camera heights.
surface.inputs["Roughness"].default_value = 0.16
surface.inputs["Coat Weight"].default_value = 0.12
wave.inputs["Scale"].default_value = 0.006
wave.inputs["Distortion"].default_value = 5.0
noise.inputs["Scale"].default_value = 0.065
noise.inputs["Detail"].default_value = 7.0
bump.inputs["Distance"].default_value = 0.65
bump.inputs["Strength"].default_value = 0.22

print("water: layered wave normals and softer reflections")
