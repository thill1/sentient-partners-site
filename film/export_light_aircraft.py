"""Build a Cessna-class plane and a helicopter for the live aircraft layer.

  blender -b --factory-startup --python film/export_light_aircraft.py -- <repo>

Adds "cessna", "helicopter" and "helirotor" (the main rotor, drawn as its
own spinning instance) to public/film/aircraft/airliner.json alongside the
existing airliner. Real-world dimensions; forward is +Y, up +Z, metres.
Navigation lights are emissive geometry named like the airliner's (NavRed,
NavGreen, NavWhite, Strobe) so the renderer lights and flashes them the same way.
"""
import json
import math
import pathlib
import sys

import bmesh
import bpy
from mathutils import Matrix, Vector

ROOT = pathlib.Path(sys.argv[sys.argv.index("--") + 1])
sys.path.insert(0, str(ROOT / "film"))
from model_geometry import export_meshes  # noqa: E402

for obj in list(bpy.data.objects):
    bpy.data.objects.remove(obj, do_unlink=True)


def material(name, colour, roughness=0.45, metallic=0.0, emission=None, strength=0.0):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = next(n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    bsdf.inputs["Base Color"].default_value = (*colour, 1)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    if emission:
        bsdf.inputs["Emission Color"].default_value = (*emission, 1)
        bsdf.inputs["Emission Strength"].default_value = strength
    return mat


WHITE = material("LightWhite", (0.78, 0.78, 0.76), 0.35)
STRIPE = material("LightStripe", (0.03, 0.08, 0.28), 0.4)
GLASS = material("LightGlass", (0.02, 0.025, 0.03), 0.08, 0.2)
DARK = material("LightDark", (0.04, 0.04, 0.045), 0.6)
PROP = material("LightProp", (0.03, 0.03, 0.03), 0.5)
HELI = material("HeliBody", (0.04, 0.09, 0.2), 0.3, 0.3)
LIGHTS = {"NavRed": material("NavRed", (0.3, 0.0, 0.0), 0.3, emission=(1.0, 0.05, 0.03), strength=6),
          "NavGreen": material("NavGreen", (0.0, 0.3, 0.05), 0.3, emission=(0.1, 1.0, 0.3), strength=6),
          "NavWhite": material("NavWhite", (0.5, 0.5, 0.5), 0.3, emission=(1.0, 0.97, 0.9), strength=6),
          "Strobe": material("Strobe", (0.5, 0.5, 0.5), 0.3, emission=(1.0, 1.0, 1.0), strength=30)}


class Part:
    def __init__(self, name, mat):
        self.bm = bmesh.new()
        self.name, self.mat = name, mat

    def box(self, centre, size, rot_z=0.0, rot_x=0.0):
        m = Matrix.Translation(centre) @ Matrix.Rotation(rot_z, 4, "Z") @ Matrix.Rotation(rot_x, 4, "X") @ Matrix.Diagonal((*size, 1))
        bmesh.ops.create_cube(self.bm, size=1.0, matrix=m)

    def loft(self, sections, segments=14):
        """Rings along Y: (y, half-width, half-height, z-centre)."""
        rings = []
        for y, w, h, z in sections:
            rings.append([self.bm.verts.new((w * math.cos(a), y, z + h * math.sin(a)))
                          for a in (math.tau * i / segments for i in range(segments))])
        self.bm.faces.new(list(reversed(rings[0])))
        self.bm.faces.new(rings[-1])
        for r0, r1 in zip(rings, rings[1:]):
            for i in range(segments):
                j = (i + 1) % segments
                self.bm.faces.new((r0[i], r0[j], r1[j], r1[i]))

    def sphere(self, centre, radius):
        bmesh.ops.create_icosphere(self.bm, subdivisions=1, radius=radius, matrix=Matrix.Translation(centre))

    def finish(self, parent=None):
        mesh = bpy.data.meshes.new(self.name)
        bmesh.ops.recalc_face_normals(self.bm, faces=self.bm.faces)
        self.bm.to_mesh(mesh)
        self.bm.free()
        obj = bpy.data.objects.new(self.name, mesh)
        obj.data.materials.append(self.mat)
        bpy.context.scene.collection.objects.link(obj)
        for poly in obj.data.polygons:
            poly.use_smooth = True
        return obj


def lights(parts, red, green, white, strobe):
    for name, centre in (("NavRed", red), ("NavGreen", green), ("NavWhite", white), ("Strobe", strobe)):
        p = Part(f"{parts}{name}", LIGHTS[name])
        p.sphere(centre, 0.12)
        yield p.finish()


# ---------------------------------------------------------------- Cessna 172 class
cessna = []
body = Part("CessnaBody", WHITE)
body.loft([(4.1, 0.08, 0.08, 0.05), (3.8, 0.45, 0.5, 0.0), (2.9, 0.58, 0.68, 0.05), (1.6, 0.6, 0.72, 0.15),
           (0.2, 0.55, 0.62, 0.12), (-1.6, 0.36, 0.42, 0.18), (-3.4, 0.18, 0.25, 0.3), (-4.2, 0.08, 0.12, 0.35)])
cessna.append(body.finish())
wing = Part("CessnaWing", WHITE)
wing.box((0, 1.25, 0.86), (11.0, 1.5, 0.14))
wing.box((0, -3.95, 0.35), (3.4, 0.85, 0.08))                         # tailplane
wing.box((0, -3.85, 1.05), (0.1, 1.15, 1.4))                          # fin
for side in (-1, 1):                                                  # wing struts
    wing.box((side * 1.55, 1.1, 0.25), (0.08, 0.16, 1.35), rot_z=0, rot_x=0)
    wing.box((side * 1.25, 0.9, -0.55), (0.12, 0.3, 0.55))            # main gear legs
cessna.append(wing.finish())
stripe = Part("CessnaStripe", STRIPE)
stripe.loft([(3.0, 0.6, 0.06, -0.12), (-3.6, 0.2, 0.05, 0.22)], segments=10)
cessna.append(stripe.finish())
glass = Part("CessnaGlass", GLASS)
glass.box((0, 2.05, 0.55), (1.12, 1.0, 0.36))                         # windscreen and cabin windows
glass.box((0, 0.9, 0.5), (1.18, 1.3, 0.34))
cessna.append(glass.finish())
prop = Part("CessnaProp", PROP)
prop.box((0, 4.18, 0.05), (1.9, 0.06, 0.14))
prop.box((0, 4.18, 0.05), (0.14, 0.06, 1.9))
cessna.append(prop.finish())
cessna += list(lights("Cessna", (-5.5, 1.3, 0.86), (5.5, 1.3, 0.86), (0, -4.25, 0.4), (0, -3.9, 1.8)))

# ---------------------------------------------------------------- Bell 407 class helicopter
heli = []
hb = Part("HeliBody", HELI)
hb.loft([(2.3, 0.2, 0.25, -0.1), (1.9, 0.7, 0.75, 0.0), (1.0, 0.95, 0.95, 0.05), (-0.6, 0.95, 0.9, 0.1),
         (-1.5, 0.6, 0.6, 0.3), (-2.2, 0.28, 0.3, 0.5), (-6.3, 0.15, 0.18, 0.7), (-6.6, 0.12, 0.14, 0.75)])
hb.box((0, -6.3, 1.35), (0.08, 0.7, 1.2))                             # tail fin
hb.box((0, -5.4, 0.7), (1.9, 0.45, 0.06))                             # horizontal stabiliser
hb.box((0, 0.1, 1.15), (0.5, 0.8, 0.35))                              # engine fairing / mast
heli.append(hb.finish())
hg = Part("HeliGlass", GLASS)
hg.loft([(2.35, 0.15, 0.18, -0.05), (2.0, 0.66, 0.66, 0.05), (1.1, 0.9, 0.82, 0.15)], segments=14)
heli.append(hg.finish())
skid = Part("HeliSkids", DARK)
for side in (-1, 1):
    skid.box((side * 1.1, 0.1, -1.25), (0.08, 3.4, 0.08))
    for y in (-0.8, 1.0):
        skid.box((side * 0.85, y, -0.95), (0.08, 0.08, 0.6))
skid.box((-0.42, -6.5, 0.85), (0.04, 0.05, 1.5))                      # tail rotor blades
skid.box((-0.42, -6.5, 0.85), (0.04, 1.5, 0.05))
heli.append(skid.finish())
heli += list(lights("Heli", (-0.97, 0.6, 0.0), (0.97, 0.6, 0.0), (0, -6.65, 0.75), (0, -0.2, 1.45)))
rotor = Part("HeliRotor", DARK)
for angle in (0, math.pi / 2):                                        # four-blade main rotor
    rotor.box((0, 0, 1.6), (10.7, 0.3, 0.04), rot_z=angle)
rotor.box((0, 0, 1.55), (0.35, 0.35, 0.25))
rotor_obj = rotor.finish()

bpy.context.view_layer.update()
models = {
    "cessna": export_meshes(cessna, Matrix.Identity(4)),
    "helicopter": export_meshes(heli, Matrix.Identity(4)),
    "helirotor": export_meshes([rotor_obj], Matrix.Identity(4)),
}
path = ROOT / "public" / "film" / "aircraft" / "airliner.json"
data = json.loads(path.read_text())
airliner = data.get("models", {}).get("airliner") or data["meshes"]
data["models"] = {"airliner": airliner, **models}
data["meshes"] = airliner
path.write_text(json.dumps(data, separators=(",", ":")) + "\n")
print("light aircraft:", {k: sum(len(m["positions"]) // 9 for m in v) for k, v in models.items()}, "triangles")
