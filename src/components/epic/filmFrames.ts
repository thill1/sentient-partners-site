/**
 * The descent as rendered frames (film/descent.blend, rendered by
 * film/render.py), one sequence per time of day. A sequence listed here is
 * played by scroll position; a time of day without one falls back to the
 * live film. Frames load coarse-to-fine so the film can be scrubbed early.
 */
export const FILM_SEQUENCES: Partial<Record<'sunset' | 'day' | 'night', number>> = {
  sunset: 120,
  day: 120,
  night: 120,
};

/** Phones get 768-wide frames; everything else 1280-wide. */
const small = () => typeof window !== 'undefined' && Math.max(window.innerWidth, window.innerHeight) * (window.devicePixelRatio || 1) < 1100;
export const frameUrl = (kind: string, index: number) =>
  `/film/${kind}/${small() ? 'm/' : ''}${String(index + 1).padStart(4, '0')}.webp`;

/**
 * Where the subject sits across the frame (0 left, 1 right) through the
 * descent, so a tall phone crop keeps the bridge, then the city, in view.
 */
const FOCUS: [number, number][] = [
  [0, 0.3],
  [0.25, 0.5],
  [0.42, 0.6],
  [0.6, 0.5],
  [0.85, 0.7],
  [1, 0.68],
];
export function focusAt(t: number) {
  for (let i = 1; i < FOCUS.length; i++) {
    const [t1, f1] = FOCUS[i];
    const [t0, f0] = FOCUS[i - 1];
    if (t <= t1) {
      const u = (t - t0) / (t1 - t0);
      return f0 + (f1 - f0) * u * u * (3 - 2 * u);
    }
  }
  return FOCUS[FOCUS.length - 1][1];
}

export class FramePlayer {
  readonly frames: (HTMLImageElement | null)[];
  private ready: boolean[];
  private kind: string;
  /** Where and which frame was last drawn, for anything drawn in the same space. */
  lastRect = { x: 0, y: 0, w: 0, h: 0 };
  lastIndex = 0;
  /** False once the first frame has failed to load: there is no sequence to play. */
  available = true;
  // Frames decoded off the main thread around the one on screen. Drawing a
  // merely loaded image made the browser decode 1600x900 pixels inside the
  // animation frame, freezing the page (and the aircraft) for up to 300 ms
  // whenever scrolling reached a new frame. Only decoded frames are drawn.
  private decoded = new Map<number, ImageBitmap>();
  private decoding = new Set<number>();
  private static readonly AHEAD = 5;
  private static readonly BEHIND = 3;
  // Recently requested positions. A loop's cross-fade draws its last frames
  // and its first frames together; both windows must stay decoded, or each
  // fade frame decodes two full images in the animation frame (the regular
  // ~70 ms hitches, every loop, that made the aircraft stop and start).
  private centers: number[] = [];

  /** A seamless loop has its cross-fade baked in (film/seamless_loop.py). */
  private seamless: boolean;

  /** A film framed for its screen (the phone film) is centred, not panned. */
  private fixedFocus?: number;

  constructor(kind: string, count: number, source?: (index: number) => string, seamless = false, fixedFocus?: number) {
    this.kind = kind;
    this.fixedFocus = fixedFocus;
    this.seamless = seamless;
    this.frames = new Array(count).fill(null);
    this.ready = new Array(count).fill(false);
    // Every 16th frame first, then every 8th, 4th, 2nd, and the rest.
    const order: number[] = [];
    for (const stride of [16, 8, 4, 2, 1]) {
      for (let i = 0; i < count; i += stride) if (!order.includes(i)) order.push(i);
    }
    let next = 0;
    const loadOne = () => {
      if (next >= order.length) return;
      const index = order[next++];
      const image = new Image();
      image.decoding = 'async';
      image.onload = () => {
        this.frames[index] = image;
        this.ready[index] = true;
        loadOne();
      };
      image.onerror = () => {
        if (index === 0) this.available = false;
        else loadOne();
      };
      image.src = source ? source(index) : frameUrl(this.kind, index);
    };
    // A few requests in flight at once.
    for (let k = 0; k < 4; k++) loadOne();
  }

  get count() {
    return this.frames.length;
  }

  get loaded() {
    return this.ready.filter(Boolean).length;
  }

  /** Decode the frames around `center` in the background; release far ones. */
  private warm(center: number, wrap = false) {
    const count = this.frames.length;
    const distance = (a: number, b: number) => {
      const d = Math.abs(a - b);
      return wrap ? Math.min(d, count - d) : d;
    };
    for (let k = -FramePlayer.BEHIND; k <= FramePlayer.AHEAD; k++) {
      let index = center + k;
      if (wrap) index = ((index % count) + count) % count;
      if (index < 0 || index >= count || !this.ready[index] || this.decoded.has(index) || this.decoding.has(index)) continue;
      const image = this.frames[index];
      if (!image || typeof createImageBitmap !== 'function') continue;
      this.decoding.add(index);
      createImageBitmap(image)
        .then((bitmap) => { this.decoding.delete(index); this.decoded.set(index, bitmap); })
        .catch(() => { this.decoding.delete(index); });
    }
    if (!this.centers.includes(center)) this.centers.push(center);
    for (const [index, bitmap] of this.decoded) {
      if (this.centers.every((c) => distance(index, c) > FramePlayer.AHEAD + 4)) { bitmap.close(); this.decoded.delete(index); }
    }
  }

  /** The decoded frame nearest `index` (falls back to the loaded image only before any decode). */
  private drawable(index: number, wrap = false, warm = true): [ImageBitmap | HTMLImageElement, number] | null {
    if (index < 0) return null;
    if (warm) this.warm(index, wrap);
    const count = this.frames.length;
    for (let d = 0; d <= FramePlayer.AHEAD + 4; d++) {
      for (const candidate of d ? [index - d, index + d] : [index]) {
        const i = wrap ? ((candidate % count) + count) % count : candidate;
        const bitmap = this.decoded.get(i);
        if (bitmap) return [bitmap, i];
      }
    }
    const image = this.frames[index];
    return this.decoded.size === 0 && image ? [image, index] : null;
  }

  private blendStart(into: number, blend: number) {
    return Math.max(0, Math.min(blend - 1, into));
  }

  /** The nearest loaded frame at or around a fractional index. */
  private nearest(index: number) {
    for (let d = 0; d < this.frames.length; d++) {
      const a = Math.round(index) - d;
      const b = Math.round(index) + d;
      if (a >= 0 && this.ready[a]) return a;
      if (b < this.frames.length && this.ready[b]) return b;
    }
    return -1;
  }

  private cover(ctx: CanvasRenderingContext2D, image: ImageBitmap | HTMLImageElement, alpha: number, focus = 0.5) {
    const { width, height } = ctx.canvas;
    const iw = image instanceof HTMLImageElement ? image.naturalWidth : image.width;
    const ih = image instanceof HTMLImageElement ? image.naturalHeight : image.height;
    const scale = Math.max(width / iw, height / ih);
    const w = iw * scale;
    const h = ih * scale;
    ctx.globalAlpha = alpha;
    this.lastRect = { x: (width - w) * focus, y: (height - h) / 2, w, h };
    ctx.drawImage(image, this.lastRect.x, this.lastRect.y, w, h);
    ctx.globalAlpha = 1;
  }

  /**
   * Draw the film at position t (0..1). Always one whole frame: the camera
   * moves between frames, so blending two of them would show double images.
   */
  draw(ctx: CanvasRenderingContext2D, t: number, alpha = 1) {
    this.centers = [];
    const pick = this.drawable(this.nearest(Math.min(1, Math.max(0, t)) * (this.frames.length - 1)));
    if (!pick) return false;
    this.lastIndex = pick[1];
    this.cover(ctx, pick[0], alpha, this.fixedFocus ?? focusAt(t));
    return true;
  }

  /** True once every frame has arrived. */
  get complete() {
    return this.loaded === this.frames.length;
  }

  /** Identify the exact loaded images/crop a draw would use. */
  paintKey(t: number) {
    const pick = this.drawable(this.nearest(Math.min(1, Math.max(0, t)) * (this.frames.length - 1)), false, false);
    return `${pick ? pick[1] : -1}:${pick && pick[0] instanceof HTMLImageElement ? 'i' : 'b'}:${this.fixedFocus ?? focusAt(t)}`;
  }

  loopPaintKey(seconds: number, fps: number) {
    const blend = this.seamless ? 0 : Math.min(10, Math.floor(this.frames.length / 4));
    const span = this.frames.length - blend;
    const index = Math.floor((seconds * fps) % span) + blend;
    const into = index - span;
    const pick = this.drawable(this.nearest(index), true, false);
    const head = into >= 0 ? this.drawable(this.nearest(into), true, false) : null;
    return `${index}:${pick ? pick[1] : -1}:${head ? head[1] : -1}`;
  }

  /**
   * Play the sequence as a loop at fps frames a second. The camera is still
   * in a loop, so the last frames can fade into the first without doubling.
   */
  drawLoop(ctx: CanvasRenderingContext2D, seconds: number, fps: number, alpha = 1, focus = 0.5) {
    const count = this.frames.length;
    const blend = this.seamless ? 0 : Math.min(10, Math.floor(count / 4));
    const span = count - blend;
    const position = (seconds * fps) % span;
    const index = Math.floor(position) + blend;
    this.centers = [];
    // Keep the cross-fade's first frames decoded before the fade begins.
    const into = index - span;
    if (blend && index >= span - FramePlayer.AHEAD) this.warm(this.blendStart(into, blend), true);
    const near = this.drawable(this.nearest(index), true);
    if (!near) return false;
    this.cover(ctx, near[0], alpha, focus);
    // Over the last `blend` frames, the opening frames fade back in.
    if (blend && into >= 0) {
      const head = this.drawable(this.nearest(into), true);
      if (head) this.cover(ctx, head[0], alpha * ((into + 1) / (blend + 1)), focus);
    }
    return true;
  }
}
