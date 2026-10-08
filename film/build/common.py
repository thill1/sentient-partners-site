"""Shared helpers for the film/build/*.py scene passes."""
import bpy


class Nodes:
    """Terse node-graph construction: n = Nodes(tree); a = n.math('ADD', x, 1)."""

    def __init__(self, tree):
        self.tree = tree
        self.nodes = tree.nodes
        self.links = tree.links

    def new(self, kind, name=None, **inputs):
        node = self.nodes.new(kind)
        if name:
            node.name = node.label = name
        for key, value in inputs.items():
            self.set(node.inputs[key], value)
        return node

    def set(self, socket, value):
        if isinstance(value, bpy.types.NodeSocket):
            self.links.new(value, socket)
        elif isinstance(value, bpy.types.Node):
            self.links.new(value.outputs[0], socket)
        else:
            socket.default_value = value

    def math(self, op, a, b=0.0, c=None, name=None):
        node = self.new("ShaderNodeMath", name)
        node.operation = op
        self.set(node.inputs[0], a)
        self.set(node.inputs[1], b)
        if c is not None:
            self.set(node.inputs[2], c)
        return node.outputs[0]

    def vmath(self, op, a, b=(0.0, 0.0, 0.0), scale=None):
        node = self.new("ShaderNodeVectorMath")
        node.operation = op
        self.set(node.inputs[0], a)
        self.set(node.inputs[1], b)
        if scale is not None:
            self.set(node.inputs["Scale"], scale)
        return node.outputs["Value" if op in ("DOT_PRODUCT", "LENGTH", "DISTANCE") else "Vector"]

    def noise(self, vector, scale, detail=4.0, roughness=0.5, distortion=0.0, dims="3D", name=None):
        node = self.new("ShaderNodeTexNoise", name)
        node.noise_dimensions = dims
        self.set(node.inputs["Vector"], vector)
        node.inputs["Scale"].default_value = scale
        node.inputs["Detail"].default_value = detail
        node.inputs["Roughness"].default_value = roughness
        node.inputs["Distortion"].default_value = distortion
        return node

    def map_range(self, value, a, b, c=0.0, d=1.0, smooth=True, clamp=True, name=None):
        node = self.new("ShaderNodeMapRange", name)
        node.interpolation_type = "SMOOTHSTEP" if smooth else "LINEAR"
        node.clamp = clamp
        self.set(node.inputs["Value"], value)
        self.set(node.inputs["From Min"], a)
        self.set(node.inputs["From Max"], b)
        self.set(node.inputs["To Min"], c)
        self.set(node.inputs["To Max"], d)
        return node.outputs["Result"]

    def value(self, v, name):
        node = self.new("ShaderNodeValue", name)
        node.outputs[0].default_value = v
        return node.outputs[0]

    def rgb(self, color, name):
        node = self.new("ShaderNodeRGB", name)
        node.outputs[0].default_value = (*color, 1.0)
        return node.outputs[0]


def fresh_material(name):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.use_nodes = True
    mat.node_tree.nodes.clear()
    return mat, Nodes(mat.node_tree)


def emissive(name, color, strength=1.0):
    mat, n = fresh_material(name)
    bsdf = n.new("ShaderNodeBsdfPrincipled", "BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Emission Color"].default_value = (*color, 1)
    bsdf.inputs["Emission Strength"].default_value = strength
    out = n.new("ShaderNodeOutputMaterial")
    n.links.new(bsdf.outputs[0], out.inputs["Surface"])
    return mat


def principled(name, color, roughness=0.5, metallic=0.0, **extra):
    mat, n = fresh_material(name)
    bsdf = n.new("ShaderNodeBsdfPrincipled", "BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    for key, value in extra.items():
        bsdf.inputs[key.replace("_", " ")].default_value = value
    out = n.new("ShaderNodeOutputMaterial")
    n.links.new(bsdf.outputs[0], out.inputs["Surface"])
    return mat


def collection(name, clear=True):
    coll = bpy.data.collections.get(name)
    if coll is None:
        coll = bpy.data.collections.new(name)
        bpy.context.scene.collection.children.link(coll)
    elif clear:
        for obj in list(coll.objects):
            data = obj.data
            bpy.data.objects.remove(obj, do_unlink=True)
            if data is not None and data.users == 0:
                if isinstance(data, bpy.types.Mesh):
                    bpy.data.meshes.remove(data)
                elif isinstance(data, bpy.types.Curve):
                    bpy.data.curves.remove(data)
    return coll


def remove_objects(prefixes):
    for obj in [o for o in bpy.data.objects if o.name.startswith(tuple(prefixes))]:
        data = obj.data
        bpy.data.objects.remove(obj, do_unlink=True)
        if isinstance(data, bpy.types.Mesh) and data.users == 0:
            bpy.data.meshes.remove(data)
