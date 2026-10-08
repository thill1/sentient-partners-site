#!/bin/zsh
# Full-resolution renders for each time of day: the held opening loop (fog
# rolling, aircraft passing), the 120-frame descent, and the held city loop
# (boats and traffic), each encoded for the web as soon as it finishes.
set -euo pipefail
cd "$(dirname "$0")/.."
B=/opt/homebrew/bin/blender
Q=(100 20)
for kind in sunset day night; do
  mkdir -p film/frames/$kind film/frames/$kind-open film/frames/$kind-city
  HOLD=1 $B -b film/descent.blend --python film/render.py -- $kind 1 95 2 film/frames/$kind-open $Q > /tmp/sp-render-$kind-open.log 2>&1
  python3 -I film/encode.py $kind-open
  $B -b film/descent.blend --python film/render.py -- $kind 1 240 2 film/frames/$kind $Q > /tmp/sp-render-$kind.log 2>&1
  python3 -I film/encode.py $kind
  HOLD=240 $B -b film/descent.blend --python film/render.py -- $kind 146 240 2 film/frames/$kind-city $Q > /tmp/sp-render-$kind-city.log 2>&1
  python3 -I film/encode.py $kind-city
done
echo QUEUE_DONE
