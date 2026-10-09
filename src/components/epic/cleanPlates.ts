/**
 * Fog-free plates and their depth maps for the descent, one pair per film
 * frame (film/export_depth.py, render.py NOFOG=1). A pair is usable only when
 * both images of the same frame have arrived, so a new background is never
 * shown with another frame's depth. The frames around the one on screen are
 * fetched ahead; far ones are released.
 */
export interface PlatePair { index: number; plate: ImageBitmap; depth: ImageBitmap; depthUrl: string }

export class CleanPlates {
  private pairs = new Map<number, PlatePair>();
  private loading = new Set<number>();
  private missing = new Set<number>();

  constructor(private kind: string, private count: number) {}

  private url(index: number, depth: boolean) {
    return `/film/${this.kind}-clean/${String(index + 1).padStart(4, '0')}${depth ? '-depth.png' : '.webp'}`;
  }

  private load(index: number) {
    if (index < 0 || index >= this.count || this.pairs.has(index) || this.loading.has(index) || this.missing.has(index)) return;
    this.loading.add(index);
    const fetchBitmap = (url: string, raw: boolean) => fetch(url)
      .then((response) => (response.ok ? response.blob() : Promise.reject(new Error(String(response.status)))))
      .then((blob) => createImageBitmap(blob, raw ? { colorSpaceConversion: 'none', premultiplyAlpha: 'none' } : undefined));
    const depthUrl = this.url(index, true);
    Promise.all([fetchBitmap(this.url(index, false), false), fetchBitmap(depthUrl, true)])
      .then(([plate, depth]) => { this.pairs.set(index, { index, plate, depth, depthUrl }); })
      .catch(() => { this.missing.add(index); })
      .finally(() => { this.loading.delete(index); });
  }

  /** The pair for exactly this frame, or null; prefetches its neighbours. */
  get(index: number): PlatePair | null {
    for (let k = -2; k <= 4; k++) this.load(index + k);
    for (const [i, pair] of this.pairs) {
      if (Math.abs(i - index) > 8) { pair.plate.close(); pair.depth.close(); this.pairs.delete(i); }
    }
    return this.pairs.get(index) ?? null;
  }

  dispose() {
    for (const pair of this.pairs.values()) { pair.plate.close(); pair.depth.close(); }
    this.pairs.clear();
  }
}
