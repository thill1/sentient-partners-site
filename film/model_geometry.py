"""Shared Blender geometry/material export for the live browser layers."""
import bpy


def export_meshes(objects, origin):
    groups = {}
    depsgraph = bpy.context.evaluated_depsgraph_get()
    for obj in objects:
        if obj.type not in {"MESH", "CURVE"}:
            continue
        evaluated = obj.evaluated_get(depsgraph)
        mesh = evaluated.to_mesh()
        mesh.calc_loop_triangles()
        transform = origin @ evaluated.matrix_world
        normal_transform = transform.to_3x3().inverted().transposed()
        for triangle in mesh.loop_triangles:
            material = mesh.materials[triangle.material_index]
            if material.name not in groups:
                nodes = material.node_tree.nodes if material.node_tree else []
                bsdf = next((n for n in nodes if n.type == "BSDF_PRINCIPLED"), None)
                emission = next((n for n in nodes if n.type == "EMISSION"), None)
                color = list(bsdf.inputs["Base Color"].default_value)[:3] if bsdf else list(material.diffuse_color)[:3]
                emissive = list(emission.inputs["Color"].default_value)[:3] if emission else list(bsdf.inputs["Emission Color"].default_value)[:3] if bsdf else [0, 0, 0]
                strength = emission.inputs["Strength"].default_value if emission else bsdf.inputs["Emission Strength"].default_value if bsdf else 0
                groups[material.name] = {"name": material.name, "color": color, "roughness": bsdf.inputs["Roughness"].default_value if bsdf else .5, "metallic": bsdf.inputs["Metallic"].default_value if bsdf else 0, "emission": [c * strength for c in emissive], "positions": [], "normals": []}
            group = groups[material.name]
            for vertex_index, loop_index in zip(triangle.vertices, triangle.loops):
                position = transform @ mesh.vertices[vertex_index].co
                normal = (normal_transform @ mesh.corner_normals[loop_index].vector).normalized()
                group["positions"].extend(round(c, 5) for c in position)
                group["normals"].extend(round(c, 5) for c in normal)
        evaluated.to_mesh_clear()
    return list(groups.values())
