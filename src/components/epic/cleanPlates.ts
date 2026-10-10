/**
 * Fog-free plates and their depth maps for the descent, one pair per film
 * frame (film/export_depth.py, render.py NOFOG=1). A pair is usable only when
 * both images of the same frame have arrived, so a new background is never
 * shown with another frame's depth. The frames around the one on screen are
 * fetched ahead; far ones are released.
 */
export interface PlatePair { index: number; plate: ImageBitmap; depth: HTMLImageElement; depthUrl: string }

export class CleanPlates {
  private pairs = new Map<number, PlatePair>();
  private loading = new Set<number>();
  private missing = new Set<number>();

  constructor(private kind: string, private count: number) {}

  // Phones get the 800-wide pair (~0.5 MB a frame instead of ~2 MB).
  private small = typeof window !== 'undefined' && Math.max(window.innerWidth, window.innerHeight) * (window.devicePixelRatio || 1) < 1100 * 2.2;

  private url(index: number, depth: boolean) {
    // The phone film is already phone-sized: full plate, half-size depth.
    if (this.kind === 'phone') return `/film/phone-clean/${depth ? 'm/' : ''}${String(index + 1).padStart(4, '0')}${depth ? '-depth.png' : '.webp'}`;
    return `/film/${this.kind}-clean/${this.small ? 'm/' : ''}${String(index + 1).padStart(4, '0')}${depth ? '-depth.png' : '.webp'}`;
  }

  private load(index: number) {
    if (index < 0 || index >= this.count || this.pairs.has(index) || this.loading.has(index) || this.missing.has(index)) return;
    this.loading.add(index);
    const fetchBitmap = (url: string) => fetch(url)
      .then((response) => (response.ok ? response.blob() : Promise.reject(new Error(String(response.status)))))
      .then((blob) => createImageBitmap(blob));
    // Depth stays an <img>: uploaded with UNPACK_COLORSPACE_CONVERSION none,
    // its 24-bit codes survive in every browser. WebKit colour-manages an
    // ImageBitmap regardless of its options, which scrambled the distances
    // (fog in the sky, none on the water, on iPhones).
    const fetchRaw = (url: string) => new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.decoding = 'async';
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('depth'));
      image.src = url;
    });
    const depthUrl = this.url(index, true);
    Promise.all([fetchBitmap(this.url(index, false)), fetchRaw(depthUrl)])
      .then(([plate, depth]) => { this.pairs.set(index, { index, plate, depth, depthUrl }); })
      .catch(() => { this.missing.add(index); })
      .finally(() => { this.loading.delete(index); });
  }

  /** The pair for exactly this frame, or null; prefetches its neighbours. */
  get(index: number): PlatePair | null {
    // The frame on screen first; neighbours only once it has arrived, so the
    // first fog appears as soon as one pair is in (not after five).
    this.load(index);
    // A small window: each full plate is ~8 MB decoded on a phone.
    const reach = this.kind === 'phone' ? 3 : 8;
    if (this.pairs.has(index)) for (const k of [1, -1, 2, -2, 3, -3, 4].filter((k) => Math.abs(k) <= reach)) this.load(index + k);
    for (const [i, pair] of this.pairs) {
      if (Math.abs(i - index) > reach) { pair.plate.close(); this.pairs.delete(i); }
    }
    return this.pairs.get(index) ?? null;
  }

  dispose() {
    for (const pair of this.pairs.values()) pair.plate.close();
    this.pairs.clear();
  }
}
