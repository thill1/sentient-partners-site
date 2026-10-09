"""Refine the airliners and fly them through the opening and skyline beats."""
import bmesh
import bpy
import math
from mathutils import Quaternion, Vector

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


def detail_material(name, color, roughness, metallic):
    material = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    material.use_nodes = True
    bsdf = next(node for node in material.node_tree.nodes if node.type == "BSDF_PRINCIPLED")
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    return material


cockpit_glass = detail_material("AircraftCockpitGlass", (0.022, 0.052, 0.075), 0.16, 0.35)
intake_liner = detail_material("AircraftIntakeLiner", (0.025, 0.03, 0.035), 0.42, 0.6)
engine_lip = detail_material("AircraftEngineLip", (0.43, 0.46, 0.48), 0.24, 0.75)
fan_blade = detail_material("AircraftFanBlade", (0.13, 0.15, 0.17), 0.3, 0.8)

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

    def add_detail(label, vertices, faces, material, smooth=False):
        mesh = bpy.data.meshes.new(f"{plane.name} {label}")
        mesh.from_pydata(vertices, [], faces)
        mesh.materials.append(material)
        for face in mesh.polygons:
            face.use_smooth = smooth
        obj = bpy.data.objects.new(mesh.name, mesh)
        details.objects.link(obj)
        obj.parent = plane
        return obj

    # Fit each windshield pane to the existing nose surface rather than
    # placing a flat rectangle in front of it. Narrow gaps are its frames.
    panes = [
        [(0.08, 26.5), (1.12, 26.2), (1.05, 27.8), (0.08, 28.3)],
        [(1.23, 25.2), (2.02, 24.8), (1.93, 26.4), (1.2, 27.6)],
        [(2.13, 24.6), (2.5, 24.25), (2.4, 25.5), (2.05, 26.1)],
    ]
    for side in (-1, 1):
        for index, pane in enumerate(panes):
            vertices = []
            for x, y in pane:
                hit, location, normal, _face = plane.ray_cast(Vector((side * x, y, 20)), Vector((0, 0, -1)))
                if not hit:
                    raise RuntimeError(f"Cockpit pane misses {plane.name} skin")
                vertices.append(tuple(location + normal * 0.025))
            add_detail(f"Cockpit {side} {index}", vertices, [(0, 1, 2, 3)], cockpit_glass)

    # The inherited nacelles were capped cylinders. Open the intake/exhaust
    # ends and give them a metal lip, recessed liner and visible fan vanes.
    bm = bmesh.new()
    bm.from_mesh(plane.data)
    belly_index = next(i for i, material in enumerate(plane.data.materials) if material.name == "AirlinerBelly")
    caps = [face for face in bm.faces if face.material_index == belly_index and any(all(abs(v.co.y - y) < 0.001 for v in face.verts) for y in (2.25, 8.75))]
    bmesh.ops.delete(bm, geom=caps, context="FACES_ONLY")
    bm.to_mesh(plane.data)
    bm.free()
    for side in (-1, 1):
        cx, cz = side * 10, -2.6
        for label, y, outer, inner, depth in (("Intake", 8.755, 1.2, 1.055, 7.75), ("Exhaust", 2.245, 1.4, 1.13, 3.3)):
            vertices = [(cx + radius * math.cos(i * math.tau / 48), y, cz + radius * math.sin(i * math.tau / 48)) for radius in (outer, inner) for i in range(48)]
            faces = [(i, (i + 1) % 48, 48 + (i + 1) % 48, 48 + i) for i in range(48)]
            add_detail(f"{label} lip {side}", vertices, faces, engine_lip, True)
            vertices = [(cx + inner * math.cos(i * math.tau / 48), yy, cz + inner * math.sin(i * math.tau / 48)) for yy in (y, depth) for i in range(48)]
            add_detail(f"{label} liner {side}", vertices, faces, intake_liner, True)
            vertices = [(cx, depth, cz)] + [(cx + inner * math.cos(i * math.tau / 48), depth, cz + inner * math.sin(i * math.tau / 48)) for i in range(48)]
            add_detail(f"{label} back {side}", vertices, [(0, i + 1, (i + 1) % 48 + 1) for i in range(48)], intake_liner)
        blades = []
        faces = []
        for index in range(24):
            angle = index * math.tau / 24
            start = len(blades)
            for radius, sweep in ((0.23, 0), (1.015, -0.18), (1.015, -0.11), (0.23, 0.09)):
                blades.append((cx + radius * math.cos(angle + sweep), 7.78, cz + radius * math.sin(angle + sweep)))
            faces.append(tuple(range(start, start + 4)))
        add_detail(f"Fan blades {side}", blades, faces, fan_blade)


def key_path(plane, path):
    """Sample a smooth path and orient the fuselage along its real tangent.

    The previous animation linearly moved aircraft through the key locations
    while holding one constant yaw, so the nose could point across or away
    from the actual flight path. Catmull-Rom interpolation gives continuous
    position and heading through the control points; orienting local +Y along
    each tangent also makes climb/descent visible as nose pitch.
    """
    controls = [Vector(location) for _frame, location in path]
    first, last = path[0][0], path[-1][0]

    def sample(frame):
        position = (frame - first) / (last - first) * (len(controls) - 1)
        segment = min(len(controls) - 2, max(0, int(position)))
        t = position - segment
        p0 = controls[max(0, segment - 1)]
        p1 = controls[segment]
        p2 = controls[segment + 1]
        p3 = controls[min(len(controls) - 1, segment + 2)]
        t2, t3 = t * t, t * t * t
        point = 0.5 * (
            2 * p1 + (p2 - p0) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2
            + (-p0 + 3 * p1 - 3 * p2 + p3) * t3
        )
        tangent = 0.5 * (
            (p2 - p0) + 2 * (2 * p0 - 5 * p1 + 4 * p2 - p3) * t
            + 3 * (-p0 + 3 * p1 - 3 * p2 + p3) * t2
        )
        return point, tangent.normalized()

    plane.animation_data_clear()
    plane.rotation_mode = "QUATERNION"
    previous = None
    for frame in range(first, last + 1):
        location, forward = sample(frame)
        rotation = forward.to_track_quat("Y", "Z")
        # Quaternions q and -q are the same pose; keep keys in one hemisphere
        # so interpolation never flips through a needless full rotation.
        if previous is not None and rotation.dot(previous) < 0:
            rotation = Quaternion(tuple(-component for component in rotation))
        plane.location = location
        plane.rotation_quaternion = rotation
        plane.keyframe_insert("location", frame=frame, group="Flight path")
        plane.keyframe_insert("rotation_quaternion", frame=frame, group="Flight attitude")
        previous = rotation.copy()

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

print("aircraft: smoothed, detailed, and placed through the descent")
