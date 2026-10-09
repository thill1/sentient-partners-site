"""Shape the bay edge and hide the flat coastal skirt beneath the water.

The terrain ramps down to the water over a wide, nearly flat band, which the
light under the fog turns into a pale strip along every shore. Ground below
16 m is pushed under the water. The remaining near-shore faces are refined to
25 m spacing and receive restrained, broad relief so the waterline is not a
single low-resolution contour. This does not add detail to inland hills.
"""
import bmesh
import bpy
from mathutils import Vector, noise

terrain = bpy.data.objects["Terrain"]
mesh = terrain.data
moved = 0
for v in mesh.vertices:
    if v.co.z < 16.0 and v.co.z > -79.0:
        # Deep enough that the bay's water hides the seabed entirely.
        v.co.z = -80.0
        moved += 1

bm = bmesh.new()
bm.from_mesh(mesh)
shore_edges = [
    edge for edge in bm.edges
    if any(-79.0 < vertex.co.z < 130.0 for vertex in edge.verts)
    and any(vertex.co.z <= -79.0 or vertex.co.z < 35.0 for vertex in edge.verts)
]
if shore_edges:
    bmesh.ops.subdivide_edges(bm, edges=shore_edges, cuts=3, use_grid_fill=True)

detail = 0
for vertex in bm.verts:
    z = vertex.co.z
    if 16.0 <= z <= 110.0:
        shore_weight = min(1.0, (z - 16.0) / 20.0) * max(0.0, 1.0 - (z - 16.0) / 110.0)
        broad = noise.noise(Vector((vertex.co.x * 0.018, vertex.co.y * 0.018, 4.7)))
        fine = noise.noise(Vector((vertex.co.x * 0.055, vertex.co.y * 0.055, 9.2)))
        vertex.co.z += shore_weight * (1.7 * broad + 0.55 * fine)
        detail += 1

bm.to_mesh(mesh)
bm.free()
mesh.update()
print(f"coast: lowered {moved} vertices; refined shoreline with {detail} detailed vertices")
