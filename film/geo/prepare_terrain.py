"""Real terrain for the scene from Terrarium elevation tiles (z15, ~4 m/px).

  python3 film/geo/prepare_terrain.py   ->  film/geo/cache/terrain.npz

Samples heights on two grids in scene metres (geoxf.py: bridge-anchored):
near (4 m) around the Golden Gate and the phone shots, far (16 m) out to
Marin, the East Bay and the southern city. Seabed is clamped below the water
plane. Tiles are validated; a bad tile aborts with its name.
"""
import glob, math, os, sys
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__))
from geoxf import to_latlon

HERE = os.path.dirname(os.path.abspath(__file__))
Z = 15
tiles = {}
for f in glob.glob(os.path.join(HERE, 'cache/dem/15_*.png')):
    _, x, y = os.path.basename(f)[:-4].split('_')
    try:
        a = np.asarray(Image.open(f).convert('RGB'), dtype=np.float64)
    except Exception as e:
        raise SystemExit(f'bad tile {f}: {e}')
    tiles[(int(x), int(y))] = a[..., 0] * 256 + a[..., 1] + a[..., 2] / 256 - 32768
xs = sorted({k[0] for k in tiles}); ys = sorted({k[1] for k in tiles})
X0, Y0 = xs[0], ys[0]
mosaic = np.zeros(((ys[-1] - Y0 + 1) * 256, (xs[-1] - X0 + 1) * 256))
for (x, y), a in tiles.items():
    mosaic[(y - Y0) * 256:(y - Y0 + 1) * 256, (x - X0) * 256:(x - X0 + 1) * 256] = a

def sample(lat, lon):
    n = 2 ** Z
    px = ((lon + 180) / 360 * n - X0) * 256 - 0.5
    py = ((1 - np.arcsinh(np.tan(np.radians(lat))) / np.pi) / 2 * n - Y0) * 256 - 0.5
    i = np.clip(np.floor(px).astype(int), 0, mosaic.shape[1] - 2); j = np.clip(np.floor(py).astype(int), 0, mosaic.shape[0] - 2)
    fx = np.clip(px - i, 0, 1); fy = np.clip(py - j, 0, 1)
    return (mosaic[j, i] * (1 - fx) + mosaic[j, i + 1] * fx) * (1 - fy) + (mosaic[j + 1, i] * (1 - fx) + mosaic[j + 1, i + 1] * fx) * fy

def grid(x0, x1, y0, y1, step):
    gx = np.arange(x0, x1 + 1e-6, step); gy = np.arange(y0, y1 + 1e-6, step)
    X, Y = np.meshgrid(gx, gy)
    lat, lon = to_latlon(X, Y)
    h = sample(lat, lon)
    return gx, gy, np.where(h < 0.5, np.minimum(h, -4.0) * 1.0 - 4.0, h).astype(np.float32)

NEAR = (-3200, 3000, -3000, 3600)            # strait, headlands, Presidio, north shore
near = grid(*NEAR, 4.0)
far = grid(-7000, 13000, -11000, 7000, 16.0)
np.savez_compressed(os.path.join(HERE, 'cache/terrain.npz'), near_x=near[0], near_y=near[1], near_h=near[2], far_x=far[0], far_y=far[1], far_h=far[2], near_box=np.array(NEAR, dtype=np.float32))
print('terrain: near', near[2].shape, 'far', far[2].shape, 'max m', round(float(far[2].max()), 1), 'near max', round(float(near[2].max()), 1))
