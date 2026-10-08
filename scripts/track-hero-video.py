#!/usr/bin/env python3
"""
Track anchor points through the hero loop so the communications overlay sits
on real rooftops, streets, piers and the bridge deck while the camera pans.

Points are found at several moments across the loop (so a panning shot stays
covered end to end), tracked forward and backward with pyramidal Lucas-Kanade
optical flow, and kept only where a forward/backward check agrees. Rooftop
corners against the sky become routing nodes.

Output: a gzipped binary (magic SPT1) read by
src/components/california/hero/trackData.ts.

Usage: python3 track-hero-video.py loop.mp4 out.bin
"""
import gzip
import struct
import sys

import cv2
import numpy as np

SRC, OUT = sys.argv[1], sys.argv[2]
W, H = 1600, 900
EXPORT_FPS = 8

cap = cv2.VideoCapture(SRC)
FPS = cap.get(cv2.CAP_PROP_FPS)
frames = []
while True:
    ok, fr = cap.read()
    if not ok:
        break
    frames.append(cv2.cvtColor(cv2.resize(fr, (W, H), interpolation=cv2.INTER_AREA), cv2.COLOR_BGR2GRAY))
N = len(frames)
D = N / FPS
print("frames", N, "duration", round(D, 2))

lk = dict(winSize=(25, 25), maxLevel=4, criteria=(cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 30, 0.01))


def track_from(k, pts):
    P = len(pts)
    pos = np.full((N, P, 2), np.nan, np.float32)
    ok = np.zeros((N, P), bool)
    if P == 0:
        return pos, ok
    pos[k] = pts
    ok[k] = True
    for direction in (1, -1):
        cur = pts.reshape(-1, 1, 2).astype(np.float32)
        alive = np.ones(P, bool)
        f = k
        while 0 <= f + direction < N and alive.any():
            nf = f + direction
            nxt, st, _ = cv2.calcOpticalFlowPyrLK(frames[f], frames[nf], cur, None, **lk)
            back, st2, _ = cv2.calcOpticalFlowPyrLK(frames[nf], frames[f], nxt, None, **lk)
            fb = np.linalg.norm((back - cur).reshape(-1, 2), axis=1)
            inside = (nxt[:, 0, 0] > 2) & (nxt[:, 0, 0] < W - 2) & (nxt[:, 0, 1] > 2) & (nxt[:, 0, 1] < H - 2)
            alive &= (st.ravel() == 1) & (st2.ravel() == 1) & (fb < 0.7) & inside
            pos[nf] = nxt.reshape(-1, 2)
            ok[nf] = alive
            cur = nxt
            f = nf
    return pos, ok


def detect(k, mask, n, quality, dist):
    p = cv2.goodFeaturesToTrack(frames[k], maxCorners=n, qualityLevel=quality, minDistance=dist, mask=mask)
    return p.reshape(-1, 2) if p is not None else np.zeros((0, 2), np.float32)


def roofline(k, x, y):
    """A corner with sky above it and building below."""
    img = frames[k].astype(np.float32)
    x, y = int(x), int(y)
    if y < 14 or y > H - 14:
        return False
    above = img[y - 14:y - 6, max(0, x - 3):x + 4].mean()
    below = img[y + 6:y + 14, max(0, x - 3):x + 4].mean()
    if below >= above - 10:
        return False
    # A tower, not a hill: the dark structure continues well below the corner,
    # instead of giving way to bright water after a short ridge.
    if y + 90 > H:
        return False
    column = img[y + 6:y + 90, max(0, x - 3):x + 4].mean(axis=1)
    if (column < above - 8).mean() <= 0.85:
        return False
    # A building's top corner has sky beside it; a ridge line does not.
    if x < 24 or x > W - 24:
        return False
    left = img[y + 8:y + 16, x - 22:x - 14].mean()
    right = img[y + 8:y + 16, x + 14:x + 22].mean()
    return bool(max(left, right) > above - 12)


city = np.zeros((H, W), np.uint8)
city[int(H * 0.3):, :] = 255
sky_edge = np.zeros((H, W), np.uint8)
sky_edge[int(H * 0.08):int(H * 0.45), :] = 255

emit_pos, emit_ok, node_pos, node_ok = [], [], [], []
keys = np.linspace(1.5, D - 1.5, 8)
for t in keys:
    k = min(N - 1, int(t * FPS))
    pos, ok = track_from(k, detect(k, city, 700, 0.01, 18))
    emit_pos.append(pos)
    emit_ok.append(ok)
    cand = [p for p in detect(k, sky_edge, 80, 0.02, 40) if roofline(k, p[0], p[1])]
    pos, ok = track_from(k, np.array(cand, np.float32).reshape(-1, 2))
    node_pos.append(pos)
    node_ok.append(ok)

emit_pos = np.concatenate(emit_pos, axis=1)
emit_ok = np.concatenate(emit_ok, axis=1)
node_pos = np.concatenate(node_pos, axis=1)
node_ok = np.concatenate(node_ok, axis=1)
print("tracked emitters", emit_pos.shape[1], "nodes", node_pos.shape[1])


def select(pos, ok, cols, rows, min_vis):
    """Best-covered point per grid cell, at several moments, so coverage is even through the pan."""
    vis = ok.mean(axis=0)
    chosen = set()
    for t in np.linspace(0, D, 12, endpoint=False):
        f = min(N - 1, int(t * FPS))
        cells = {}
        for i in np.where(ok[f])[0]:
            if vis[i] < min_vis:
                continue
            key = (int(pos[f, i, 0] / W * cols), int(pos[f, i, 1] / H * rows))
            if key not in cells or vis[i] > vis[cells[key]]:
                cells[key] = i
        chosen.update(cells.values())
    return sorted(chosen)


emitters = select(emit_pos, emit_ok, 22, 12, 0.18)
nodes = select(node_pos, node_ok, 10, 3, 0.22)
print("selected emitters", len(emitters), "nodes", len(nodes))

T = int(D * EXPORT_FPS)
buf = bytearray(b"SPT1")
buf += struct.pack("<3If", len(nodes) + len(emitters), T, EXPORT_FPS, D)
buf += bytes([1] * len(nodes) + [0] * len(emitters))


def write(pos, ok, i):
    global buf
    px = py = 0
    xs, ys, al = [], [], []
    for j in range(T):
        f = min(N - 1, int(round(j / EXPORT_FPS * FPS)))
        x, y = pos[f, i]
        if not ok[f, i] or np.isnan(x):
            x, y = (xs[-1] / 8000 * W, ys[-1] / 8000 * H) if xs else (0.0, 0.0)
        xs.append(int(round(x / W * 8000)))
        ys.append(int(round(y / H * 8000)))
        al.append(255 if ok[f, i] else 0)
    for x, y in zip(xs, ys):
        buf += struct.pack("<hh", x - px, y - py)
        px, py = x, y
    buf += bytes(al)


for i in nodes:
    write(node_pos, node_ok, i)
for i in emitters:
    write(emit_pos, emit_ok, i)

open(OUT, "wb").write(gzip.compress(bytes(buf), 9))
print("wrote", OUT, "points", len(nodes) + len(emitters), "frames", T, "raw bytes", len(buf))
