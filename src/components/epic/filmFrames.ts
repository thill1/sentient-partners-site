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

export class FramePlayer {
  readonly frames: (HTMLImageElement | null)[];
  private ready: boolean[];
  private kind: string;
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

  /** Draw the film at position t (0..1), blending the two nearest frames. */
  draw(ctx: CanvasRenderingContext2D, t: number) {
    const { width, height } = ctx.canvas;
    const position = Math.min(1, Math.max(0, t)) * (this.frames.length - 1);
    const lo = Math.floor(position);
    const hi = Math.min(this.frames.length - 1, lo + 1);
    const mix = position - lo;
    const cover = (image: HTMLImageElement, alpha: number) => {
      const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
      const w = image.naturalWidth * scale;
      const h = image.naturalHeight * scale;
      ctx.globalAlpha = alpha;
      ctx.drawImage(image, (width - w) / 2, (height - h) / 2, w, h);
    };
    if (this.ready[lo] && this.ready[hi]) {
      cover(this.frames[lo] as HTMLImageElement, 1);
      if (mix > 0.001) cover(this.frames[hi] as HTMLImageElement, mix);
    } else {
      const n = this.nearest(position);
      if (n < 0) return false;
      cover(this.frames[n] as HTMLImageElement, 1);
    }
    ctx.globalAlpha = 1;
    return true;
  }
}
