"""The marine layer: one volume whose density is shaped entirely in the shader.

Base near 100 m (the deck and its traffic stay clear beneath it), a rolling
top between roughly 150 and 210 m (the upper tower legs break through), wisps
streaming off the top, and a ragged eastern edge that clears over the city.

Single scattering alone leaves the inside of dense fog grey and murky, so the
volume also emits in proportion to its density (FogGlow, FogGlowColor), which
stands in for multiple scattering. render.py sets both per time of day.
"""
import sys
import pathlib

import bpy

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from common import fresh_material  # noqa: E402

fog = bpy.data.objects["Fog"]
# Extend the box well past where the camera flies so it never sits on a face.
mesh = fog.data
for v in mesh.vertices:
    v.co.z = -30.0 if v.co.z < 150 else 520.0
    v.co.x = -12000.0 if v.co.x < 0 else 9000.0
    v.co.y = -9000.0 if v.co.y < 0 else 9000.0
mesh.update()

mat, n = fresh_material("Marine Fog")
fog.data.materials.clear()
fog.data.materials.append(mat)

coord = n.new("ShaderNodeTexCoord").outputs["Object"]
sep = n.new("ShaderNodeSeparateXYZ", Vector=coord)
X, Y, Z = sep.outputs["X"], sep.outputs["Y"], sep.outputs["Z"]

# Domain warp: every later lookup uses a gently bent space, so shapes curl.
warp = n.noise(coord, 0.0011, detail=2.0, name="Warp")
warp_v = n.vmath("SCALE", n.vmath("SUBTRACT", warp.outputs["Color"], (0.5, 0.5, 0.5)), scale=520.0)
P = n.vmath("ADD", coord, warp_v)
flat = n.vmath("MULTIPLY", P, (1.0, 1.0, 0.0))

# Top height: broad banks, then domes, then 3D billows that make overhangs.
bank = n.noise(flat, 0.00035, detail=2.0, name="Bank").outputs[0]
dome = n.noise(flat, 0.0021, detail=3.0, roughness=0.55, name="Dome").outputs[0]
billow = n.noise(P, 0.011, detail=5.0, roughness=0.58, name="Billow").outputs[0]
top = n.math("MULTIPLY_ADD", bank, 150.0, 102.0)          # 102 + 150*bank  ~ 140..215
top = n.math("ADD", top, n.math("MULTIPLY_ADD", dome, 170.0, -85.0))
top = n.math("ADD", top, n.math("MULTIPLY_ADD", billow, 70.0, -35.0), name="Top")

# Base: ragged, around 100 m.
base_noise = n.noise(flat, 0.0032, detail=3.0, name="BaseNoise").outputs[0]
base = n.math("MULTIPLY_ADD", base_noise, 34.0, 104.0, name="BaseZ")  # ~ 112..138

below_top = n.map_range(n.math("SUBTRACT", top, Z), -2.0, 26.0)  # soft cap over 28 m
above_base = n.map_range(n.math("SUBTRACT", Z, base), -6.0, 30.0)
body = n.math("MULTIPLY", below_top, above_base, name="Body")

# Texture throughout the cloud body: erosion keeps the inner layers billowy.
erode = n.noise(P, 0.034, detail=6.0, roughness=0.62, name="Erode").outputs[0]
erode = n.map_range(erode, 0.24, 0.68, 0.08, 1.0)
depth_in = n.map_range(n.math("SUBTRACT", top, Z), 0.0, 45.0)
texture = n.math("MULTIPLY", erode, depth_in, name="Texture")
body = n.math("MULTIPLY", body, texture)

# Openings: the bank is not one blanket. Broad, soft-edged gaps let the water
# show through (the owner's references), drifting with the rest of the bank.
gaps = n.noise(flat, 0.0016, detail=2.0, name="Openings").outputs[0]
open_mask = n.map_range(gaps, 0.43, 0.53, 0.0, 1.0, name="OpenMask")
body = n.math("MULTIPLY", body, open_mask)

# Wisps: thin streamers drawn out along the wind, just above the top.
wind = n.new("ShaderNodeMapping", Vector=P)
wind.inputs["Scale"].default_value = (0.3, 1.0, 2.4)
wisp = n.noise(wind, 0.016, detail=8.0, roughness=0.62, distortion=1.4, name="Wisp").outputs[0]
wisp = n.map_range(wisp, 0.55, 0.74)
over = n.math("SUBTRACT", Z, top)
wisp_band = n.math("MULTIPLY", n.map_range(over, -6.0, 6.0), n.map_range(over, 8.0, 70.0, 1.0, 0.0))
wisps = n.math("MULTIPLY", n.math("MULTIPLY", wisp, wisp_band), 0.32, name="Wisps")

# Ragged eastern edge: the bay under the bridge is fogged, the city is clear.
edge = n.noise(flat, 0.0009, detail=3.0, name="EdgeNoise").outputs[0]
edge_x = n.math("ADD", X, n.math("MULTIPLY_ADD", edge, 2600.0, -1300.0))
east = n.map_range(edge_x, 1400.0, 3900.0, 1.0, 0.0, name="EastClear")

shape = n.math("MULTIPLY", n.math("ADD", body, wisps), east, name="Shape")
sigma = n.value(0.008, "FogSigma")
density = n.math("MULTIPLY", shape, sigma, name="Density")

vol = n.new("ShaderNodeVolumePrincipled", "Volume")
vol.inputs["Color"].default_value = (0.94, 0.94, 0.96, 1)
vol.inputs["Anisotropy"].default_value = 0.22
n.links.new(density, vol.inputs["Density"])
glow = n.value(0.55, "FogGlow")
# Glow only well inside the layer: the sunlit top keeps its relief and shadows,
# while the interior and the underside stay luminous.
deep = n.math("MULTIPLY", n.map_range(n.math("SUBTRACT", top, Z), 8.0, 70.0), n.map_range(n.math("SUBTRACT", Z, base), -10.0, 25.0, 0.6, 1.0))
n.links.new(n.math("MULTIPLY", n.math("MULTIPLY", density, glow), deep), vol.inputs["Emission Strength"])
n.links.new(n.rgb((1.0, 0.86, 0.82), "FogGlowColor"), vol.inputs["Emission Color"])
out = n.new("ShaderNodeOutputMaterial")
n.links.new(vol.outputs[0], out.inputs["Volume"])

# Overcast fill under the layer: covers the fogged area, invisible to the
# camera and in reflections (the water reflects the fog itself).
fill = bpy.data.objects["FogCeiling"]
fill.location = (-3500.0, 0.0, 88.0)
fill.data.size = 11000.0
fill.data.size_y = 15000.0
fill.visible_camera = False
fill.visible_glossy = False
fill.visible_transmission = False
fill.visible_volume_scatter = False

s = bpy.context.scene
s.cycles.volume_bounces = 1
s.cycles.volume_step_rate = 4.0
s.cycles.volume_max_steps = 256
print("fog: rebuilt")
