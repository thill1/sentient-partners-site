"""Buildings and tree cover from OpenStreetMap (Overpass) for the scene area."""
import json, os, sys, time, urllib.parse, urllib.request
HERE = os.path.dirname(os.path.abspath(__file__)); C = os.path.join(HERE, 'cache'); os.makedirs(C, exist_ok=True)
def q(name, query):
    out = os.path.join(C, name)
    if os.path.exists(out) and os.path.getsize(out) > 1000: print(name, 'cached'); return
    body = urllib.parse.urlencode({'data': query}).encode()
    for ep in ('https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'):
        for attempt in range(3):
            try:
                req = urllib.request.Request(ep, data=body, headers={'User-Agent': 'SentientSiteBuild/1.0 (tghill@gmail.com)'})
                data = urllib.request.urlopen(req, timeout=300).read()
                json.loads(data); open(out, 'wb').write(data); print(name, len(data) // 1024, 'KB'); return
            except Exception as e:
                print(name, ep, 'retry', e); time.sleep(10)
    raise SystemExit('failed ' + name)
# Buildings: northeast San Francisco (Marina to SoMa), in four bands; plus Alcatraz, Sausalito/Marin waterfront.
bands = [(37.765, 37.778), (37.778, 37.790), (37.790, 37.800), (37.800, 37.812)]
for i, (a, b) in enumerate(bands):
    q(f'buildings_{i}.json', f'[out:json][timeout:240];way["building"]({a},-122.4790,{b},-122.3850);out geom tags qt;')
q('buildings_islands.json', '[out:json][timeout:240];(way["building"](37.8240,-122.4260,37.8290,-122.4190);way["building"](37.8080,-122.3800,37.8300,-122.3550);way["building"](37.8400,-122.4900,37.8700,-122.4700););out geom tags qt;')
q('trees.json', '[out:json][timeout:240];(way["landuse"="forest"](37.76,-122.53,37.86,-122.38);way["natural"="wood"](37.76,-122.53,37.86,-122.38);relation["natural"="wood"](37.76,-122.53,37.86,-122.38);relation["landuse"="forest"](37.76,-122.53,37.86,-122.38);way["leisure"="park"](37.76,-122.48,37.81,-122.38););out geom tags qt;')
