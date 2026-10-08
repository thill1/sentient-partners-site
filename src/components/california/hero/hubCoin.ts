import { IVORY, ORANGE, clamp, rgba } from './signalKit';

/**
 * The Sentient hub: a coin with the SP mark, turned by `spin` (radians) about
 * its vertical axis. The face narrows to an ellipse, the rim shows as it turns
 * edge-on, and a sheen slides across the face.
 */
export function drawCoin(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  spin: number,
  alpha: number,
  mark: HTMLImageElement | null,
) {
  const c = Math.cos(spin);
  const sn = Math.sin(spin);
  const w = Math.max(0.6, r * Math.abs(c));
  const thick = r * 0.18;
  // The face turned toward the viewer sits in front of the rim.
  const off = ((c >= 0 ? 1 : -1) * sn * thick) / 2;
  const TAU = Math.PI * 2;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgb(128,42,22)';
  ctx.beginPath();
  ctx.ellipse(x - off, y, w, r, 0, 0, TAU);
  ctx.fill();
  ctx.fillRect(x - Math.abs(off), y - r, Math.abs(off) * 2, r * 2);
  const fx = x + off;
  ctx.beginPath();
  ctx.ellipse(fx, y, w, r, 0, 0, TAU);
  const shine = 0.5 - 0.42 * sn;
  const face = ctx.createLinearGradient(fx - w, y - r, fx + w, y + r);
  face.addColorStop(0, 'rgb(10,18,40)');
  face.addColorStop(clamp(shine - 0.24), 'rgb(14,23,48)');
  face.addColorStop(clamp(shine), 'rgb(46,58,92)');
  face.addColorStop(clamp(shine + 0.24), 'rgb(14,23,48)');
  face.addColorStop(1, 'rgb(6,12,28)');
  ctx.fillStyle = face;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = rgba(ORANGE, 1);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(fx, y, w * 0.82, r * 0.82, 0, 0, TAU);
  ctx.lineWidth = 0.8;
  ctx.strokeStyle = rgba(IVORY, 0.26);
  ctx.stroke();
  if (Math.abs(c) > 0.06) {
    ctx.translate(fx, y);
    ctx.scale(Math.abs(c), 1);
    if (mark?.complete && mark.naturalWidth) {
      const mh = r * 1.12;
      const mw = (mh * mark.naturalWidth) / mark.naturalHeight;
      ctx.drawImage(mark, -mw / 2, -mh / 2, mw, mh);
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, 3, 0, TAU);
      ctx.fillStyle = rgba(ORANGE, 1);
      ctx.fill();
    }
  }
  ctx.restore();
}
