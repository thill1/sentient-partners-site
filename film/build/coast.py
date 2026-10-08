"""Sink the flat coastal skirt into the bay.

The terrain ramps down to the water over a wide, nearly flat band, which the
light under the fog turns into a pale strip along every shore. Ground below
16 m is pushed under the water so each shore meets the bay at a slope.
"""
import bpy

mesh = bpy.data.objects["Terrain"].data
moved = 0
for v in mesh.vertices:
    if v.co.z < 16.0 and v.co.z > -79.0:
        # Deep enough that the bay's water hides the seabed entirely.
        v.co.z = -80.0
        moved += 1
mesh.update()
print("coast: lowered", moved, "vertices")
