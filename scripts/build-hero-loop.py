#!/usr/bin/env python3
"""
Build the hero's seamless camera-pan loop from a segment of drone footage.

The segment plays forward and then back on a cosine time curve, so the camera
eases to a stop at each end and turns around smoothly, like an operator
panning across and back. Because the loop's first and last frames are the
same source frame and the motion is continuous, there is no crossfade and no
ghosting at the seam. Frames between source frames are blended.

Usage:
  ffmpeg -ss 38 -i master.mp4 -t 20.1 -vf scale=1600:900:flags=lanczos -q:v 2 seg/f%05d.jpg
  python3 build-hero-loop.py seg 59.94 56 out.mp4

Arguments: frame folder, source fps, loop length in seconds, output file.
The colour grade is applied in the ffmpeg encode (see GRADE below); CRF sets
the encode quality (default 25).

Set CROP=x,y,w,h (pixels of the 1600x900 frame) for a cropped cut, such as
the phone version, which keeps the same pan and grade and only shows the
part of the frame a phone can use:
  CROP=352,180,704,720 python3 build-hero-loop.py seg 59.94 56 phone.mp4
"""
import math
import os
import subprocess
import sys

import cv2
import numpy as np

SEG, SRC_FPS, LOOP_S, OUT = sys.argv[1], float(sys.argv[2]), float(sys.argv[3]), sys.argv[4]
OUT_FPS = 30
W, H = 1600, 900
CX, CY, CW, CH = (int(v) for v in os.environ.get("CROP", f"0,0,{W},{H}").split(","))

GRADE = os.environ.get(
    "GRADE",
    "eq=gamma=1.3:contrast=1.1:saturation=1.2:brightness=0.03,"
    "curves=b='0/0.04 0.5/0.55 1/1':r='0/0 0.5/0.47 1/0.97',vignette=PI/5.5",
)

files = sorted(f for f in os.listdir(SEG) if f.endswith(".jpg"))
N = len(files)
S = (N - 1) / SRC_FPS  # usable segment seconds
print("source frames", N, "segment", round(S, 2), "s")

cache: dict[int, np.ndarray] = {}


def frame(i: int) -> np.ndarray:
    i = max(0, min(N - 1, i))
    if i not in cache:
        if len(cache) > 12:
            cache.pop(next(iter(cache)))
        cache[i] = cv2.imread(os.path.join(SEG, files[i]), cv2.IMREAD_COLOR).astype(np.float32)
    return cache[i]


enc = subprocess.Popen(
    [
        "ffmpeg", "-v", "error", "-y",
        "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{CW}x{CH}", "-r", str(OUT_FPS), "-i", "-",
        "-vf", GRADE,
        "-c:v", "libx264", "-preset", "slow", "-crf", os.environ.get("CRF", "25"), "-pix_fmt", "yuv420p",
        "-movflags", "+faststart", "-an", OUT,
    ],
    stdin=subprocess.PIPE,
)

total = int(round(LOOP_S * OUT_FPS))
for k in range(total):
    t = k / OUT_FPS
    # Position along the segment: 0 -> S -> 0 with zero velocity at the ends.
    s = S * 0.5 * (1 - math.cos(2 * math.pi * t / LOOP_S))
    f = s * SRC_FPS
    i = int(math.floor(f))
    w = f - i
    img = frame(i) if w < 1e-3 else frame(i) * (1 - w) + frame(i + 1) * w
    img = img[CY:CY + CH, CX:CX + CW]
    enc.stdin.write(np.ascontiguousarray(np.clip(img, 0, 255).astype(np.uint8)).tobytes())

enc.stdin.close()
enc.wait()
print("wrote", OUT, total, "frames")
