#!/usr/bin/env python3
"""
Turn the hero footage's dusk sky into a sunset, keeping the real clouds, the
camera move and the city as filmed.

For each frame (already graded, see build-hero-loop.py):
1. Find the sky. Above 0.2 of the frame height there is only sky. Below that,
   each column is scanned downward, following the sky's brightness, until it
   meets something clearly darker: a tower or the near hills. That skyline is
   smoothed across the neighbouring frames (allowing for the pan), so no edge
   blinks for a single frame.
   Near the horizon, the distant hills are hazy and only a little darker than
   the sky, so a hard cut would catch them in some columns and miss them in
   others. There each pixel is compared with the brightest sky just above it,
   and the sunset fades out smoothly as it gets darker, which follows the far
   ridgelines exactly. Those distant ridges, and any darker cloud near the
   horizon, still take on some of the sunset through the haze, as they would
   in real air. A soft cap at the horizon lets the far water pick up a little
   of the colour, as a reflection would.
2. Recolour the sky along a sunset ramp: gold at the horizon, then coral,
   mauve and violet, to deep indigo overhead. Each pixel keeps its brightness
   relative to the sky around it, so the clouds keep their shape and their lit
   edges.
3. Add a warm glow low on the horizon, with a soft reflection on the bay. The
   glow moves with the distant hills (measured by phase correlation), because
   the sun is at infinity and the camera is panning.
4. Warm the city's highlights slightly; its shadows stay cool.

Usage:
  python3 sunset-sky.py graded_frames out_frames            # all frames
  python3 sunset-sky.py graded_frames preview.png --preview # five frames, with masks

Frames are read and written as f00001.jpg, f00002.jpg, ... (1600x900).
"""
import os
import sys

import cv2
import numpy as np

SRC, OUT = sys.argv[1], sys.argv[2]
PREVIEW = "--preview" in sys.argv
W, H = 1600, 900

Y_TOP = int(H * 0.2)  # everything above this is sky
Y_HARD = int(H * 0.345)  # the column scan only cuts around things taller than this
Y_SOFT0, Y_SOFT1 = int(H * 0.31), int(H * 0.335)  # the per-pixel matte takes over between these
Y_HORIZON = H * 0.38  # where the sky meets the far water
Y_CAP0, Y_CAP1 = int(H * 0.365), int(H * 0.41)  # the sky mask fades out between these
SUN_X0 = W * 0.42  # the glow's position on the first frame
SUN_Y = H * 0.385

# The sunset ramp, by height above the horizon (0 at the horizon, 1 at the top), in BGR.
RAMP_H = np.array([0.0, 0.08, 0.2, 0.38, 0.62, 1.0])
RAMP_C = np.array(
    [
        [120, 200, 255],  # gold
        [92, 150, 250],  # amber
        [100, 112, 236],  # coral
        [140, 100, 168],  # mauve
        [128, 80, 100],  # violet
        [88, 52, 46],  # indigo
    ],
    np.float32,
) / 255.0

files = sorted(f for f in os.listdir(SRC) if f.endswith(".jpg"))
N = len(files)

rows = np.arange(H, dtype=np.float32)[:, None]
cols = np.arange(W, dtype=np.float32)[None, :]
height = np.clip((Y_HORIZON - rows) / Y_HORIZON, 0, 1)
ramp = np.stack([np.interp(height[:, 0], RAMP_H, RAMP_C[:, c]) for c in range(3)], axis=1)[:, None, :]  # H x 1 x 3
cap = np.ones((H, 1), np.float32)
cap[Y_CAP0:Y_CAP1, 0] = np.linspace(1, 0, Y_CAP1 - Y_CAP0)
cap[Y_CAP1:, 0] = 0


def load(i):
    return cv2.imread(os.path.join(SRC, files[i]), cv2.IMREAD_COLOR).astype(np.float32) / 255.0


def luma(img):
    return cv2.GaussianBlur(img[..., 2] * 0.299 + img[..., 1] * 0.587 + img[..., 0] * 0.114, (0, 0), 1.5)


def skyline(L):
    """For each column, the row where the sky meets whatever is in front of it."""
    ref = L[Y_TOP - 4:Y_TOP].mean(axis=0)
    alive = np.ones(W, bool)
    run = np.zeros(W, np.int32)
    line = np.full(W, float(Y_CAP1))
    for y in range(Y_TOP, Y_HARD):
        l = L[y]
        dark = l < ref * 0.86 - 0.01
        run = np.where(dark, run + 1, 0)
        hit = alive & (run >= 3)
        line[hit] = y - 2
        alive &= ~hit
        ref = np.where(alive & ~dark, ref * 0.85 + l * 0.15, ref)
    return cv2.medianBlur(line.astype(np.float32).reshape(1, -1), 5).ravel()


# Where distant things near the horizon take on the sunset through the haze.
haze_band = (np.clip((rows - H * 0.3) / (H * 0.03), 0, 1) * np.clip((H * 0.42 - rows) / (H * 0.03), 0, 1)).astype(np.float32)


def haze_matte(L):
    """
    Near the horizon: how much each pixel is sky, from its brightness against
    the sky just above it, and how much haze lies between it and the camera
    (paler means farther).
    """
    above = cv2.dilate(L, np.ones((41, 1), np.uint8), anchor=(0, 40))  # brightest in the 40 rows above
    ref = cv2.GaussianBlur(above, (0, 0), sigmaX=12, sigmaY=2)
    ratio = L / np.maximum(ref, 1e-3)
    a = np.clip((ratio - 0.78) / (0.93 - 0.78), 0, 1)
    a = a * a * (3 - 2 * a)
    zone = np.clip((rows - Y_SOFT0) / (Y_SOFT1 - Y_SOFT0), 0, 1)
    haze = haze_band * np.clip((ratio - 0.55) / 0.35, 0, 1)
    return 1 - zone * (1 - a), haze


def sky_mask(line, matte):
    """1 in the sky, 0 on anything in front of it, feathered."""
    return np.clip((line[None, :] - rows) / 2.5 + 0.5, 0, 1) * cap * matte


# First pass: the skyline of every frame, and how far the distant hills move
# frame to frame (so the glow, and the smoothing below, can move with them).
band = slice(int(H * 0.22), int(H * 0.37))
win = cv2.createHanningWindow((W, band.stop - band.start), cv2.CV_32F)
offset = np.zeros(N, np.float32)
lines = np.zeros((N, W), np.float32)
prev = None
for i in range(N):
    L = luma(load(i))
    lines[i] = skyline(L)
    if prev is not None:
        (dx, _), _ = cv2.phaseCorrelate(prev, L[band], win)
        offset[i] = offset[i - 1] + dx
    prev = L[band]
print("hills moved", round(float(offset[-1]), 1), "px across the segment")

# Median over five frames, each shifted to line up with this one.
xs = np.arange(W, dtype=np.float32)
smoothed = np.zeros_like(lines)
for i in range(N):
    near = []
    for j in range(max(0, i - 2), min(N, i + 3)):
        near.append(np.interp(xs - (offset[i] - offset[j]), xs, lines[j]))
    smoothed[i] = np.median(np.array(near), axis=0)

indices = [0, 300, 600, 900, N - 1] if PREVIEW else range(N)

tiles = []
if not PREVIEW:
    os.makedirs(OUT, exist_ok=True)
for i in indices:
    img = load(i)
    L = luma(img)
    matte, haze = haze_matte(L)
    M = sky_mask(smoothed[i], matte)[..., None]

    # Brightness relative to the sky at the same height keeps the clouds' shape.
    sky_rows = np.where(M[..., 0] > 0.9, L, np.nan)
    with np.errstate(all="ignore"):
        ref = np.nanmedian(sky_rows, axis=1)
    ref = np.where(np.isfinite(ref), ref, np.nanmax(ref))
    ref = cv2.GaussianBlur(ref.astype(np.float32).reshape(-1, 1), (1, 0), 12).reshape(-1, 1)
    rel = np.clip(L / np.maximum(ref, 1e-3), 0.3, 1.8)[..., None]
    sunset = ramp * np.clip(0.2 + 0.85 * rel, 0.2, 1.4)

    # The glow: a broad warm wash and a brighter core, low on the horizon.
    sx = SUN_X0 + offset[i]
    d_core = ((cols - sx) / (W * 0.2)) ** 2 + ((rows - SUN_Y) / (H * 0.1)) ** 2
    d_wash = ((cols - sx) / (W * 0.55)) ** 2 + ((rows - SUN_Y) / (H * 0.3)) ** 2
    glow = (np.exp(-d_core) * 0.55 + np.exp(-d_wash) * 0.3)[..., None]
    gold = np.array([110, 190, 255], np.float32) / 255.0
    sunset = 1 - (1 - sunset) * (1 - gold * glow)  # screen

    out = img * (1 - M * 0.85) + sunset * (M * 0.85)
    out = out + (sunset - out) * (haze[..., None] * 0.24 * (1 - M))

    # The bay reflects the glow, strongest just below the horizon and under the sun.
    below = np.clip((rows - Y_HORIZON) / (H * 0.45), 0, 1)
    water = np.clip((L - 0.22) / 0.25, 0, 1)
    refl = (np.exp(-below * 2.6) * (0.35 + 0.65 * np.exp(-(((cols - sx) / (W * 0.16)) ** 2))) * water * (1 - M[..., 0]))[..., None]
    out = out + (gold * 0.9 - out) * refl * 0.45

    # A little warm light on the city's highlights; its shadows stay cool.
    hi = (np.clip((L - 0.45) / 0.35, 0, 1) * (1 - M[..., 0]) * (rows > Y_HORIZON))[..., None]
    out = out + (out * np.array([0.9, 1.0, 1.12], np.float32) - out) * hi * 0.5

    out = np.clip(out * 255, 0, 255).astype(np.uint8)
    if PREVIEW:
        vis = cv2.cvtColor((M[..., 0] * 255).astype(np.uint8), cv2.COLOR_GRAY2BGR)
        tiles.append(np.hstack([cv2.resize(out, (800, 450)), cv2.resize(vis, (800, 450))]))
    else:
        cv2.imwrite(os.path.join(OUT, files[i]), out, [cv2.IMWRITE_JPEG_QUALITY, 95])
        if i % 200 == 0:
            print("frame", i)

if PREVIEW:
    cv2.imwrite(OUT, np.vstack(tiles))
print("done")
