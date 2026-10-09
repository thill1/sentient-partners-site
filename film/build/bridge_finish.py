"""Golden Gate finish: sodium deck lamps, orange railings, olive low ground.

The lamp heads were 1.2 m emissive boxes; at full strength they bloomed into
white balls floating over the deck. Shrink each head about its own centre to
a fixture-sized 0.45 m and give it the orange of sodium light. Idempotent.
"""
import bmesh
import bpy

lamps = bpy.data.objects["DeckLamps"]
if not lamps.get("fixture_size"):
    bm = bmesh.new()
    bm.from_mesh(lamps.data)
    # Each head is a separate box: group vertices by connectivity.
    bm.verts.ensure_lookup_table()
    seen = set()
    for v in bm.verts:
        if v.index in seen:
            continue
        stack, group = [v], []
        while stack:
            w = stack.pop()
            if w.index in seen:
                continue
            seen.add(w.index)
            group.append(w)
            stack.extend(e.other_vert(w) for e in w.link_edges)
        centre = sum((g.co for g in group), group[0].co * 0) / len(group)
        for g in group:
            g.co = centre + (g.co - centre) * 0.375
    bm.to_mesh(lamps.data)
    bm.free()
    lamps["fixture_size"] = True
lamp = bpy.data.materials["DeckLamp"].node_tree.nodes["Lamp"]
lamp.inputs["Emission Color"].default_value = (1.0, 0.5, 0.18, 1)
print("deck lamps: fixture-sized, sodium orange")

# The deck's edge barriers were pale concrete and read, with the sidewalks,
# as a white plank along the span. The real railings are International Orange.
barrier = next(n for n in bpy.data.materials["Barrier"].node_tree.nodes if n.type == "BSDF_PRINCIPLED")
barrier.inputs["Base Color"].default_value = (0.42, 0.075, 0.03, 1)
for node in bpy.data.materials["Asphalt"].node_tree.nodes:
    if node.type == "MIX" and node.data_type == "RGBA" and tuple(round(c, 2) for c in node.inputs["B"].default_value[:3]) == (0.32, 0.31, 0.29):
        node.inputs["B"].default_value = (0.13, 0.128, 0.122, 1)   # sidewalks and median
# Low ground: olive scrub and woodland, not near-black.
bpy.data.materials["Hills"].node_tree.nodes["ShoreMix"].inputs["A"].default_value = (0.1, 0.12, 0.065, 1)
print("bridge finish: orange railings, darker sidewalks, olive low ground")
