"""Refine the airliners and fly them through the opening and skyline beats."""
import bmesh
import bpy

planes = [bpy.data.objects[name] for name in ("AirlinerNear", "AirlinerMid", "AirlinerFar")]
for plane in planes:
    if plane.type != "MESH":
        raise RuntimeError(f"{plane.name} is not a mesh")
    for polygon in plane.data.polygons:
        polygon.use_smooth = True
    plane.animation_data_clear()

skin = bpy.data.materials["AirlinerSkin"]
skin_bsdf = next(node for node in skin.node_tree.nodes if node.type == "BSDF_PRINCIPLED")
skin_bsdf.inputs["Roughness"].default_value = 0.34
skin_bsdf.inputs["Metallic"].default_value = 0.12
skin_bsdf.inputs["Coat Weight"].default_value = 0.22
tail = bpy.data.materials["AirlinerTail"]

window = bpy.data.materials.get("AirlinerWindow") or bpy.data.materials.new("AirlinerWindow")
window.diffuse_color = (0.055, 0.12, 0.17, 1.0)
window.use_nodes = True
window_bsdf = next(node for node in window.node_tree.nodes if node.type == "BSDF_PRINCIPLED")
window_bsdf.inputs["Base Color"].default_value = (0.035, 0.085, 0.12, 1.0)
window_bsdf.inputs["Roughness"].default_value = 0.24
window_bsdf.inputs["Metallic"].default_value = 0.18

details = bpy.data.collections.get("Aircraft Details")
if details is None:
    details = bpy.data.collections.new("Aircraft Details")
    bpy.context.scene.collection.children.link(details)
for obj in list(details.objects):
    bpy.data.objects.remove(obj, do_unlink=True)

for plane in planes:
    # Cabin windows are grouped into one mesh per aircraft, keeping the detail
    # light enough for all three time-of-day render passes.
    bm = bmesh.new()
    for side in (-1, 1):
        for y in range(-18, 20, 2):
            sphere = bmesh.ops.create_uvsphere(bm, u_segments=8, v_segments=6, radius=1.0)
            for vert in sphere["verts"]:
                vert.co = (side * 3.35 + vert.co.x * 0.12, y + vert.co.y * 0.22, 2.0 + vert.co.z * 0.18)
    mesh = bpy.data.meshes.new(f"{plane.name} Windows")
    bm.to_mesh(mesh)
    bm.free()
    mesh.materials.append(window)
    obj = bpy.data.objects.new(f"{plane.name} Windows", mesh)
    details.objects.link(obj)
    obj.parent = plane

    curve = bpy.data.curves.new(f"{plane.name} Livery", "CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = 1
    curve.bevel_depth = 0.075
    curve.bevel_resolution = 2
    for side in (-1, 1):
        spline = curve.splines.new("POLY")
        spline.points.add(1)
        spline.points[0].co = (side * 3.28, -16.0, 0.95, 1.0)
        spline.points[1].co = (side * 3.28, 16.0, 0.95, 1.0)
    stripe = bpy.data.objects.new(f"{plane.name} Livery", curve)
    details.objects.link(stripe)
    stripe.data.materials.append(tail)
    stripe.parent = plane


def key_path(plane, path):
    for frame, location in path:
        plane.location = location
        plane.keyframe_insert("location", frame=frame)
    action = plane.animation_data.action
    try:
        curves = list(action.fcurves)
    except AttributeError:
        curves = [curve for layer in action.layers for strip in layer.strips for bag in strip.channelbags for curve in bag.fcurves]
    for curve in curves:
        for point in curve.keyframe_points:
            point.interpolation = "LINEAR"
        curve.update()


key_path(planes[0], [
    (1, (-2000.0, 1200.0, 870.0)),
    (55, (-1400.0, 600.0, 720.0)),
    (100, (-900.0, -50.0, 610.0)),
])
key_path(planes[1], [
    (130, (280.0, -340.0, 670.0)),
    (190, (1633.0, -575.0, 426.0)),
    (240, (5443.0, -2524.0, 346.0)),
])
key_path(planes[2], [
    (1, (-6500.0, -2500.0, 1800.0)),
    (240, (8000.0, -9000.0, 1450.0)),
])

for plane in planes:
    plane.rotation_euler = (0.0, 0.0, -2.2)
    plane.keyframe_insert("rotation_euler", frame=1)
    plane.keyframe_insert("rotation_euler", frame=240)

print("aircraft: smoothed, detailed, and placed through the descent")
