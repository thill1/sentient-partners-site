"""Check exported light anchors against the actual encoded aircraft alpha masks."""
import json
import math
import pathlib

from PIL import Image

root = pathlib.Path(__file__).resolve().parents[1]
atlas = root / "public" / "film" / "aircraft"
metadata = json.loads((atlas / "anchors.json").read_text())
checks = []
failures = []
expected = {f"{elevation}-{heading}" for elevation in ("above", "below") for heading in range(16)}
assert set(metadata["views"]) == expected, "Missing or unexpected sprite views"
for phase in ("day", "sunset", "night"):
    for view, lights in metadata["views"].items():
        elevation, heading = view.split("-")
        path = atlas / f"{phase}-{elevation}-{int(heading):02d}.webp"
        with Image.open(path) as image:
            alpha = image.convert("RGBA").getchannel("A")
            width, height = image.size
            for name, light in lights.items():
                if not light["visible"]:
                    continue
                x = (light["x"] + 0.5) * width
                y = (light["y"] + 0.5) * height
                distances = [
                    math.hypot(px - x, py - y)
                    for py in range(max(0, int(y) - 4), min(height, int(y) + 5))
                    for px in range(max(0, int(x) - 4), min(width, int(x) + 5))
                    if alpha.getpixel((px, py)) > 100
                ]
                distance = min(distances, default=math.inf)
                checks.append(distance)
                if distance > 2:
                    failures.append(f"{path.name} {name}: {distance:.2f} px from silhouette")
assert not failures, "Detached light anchors:\n" + "\n".join(failures)
print(json.dumps({"views": len(expected), "phases": 3, "visible_light_checks": len(checks), "maximum_distance_px": round(max(checks), 4), "failures": failures}))
