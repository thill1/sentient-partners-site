import React, { useState } from 'react';

let cached: string | null = null;

/**
 * A soft, horizontally tileable fog texture: four octaves of periodic value
 * noise, thresholded into drifting banks. Built once per page load (about
 * 10 ms) and shared by every fog layer.
 */
function fogTexture(): string {
  if (cached) return cached;
  const W = 512;
  const H = 192;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  const img = ctx.createImageData(W, H);

  let seed = 1847;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const octaves = [
    { cx: 4, cy: 3, amp: 0.55 },
    { cx: 8, cy: 5, amp: 0.25 },
    { cx: 16, cy: 9, amp: 0.13 },
    { cx: 32, cy: 17, amp: 0.07 },
  ].map((o) => ({ ...o, grid: Array.from({ length: o.cx * (o.cy + 1) }, rand) }));
  const smooth = (t: number) => t * t * (3 - 2 * t);

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let n = 0;
      for (const o of octaves) {
        const fx = (x / W) * o.cx;
        const fy = (y / H) * o.cy;
        const ix = Math.floor(fx);
        const iy = Math.floor(fy);
        const tx = smooth(fx - ix);
        const ty = smooth(fy - iy);
        const x0 = ix % o.cx;
        const x1 = (ix + 1) % o.cx; // wraps horizontally, so the texture tiles
        const g = (gx: number, gy: number) => o.grid[gy * o.cx + gx];
        const top = g(x0, iy) + (g(x1, iy) - g(x0, iy)) * tx;
        const bottom = g(x0, iy + 1) + (g(x1, iy + 1) - g(x0, iy + 1)) * tx;
        n += (top + (bottom - top) * ty) * o.amp;
      }
      const a = Math.max(0, Math.min(1, (n - 0.4) / 0.38));
      const i = (y * W + x) * 4;
      img.data[i] = 236;
      img.data[i + 1] = 238;
      img.data[i + 2] = 244;
      img.data[i + 3] = Math.round(smooth(a) * 235);
    }
  }
  ctx.putImageData(img, 0, 0);
  cached = canvas.toDataURL('image/png');
  return cached;
}

interface FogProps {
  className?: string;
  opacity?: number;
  /** Seconds for one full drift cycle of the near layer. */
  duration?: number;
}

/**
 * Two banks of fog drifting at different speeds for depth. Each layer is a
 * 200%-wide strip translated by -50% on a loop, so the motion is a GPU
 * transform rather than a repaint. Still under reduced motion.
 */
export const Fog: React.FC<FogProps> = ({ className = '', opacity = 0.3, duration = 110 }) => {
  const [tex] = useState(() => (typeof document === 'undefined' ? '' : fogTexture()));
  if (!tex) return null;
  const layer = (o: number, d: number, flip: boolean) => (
    <div className="absolute inset-0" style={flip ? { transform: 'scaleY(-1)' } : undefined}>
      <div
        className="absolute inset-y-0 left-0 w-[200%] animate-ca-fog-loop motion-reduce:animate-none"
        style={{
          backgroundImage: `url(${tex})`,
          backgroundSize: '50% 100%',
          backgroundRepeat: 'repeat-x',
          opacity: o,
          animationDuration: `${d}s`,
          mixBlendMode: 'screen',
        }}
      />
    </div>
  );
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-x-0 overflow-hidden ${className}`}
      style={{
        maskImage: 'linear-gradient(to bottom, transparent, black 30%, black 70%, transparent)',
        WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 30%, black 70%, transparent)',
      }}
    >
      {layer(opacity, duration, false)}
      {layer(opacity * 0.6, duration * 1.7, true)}
    </div>
  );
};
