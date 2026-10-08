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
  [0.85, 0.55],
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

  constructor(kind: string, count: number) {
    this.kind = kind;
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
      image.src = frameUrl(this.kind, index);
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

  private cover(ctx: CanvasRenderingContext2D, image: HTMLImageElement, alpha: number, focus = 0.5) {
    const { width, height } = ctx.canvas;
    const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
    const w = image.naturalWidth * scale;
    const h = image.naturalHeight * scale;
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
    const n = this.nearest(Math.min(1, Math.max(0, t)) * (this.frames.length - 1));
    if (n < 0) return false;
    this.lastIndex = n;
    this.cover(ctx, this.frames[n] as HTMLImageElement, alpha, focusAt(t));
    return true;
  }

  /** True once every frame has arrived. */
  get complete() {
    return this.loaded === this.frames.length;
  }

  /**
   * Play the sequence as a loop at fps frames a second. The camera is still
   * in a loop, so the last frames can fade into the first without doubling.
   */
  drawLoop(ctx: CanvasRenderingContext2D, seconds: number, fps: number, alpha = 1, focus = 0.5) {
    const count = this.frames.length;
    const blend = Math.min(10, Math.floor(count / 4));
    const span = count - blend;
    const position = (seconds * fps) % span;
    const index = Math.floor(position) + blend;
    const near = this.nearest(index);
    if (near < 0) return false;
    this.cover(ctx, this.frames[near] as HTMLImageElement, alpha, focus);
    // Over the last `blend` frames, the opening frames fade back in.
    const into = index - span;
    if (into >= 0) {
      const head = this.nearest(into);
      if (head >= 0) this.cover(ctx, this.frames[head] as HTMLImageElement, alpha * ((into + 1) / (blend + 1)), focus);
    }
    return true;
  }
}
