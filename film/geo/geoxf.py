"""Real lat/lon <-> scene metres, anchored on the Golden Gate towers.
Scene: south tower (0,-640), north tower (0,640), z up, metres."""
import math
import numpy as np
S = (37.81401, -122.47789); N = (37.82550, -122.47923)
LAT0 = (S[0] + N[0]) / 2; LON0 = (S[1] + N[1]) / 2
KX = 111320 * math.cos(math.radians(LAT0)); KY = 110950
def local(lat, lon): return ((lon - LON0) * KX, (lat - LAT0) * KY)
sx, sy = local(*S); nx, ny = local(*N)
ANG = math.atan2(nx - sx, ny - sy)            # bridge bearing east of north
SCALE = 1280 / math.hypot(nx - sx, ny - sy)
def to_scene(lat, lon):
    x, y = local(lat, lon); c, s = math.cos(ANG), math.sin(ANG)
    return ((x * c - y * s) * SCALE, (x * s + y * c) * SCALE)
def to_latlon(X, Y):
    """Works on scalars or numpy arrays."""
    c, s = math.cos(-ANG), math.sin(-ANG); X, Y = np.asarray(X) / SCALE, np.asarray(Y) / SCALE
    x, y = X * c - Y * s, X * s + Y * c
    return (LAT0 + y / KY, LON0 + x / KX)
