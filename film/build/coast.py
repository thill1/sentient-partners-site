"""Sink the flat coastal skirt into the bay.

The terrain ramps down to the water over a wide, nearly flat band, which the
light under the fog turns into a pale strip along every shore. Ground below
16 m is pushed under the water so each shore meets the bay at a slope.
"""
import bpy

mesh = bpy.data.objects["Terrain"].data
moved = 0
for v in mesh.vertices:
    if -5.0 < v.co.z < 16.0:
        v.co.z = -8.0
        moved += 1
mesh.update()
print("coast: lowered", moved, "vertices")
