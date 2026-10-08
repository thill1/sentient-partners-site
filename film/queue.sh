#!/bin/zsh
# Full-resolution renders for each time of day: the held opening loop (fog
# rolling), the 120-frame descent, and the held city loop (boats, traffic,
# water). Each time of day gets its own random boat layout (BOAT_SEED),
# built into a copy of the scene. Aircraft are drawn live on the page.
set -euo pipefail
cd "$(dirname "$0")/.."
B=/opt/homebrew/bin/blender
Q=(100 20)
typeset -A SEEDS
SEEDS=(sunset 1903 day 2718 night 3141)
for kind in sunset day night; do
  scene=film/descent-$kind.blend
  BOAT_SEED=$SEEDS[$kind] $B -b film/descent.blend --python-exit-code 1 --python film/build/boats.py --python film/build/ceiling_link.py \
    --python-expr "import bpy; bpy.ops.wm.save_as_mainfile(filepath='$PWD/$scene')" > /tmp/sp-build-$kind.log 2>&1
  rm -rf film/frames/$kind film/frames/$kind-open film/frames/$kind-city
  mkdir -p film/frames/$kind film/frames/$kind-open film/frames/$kind-city
  HOLD=1 $B -b $scene --python film/render.py -- $kind 1 95 2 film/frames/$kind-open $Q > /tmp/sp-render-$kind-open.log 2>&1
  python3 -I film/encode.py $kind-open
  $B -b $scene --python film/render.py -- $kind 1 240 2 film/frames/$kind $Q > /tmp/sp-render-$kind.log 2>&1
  python3 -I film/encode.py $kind
  HOLD=240 $B -b $scene --python film/render.py -- $kind 146 240 2 film/frames/$kind-city $Q > /tmp/sp-render-$kind-city.log 2>&1
  python3 -I film/encode.py $kind-city
done
echo QUEUE_DONE
