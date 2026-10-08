#!/bin/zsh
# Renders day and night after the sunset batch finishes, encoding each as it completes.
cd "$(dirname "$0")/.."
while pgrep -f "render.py -- sunset" >/dev/null; do sleep 20; done
python3 -I film/encode.py sunset
for kind in day night; do
  mkdir -p film/frames/$kind
  /opt/homebrew/bin/blender -b film/descent.blend --python film/render.py -- $kind 1 240 2 film/frames/$kind 80 32 > /tmp/sp-render-$kind.log 2>&1
  python3 -I film/encode.py $kind
done
echo QUEUE_DONE
