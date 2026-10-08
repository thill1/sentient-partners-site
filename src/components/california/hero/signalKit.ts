/**
 * Shared pieces for the hero's communications layer: easing, colour, the
 * message icons and the words that appear beside them.
 */

export const clamp = (n: number, a = 0, b = 1) => Math.min(b, Math.max(a, n));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smooth = (t: number) => {
  const c = clamp(t);
  return c * c * (3 - 2 * c);
};
export const easeOut = (t: number) => 1 - Math.pow(1 - clamp(t), 3);
/** Sine ease: a peak speed of about 1.6x the average, so nothing streaks. */
export const easeInOut = (t: number) => 0.5 - 0.5 * Math.cos(Math.PI * clamp(t));

export type RGB = [number, number, number];
export const AMBER: RGB = [255, 176, 92];
export const GREY: RGB = [138, 144, 160];
export const IVORY: RGB = [247, 239, 224];
export const ORANGE: RGB = [224, 82, 47];
/** Window light: a lamp left on. */
export const WARM: RGB = [255, 204, 138];
export const mix = (a: RGB, b: RGB, t: number): RGB => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
export const rgba = (c: RGB, a: number) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${clamp(a).toFixed(3)})`;

// Lucide icon paths (ISC licence), drawn on a 24-unit grid.
export const ICONS = {
  call: [
    'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z',
  ],
  email: ['M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z', 'm22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7'],
  text: ['M7.9 20A9 9 0 1 0 4 16.1L2 22Z'],
  check: ['M20 6 9 17l-5-5'],
};
export type IconName = keyof typeof ICONS;
export type MsgType = Exclude<IconName, 'check'>;
export const TYPES: MsgType[] = ['call', 'email', 'text'];

export const CHAOS_LABELS: Record<MsgType, string[]> = {
  call: ['Missed call', 'Left a voicemail', 'Called twice'],
  email: ['Quote request', 'Unread', 'No reply yet'],
  text: ['Still waiting', 'Are you open?', 'No reply yet'],
};
export const ORDER_LABELS: Record<MsgType, string[]> = {
  call: ['Answered', 'Booked for 8 AM', 'Routed to on-call', 'Callback booked', 'Answered after hours'],
  email: ['Quote sent', 'Replied in 2 min', 'Follow-up set', 'Invoice sent', 'Added to CRM'],
  text: ['Booked for 9:30', 'Replied', 'Appointment set', 'Confirmed', 'Directions sent'],
};
/** The visitor's own call, placed by clicking the city. */
export const YOUR_CALL = { ringing: 'Your call', unanswered: 'Your call, no answer yet', answered: 'Your call, answered' };

export const pick = <T,>(list: T[], r: number) => list[Math.min(list.length - 1, Math.floor(r * list.length))];

/** A soft round glow in one colour, drawn once and reused. */
export const glowSprite = (c: RGB) => {
  const s = document.createElement('canvas');
  s.width = s.height = 64;
  const g = s.getContext('2d')!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, rgba(c, 0.55));
  grad.addColorStop(0.45, rgba(c, 0.18));
  grad.addColorStop(1, rgba(c, 0));
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return s;
};
