/**
 * Anchor points tracked through the hero footage (scripts/track-hero-video.py):
 * rooftops, streets and freeway lanes, a set of skyline nodes, and the hub on
 * the Salesforce Tower. Positions are normalised to the video frame and
 * indexed on the looped timeline, so the overlay stays on real places while
 * the drone moves.
 */

export interface TrackData {
  count: number;
  frames: number;
  fps: number;
  duration: number;
  /** 0: street or rooftop, 1: skyline node, 2: hub. */
  kind: Uint8Array;
  /** [point * frames + frame], normalised 0..1. */
  x: Float32Array;
  y: Float32Array;
  /** Visibility 0..1. */
  a: Float32Array;
}

export async function loadTrack(url: string): Promise<TrackData> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`track ${res.status}`);
  let buf = await res.arrayBuffer();
  const head = new Uint8Array(buf, 0, 2);
  if (head[0] === 0x1f && head[1] === 0x8b) {
    if (typeof DecompressionStream === 'undefined') throw new Error('DecompressionStream unavailable');
    buf = await new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
  }
  const dv = new DataView(buf);
  const magic = String.fromCharCode(dv.getUint8(0), dv.getUint8(1), dv.getUint8(2), dv.getUint8(3));
  if (magic !== 'SPT1') throw new Error('bad track data');
  const count = dv.getUint32(4, true);
  const frames = dv.getUint32(8, true);
  const fps = dv.getUint32(12, true);
  const duration = dv.getFloat32(16, true);
  let o = 20;
  const kind = new Uint8Array(buf.slice(o, o + count));
  o += count;
  const x = new Float32Array(count * frames);
  const y = new Float32Array(count * frames);
  const a = new Float32Array(count * frames);
  for (let i = 0; i < count; i++) {
    let px = 0;
    let py = 0;
    for (let j = 0; j < frames; j++) {
      px += dv.getInt16(o, true);
      py += dv.getInt16(o + 2, true);
      o += 4;
      x[i * frames + j] = px / 8000;
      y[i * frames + j] = py / 8000;
    }
    for (let j = 0; j < frames; j++) a[i * frames + j] = dv.getUint8(o + j) / 255;
    o += frames;
  }
  return { count, frames, fps, duration, kind, x, y, a };
}
