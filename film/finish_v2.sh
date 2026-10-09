#!/bin/zsh
# After film/render_v2.py finishes a time of day: put its frames on the site
# and refresh the preview deployment (never production).
#
#   zsh film/finish_v2.sh sunset
#
# 1. encode PNGs to WebP (1600 and 768 wide) for the descent and both loops
# 2. (no loop clips: the live fog engine animates the held first/last frame)
# 3. re-render the traffic fog masks from the v2 scene (its fog has openings)
# 4. build, then deploy to the redesign-cinematic preview alias
set -e
cd "$(dirname "$0")/.."
KIND=${1:-sunset}
RUN=film/frames/live-background-20261008-134539
BLENDER=/opt/homebrew/bin/blender
SCENE=$RUN/descent-$KIND-v2.blend
STAMP=$(date +%Y%m%d-%H%M%S)

until grep -q "V2_DONE $KIND" $RUN/render-v2.log 2>/dev/null; do sleep 60; done
echo "render complete $(date)"

encode() {  # src_dir dst_dir
  python3 -I - "$1" "$2" <<'PY'
import pathlib, sys
from PIL import Image
src, dst = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
(dst / "m").mkdir(parents=True, exist_ok=True)
frames = sorted(src.glob("*.png"))
for i, f in enumerate(frames, 1):
    with Image.open(f) as im:
        im = im.convert("RGB")
        im.save(dst / f"{i:04d}.webp", "WEBP", quality=90, method=6)
        im.resize((768, 432), Image.Resampling.LANCZOS).save(dst / "m" / f"{i:04d}.webp", "WEBP", quality=88, method=6)
print(f"{dst}: {len(frames)} frames")
PY
}

WEB=$RUN/web-v2
rm -rf $WEB && mkdir -p $WEB
encode $RUN/frames/$KIND-v2 $WEB/$KIND

# Keep what the site had, then swap in the new frames and loops.
mkdir -p film/frames/site-before-v2-$STAMP
cp -R public/film/$KIND film/frames/site-before-v2-$STAMP/
rm -rf public/film/$KIND && cp -R $WEB/$KIND public/film/$KIND

# Traffic masks from the new fog.
T=$PWD/public/film/traffic
mkdir -p film/frames/site-before-v2-$STAMP/traffic && cp -R $T/mask-* film/frames/site-before-v2-$STAMP/traffic/
rm -rf $T/mask-sunset
$BLENDER -b $SCENE --python-exit-code 1 --python film/export_traffic_mask.py -- $T/mask-open-sunset.png 1 1,48,95
$BLENDER -b $SCENE --python-exit-code 1 --python film/export_traffic_mask.py -- $T/mask-city-sunset.png 240 146,194,240
$BLENDER -b $SCENE --python-exit-code 1 --python film/export_traffic_mask.py -- $T/mask-sunset - 1-239

npm run build
npx wrangler pages deploy dist --project-name sentient-partners-site --branch redesign-cinematic --commit-message "v2 $KIND frames"
echo "FINISH_V2_DONE $KIND $(date)"
