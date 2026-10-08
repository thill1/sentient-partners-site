/**
 * The communications layer over the hero footage.
 *
 * Calls, emails and texts rise from real rooftops, piers and the bridge deck
 * (points tracked through the footage, so they stay put as the camera moves).
 * Everything is scaled by how far away its building is, so the layer sits in
 * the scene's depth rather than on top of it.
 *
 * - Without a system: the visitor lands on a city already full of unanswered
 *   messages. They rise, drift, pile up, retry, and go grey.
 * - Coming online: when Sentient takes over, the coin flips into view and one
 *   soft pulse spreads out from it across the city. Each waiting message is
 *   caught as the pulse reaches it, so they are gathered in a cascade, and the
 *   network's lines grow outward with it.
 * - With Sentient: each message is routed through a skyline node to the hub,
 *   circles the ring around the coin while it is processed (ivory turning to
 *   orange), and leaves as the answer, which returns to the sender and is
 *   confirmed long enough to read. The sender's building then keeps a warm
 *   light on, so the city slowly lights up with the work that has been done.
 *   Without a system again, those lights go out.
 * - The visitor can place a call of their own by clicking the city.
 *
 * The pace is deliberately unhurried, and every change is eased over at least
 * a few hundred milliseconds. Nothing blinks or flashes.
 */
import { drawCoin } from './hubCoin';
import {
  AMBER,
  CHAOS_LABELS,
  GREY,
  ICONS,
  IVORY,
  ORANGE,
  ORDER_LABELS,
  TYPES,
  WARM,
  YOUR_CALL,
  clamp,
  easeInOut,
  easeOut,
  glowSprite,
  lerp,
  mix,
  pick,
  rgba,
  smooth,
  type IconName,
  type MsgType,
  type RGB,
} from './signalKit';
import type { TrackData } from './trackData';

export interface SignalLayer {
  setTarget(order: 0 | 1, immediate?: boolean): void;
  setPaused(paused: boolean): void;
  /** Place a call from the building nearest a point on the canvas. False if none is close enough. */
  send(x: number, y: number): boolean;
  resize(): void;
  destroy(): void;
}

interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface Point {
  x: number;
  y: number;
  a: number;
}

interface Options {
  canvas: HTMLCanvasElement;
  track: TrackData;
  /** Presented video time in seconds, or null to hold the poster frame. */
  getVideoTime: () => number | null;
  /** Where the full video frame sits inside the canvas's parent, in CSS pixels. */
  getVideoRect: () => Rect;
  /** Area (canvas-relative) to keep clear: the headline and CTAs. */
  getQuietRect: () => Rect | null;
  reducedMotion: boolean;
  compact: boolean;
  /** The Sentient monogram, drawn at the hub. */
  hubMark?: string;
  onFrame?: (order: number) => void;
  /** Messages answered, or left unanswered, since the scene last changed mode. */
  onTally?: (tally: Tally) => void;
}

export interface Tally {
  mode: 'chaos' | 'order';
  count: number;
}

type Phase = 'rise' | 'drift' | 'route' | 'process' | 'reply' | 'settle';

interface Msg {
  type: MsgType;
  src: number;
  node: number;
  phase: Phase;
  t0: number; // phase start (layer time)
  /** Depth scale of the sender: nearer buildings carry larger chips. */
  k: number;
  ox: number; // drift offset, px
  oy: number;
  sx: number; // offset frozen at route start
  sy: number;
  seed: number;
  lost: number; // 0..1 greyed
  dur: number; // route duration
  /** Where the message joins the ring around the hub, and where it leaves (angles on the ring). */
  ea: number;
  xa: number;
  label: string | null;
  labelAt: number;
  retried: boolean;
  chaos: boolean; // spawned while there was no system
  /** Placed by the visitor. */
  mine: boolean;
  /** A label keeps its slot from the moment it appears until it has faded out. */
  labelSlot: boolean;
  /** When the label took its slot, and where it was drawn last. */
  shownAt: number;
  lx: number;
  ly: number;
  oldLabel: string | null;
}

/** A lamp left on in a building whose message was answered. */
interface Light {
  src: number;
  t0: number;
  /** When it starts going out. */
  off: number;
  seed: number;
  mine: boolean;
}

export function createSignalLayer(opts: Options): SignalLayer {
  const { canvas, track, getVideoTime, getVideoRect, getQuietRect, reducedMotion, compact, onFrame, onTally } = opts;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('2d context unavailable');
  const ctx: CanvasRenderingContext2D = context;
  const TAU = Math.PI * 2;

  let seed = 1234567;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };

  const paths: Record<IconName, Path2D[]> = {
    call: ICONS.call.map((d) => new Path2D(d)),
    email: ICONS.email.map((d) => new Path2D(d)),
    text: ICONS.text.map((d) => new Path2D(d)),
    check: ICONS.check.map((d) => new Path2D(d)),
  };
  const glow = { amber: glowSprite(AMBER), ivory: glowSprite(IVORY), orange: glowSprite(ORANGE), warm: glowSprite(WARM) };

  let mark: HTMLImageElement | null = null;
  if (opts.hubMark) {
    mark = new Image();
    mark.decoding = 'async';
    mark.src = opts.hubMark;
  }

  const NODES: number[] = [];
  const EMITTERS: number[] = [];
  track.kind.forEach((k, i) => {
    if (k === 1) NODES.push(i);
    else if (k === 0) EMITTERS.push(i);
  });
  // On phones the headline covers the lower city, so the towers' rooftops send too.
  if (compact) EMITTERS.push(...NODES);

  const R = compact ? 10 : 12; // chip radius at depth scale 1, px
  const ICON = compact ? 11 : 13; // icon size, px
  const LIFT = 16; // how far a message sits above its building, px
  const MAX = compact ? 26 : 48;
  const RATE = compact ? 2 : 2.8; // new messages per second
  const RISE = 0.8; // s
  const WAIT = 10.5; // how long an unanswered message hangs in the air
  const PROCESS = 1.3; // time on the ring around the hub
  const REPLY = 1.7;
  const SETTLE = 2.8; // the confirmation holds long enough to read
  const LABEL_CAP = compact ? 3 : 6;
  const BACKLOG = compact ? 6 : 14; // unanswered messages already waiting when the scene opens
  const WAVE_DELAY = 0.35; // the coin arrives first, then the pulse leaves it
  const WAVE_T = 2.4;
  const LIGHT_MAX = compact ? 40 : 110;
  const LIGHT_LIFE = 48; // s

  let W = 1;
  let H = 1;
  let dpr = 1;
  let rect: Rect = { left: 0, top: 0, width: 1, height: 1 };
  let quiet: Rect | null = null;

  let order = 0;
  let target: 0 | 1 = 0;
  let now = 0;
  let spawnAcc = 0;
  let hubPulse = 0;
  /** The coin's turn (radians), the flip it arrives with, and how busy the hub is (0..1, eased). */
  let spin = 0.55;
  let kick = 0;
  let busy = 0;
  /** The pulse that spreads from the hub as the system comes online. */
  let wave: { t0: number; rmax: number; net0: number } | null = null;
  let paused = false;
  let visible = true;
  let raf = 0;
  let last = 0;
  let vt = 0;
  let vtSynced = false;
  /** When the scene first had footage to sit on; it fades in from here. */
  let sceneT0 = -1;
  let lastSend = -1;
  const msgs: Msg[] = [];
  const lights: Light[] = [];
  let labelsShown = 0;
  let tally = 0;
  let tallySent = -1;

  // ---------------------------------------------------------------- track

  const frameOf = (t: number) => {
    const f = (((t % track.duration) + track.duration) % track.duration) * track.fps;
    const j = Math.floor(f) % track.frames;
    return { j, j2: (j + 1) % track.frames, k: f - Math.floor(f) };
  };
  const cr = (p0: number, p1: number, p2: number, p3: number, t: number) =>
    0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t);
  const locate = (i: number, t: number, out: Point) => {
    const { j, j2, k } = frameOf(t);
    const F = track.frames;
    const j0 = (j - 1 + F) % F;
    const j3 = (j2 + 1) % F;
    const b = i * F;
    const X = track.x;
    const Y = track.y;
    const A = track.a;
    let u: number;
    let v: number;
    if (A[b + j] <= 0 || A[b + j2] <= 0) {
      // Coming into view or leaving it: fade in place, at the one position that is real.
      const q = A[b + j] > 0 ? j : j2;
      u = X[b + q];
      v = Y[b + q];
    } else {
      // Only real samples shape the curve; where a neighbour wasn't tracked, the curve ends flat.
      const a0 = A[b + j0] > 0 ? j0 : j;
      const a3 = A[b + j3] > 0 ? j3 : j2;
      u = cr(X[b + a0], X[b + j], X[b + j2], X[b + a3], k);
      v = cr(Y[b + a0], Y[b + j], Y[b + j2], Y[b + a3], k);
    }
    out.x = rect.left + u * rect.width;
    out.y = rect.top + v * rect.height;
    out.a = lerp(A[b + j], A[b + j2], k);
    return out;
  };
  // Positions at the current video time are worked out once per frame and shared.
  const cache: Point[] = Array.from({ length: track.count }, () => ({ x: 0, y: 0, a: 0 }));
  const stamp = new Int32Array(track.count).fill(-1);
  let frameId = 0;
  /**
   * Screen position (canvas CSS px) and visibility of a tracked point. With no
   * time given, the result is this frame's shared copy: read it, don't keep it.
   */
  const at = (i: number, t?: number): Point => {
    if (t !== undefined) return locate(i, t, { x: 0, y: 0, a: 0 });
    if (stamp[i] !== frameId) {
      locate(i, vt, cache[i]);
      stamp[i] = frameId;
    }
    return cache[i];
  };
  /** Nearer buildings (lower in the frame) carry larger chips; far rooftops, smaller. */
  const depth = (y: number) => {
    const v = (y - rect.top) / rect.height;
    return compact ? lerp(0.88, 1.04, smooth((v - 0.36) / 0.4)) : lerp(0.72, 1.14, smooth((v - 0.36) / 0.5));
  };

  /**
   * The Sentient hub holds still in the sky while the camera moves: the system
   * isn't a building. On wide screens it sits right of the headline, under the
   * scene controls; on phones, in the band between the controls and the headline.
   */
  const hubPos = () => {
    if (compact) {
      const top = 200;
      const bottom = quiet ? quiet.top - 28 : H * 0.42;
      return { x: W * 0.72, y: Math.max(top + 24, lerp(top, bottom, 0.4)) };
    }
    // Open sky, clear of the headline and of the scene controls at top right.
    const left = quiet ? quiet.left + quiet.width + 60 : W * 0.5;
    return { x: lerp(left, W - 48, 0.3), y: clamp(H * 0.25, 190, H * 0.4) };
  };
  /** The coin, and the ring messages circle while they are processed. */
  const HUB_R = compact ? 26 : 36;
  const RING = { rx: HUB_R * 2.15, ry: HUB_R * 0.58, tilt: -0.18 };
  /** A point on the ring. The half below the hub (sin > 0) passes in front of the coin. */
  const ringPoint = (phi: number) => {
    const hub = hubPos();
    const ex = Math.cos(phi) * RING.rx;
    const ey = Math.sin(phi) * RING.ry;
    const ct = Math.cos(RING.tilt);
    const st = Math.sin(RING.tilt);
    return { x: hub.x + ex * ct - ey * st, y: hub.y + ex * st + ey * ct, front: Math.sin(phi) > 0 };
  };
  /** The ring angle that faces a point. */
  const ringAngle = (x: number, y: number) => {
    const hub = hubPos();
    const dx = x - hub.x;
    const dy = y - hub.y;
    const ct = Math.cos(-RING.tilt);
    const st = Math.sin(-RING.tilt);
    return Math.atan2((dx * st + dy * ct) / RING.ry, (dx * ct - dy * st) / RING.rx);
  };
  const inQuiet = (x: number, y: number, pad = 24) =>
    !!quiet && x > quiet.left - pad && x < quiet.left + quiet.width + pad && y > quiet.top - pad && y < quiet.top + quiet.height + pad;
  /** On wide screens the headline column stays clean: the scene plays out to its right. */
  const rightOfCopy = (x: number, pad = 36) => compact || !quiet || x > quiet.left + quiet.width + pad;
  /** Fades anything that drifts toward the headline column as the camera pans. */
  const clearOfCopy = (x: number) => (compact || !quiet ? 1 : smooth((x - (quiet.left + quiet.width + 20)) / 60));
  // Keep clear of the header (and, on phones, the scene controls under it) and
  // of the concierge launcher at the bottom.
  const onScreen = (x: number, y: number, pad = compact ? 24 : 44) =>
    x > pad && x < W - pad && y > (compact ? 200 : 90) && y < H - (compact ? 90 : 100);

  // ---------------------------------------------------------------- the pulse

  const waveP = () => (wave ? clamp((now - wave.t0 - WAVE_DELAY) / WAVE_T) : 1);
  const waveR = () => (wave ? wave.rmax * easeInOut(waveP()) : Infinity);
  /** Has the system reached this point yet? */
  const caught = (x: number, y: number) => {
    if (target !== 1) return false;
    if (!wave) return true;
    const hub = hubPos();
    return Math.hypot(x - hub.x, y - hub.y) <= waveR();
  };
  const startWave = () => {
    const hub = hubPos();
    const rmax = Math.max(Math.hypot(hub.x, hub.y), Math.hypot(W - hub.x, hub.y), Math.hypot(hub.x, H - hub.y), Math.hypot(W - hub.x, H - hub.y)) + 40;
    wave = { t0: now, rmax, net0: smooth(order) };
    kick = 1;
  };

  // ---------------------------------------------------------------- geometry

  /** Quadratic curve from a to b, lifted into an arc. */
  const arcPoint = (a: { x: number; y: number }, b: { x: number; y: number }, t: number, lift = 0.35) => {
    const d = Math.hypot(b.x - a.x, b.y - a.y);
    const cx = (a.x + b.x) / 2;
    const cy = Math.min(a.y, b.y) - Math.max(24, d * lift);
    const u = 1 - t;
    return { x: u * u * a.x + 2 * u * t * cx + t * t * b.x, y: u * u * a.y + 2 * u * t * cy + t * t * b.y };
  };
  const startOf = (m: Msg) => {
    const p = at(m.src);
    return { x: p.x + m.sx, y: p.y + m.sy - LIFT * m.k };
  };
  /** Position along the two-leg route: start, then the node, then onto the hub's ring. */
  const routePoint = (m: Msg, t: number) => {
    const s = startOf(m);
    const end = ringPoint(m.ea);
    if (m.node < 0) return arcPoint(s, end, t, 0.3);
    const n = at(m.node);
    const l1 = Math.hypot(n.x - s.x, n.y - s.y) || 1;
    const l2 = Math.hypot(end.x - n.x, end.y - n.y) || 1;
    const split = l1 / (l1 + l2);
    return t < split ? arcPoint(s, n, t / split, 0.28) : arcPoint(n, end, (t - split) / (1 - split), 0.18);
  };
  /** Around the ring, then out on the side facing the sender: at least three quarters of a turn. */
  const exitAngle = (m: Msg) => {
    const src = at(m.src);
    const a0 = ringAngle(src.x, src.y - LIFT * m.k);
    const min = m.ea + Math.PI * 1.5;
    return a0 + TAU * Math.ceil((min - a0) / TAU);
  };

  const nodeUsable = (p: Point) => p.a >= 0.9 && rightOfCopy(p.x, 20) && !inQuiet(p.x, p.y, 20);
  const nearestNode = (x: number, y: number) => {
    let best = -1;
    let bestD = compact ? 240 : 420; // farther than this, go straight to the hub
    for (const n of NODES) {
      const p = at(n);
      if (!nodeUsable(p)) continue;
      const d = Math.hypot(p.x - x, p.y - y);
      if (d < 12) continue; // a rooftop sender routes through a neighbour
      if (d < bestD) {
        bestD = d;
        best = n;
      }
    }
    return best;
  };

  // ---------------------------------------------------------------- lifecycle

  /** A building that will stay in view, clear of the page's own content, for a whole exchange. */
  const usableSender = (c: number) => {
    const p = at(c);
    const mid = at(c, vt + 3);
    const ahead = at(c, vt + 6);
    if (p.a < 0.99 || mid.a < 0.99 || ahead.a < 0.99) return false;
    if (!onScreen(p.x, p.y) || !onScreen(mid.x, mid.y, 16) || inQuiet(p.x, p.y - LIFT, compact ? 4 : 40)) return false;
    return rightOfCopy(Math.min(p.x, mid.x, ahead.x));
  };
  const randomSender = () => {
    for (let tries = 0; tries < (compact ? 30 : 20); tries++) {
      const c = EMITTERS[Math.floor(rand() * EMITTERS.length)];
      if (usableSender(c)) return c;
    }
    return -1;
  };

  const spawn = (src = -1, type?: MsgType, dx = 0, dy = 0, mine = false): Msg | null => {
    const s = src >= 0 ? src : randomSender();
    if (s < 0) return null;
    const ty: MsgType = type ?? pick(TYPES, rand());
    const chaos = target !== 1;
    // Most answers are confirmed in words; fewer of the unanswered are.
    const withLabel = mine || rand() < (chaos ? 0.2 : 0.65);
    const m: Msg = {
      type: ty,
      src: s,
      node: -1,
      phase: 'rise',
      t0: now,
      k: depth(at(s).y) * (mine ? 1.2 : 1),
      ox: dx,
      oy: dy,
      sx: 0,
      sy: 0,
      seed: rand() * 100,
      lost: 0,
      dur: 1.6,
      ea: 0,
      xa: 0,
      label: mine
        ? chaos
          ? YOUR_CALL.unanswered
          : YOUR_CALL.ringing
        : withLabel
          ? pick((chaos ? CHAOS_LABELS : ORDER_LABELS)[ty], rand())
          : null,
      labelAt: mine ? now + 0.2 : chaos ? now + 0.8 : Infinity,
      retried: mine,
      chaos,
      mine,
      labelSlot: false,
      shownAt: 0,
      lx: 0,
      ly: 0,
      oldLabel: null,
    };
    msgs.push(m);
    return m;
  };

  /** The scene opens on a backlog: messages that have already been waiting a while. */
  const seedBacklog = () => {
    for (let n = 0; n < BACKLOG; n++) {
      const m = spawn();
      if (!m) continue;
      const waited = rand() * 2.6;
      m.phase = 'drift';
      m.t0 = now - waited;
      m.oy = -LIFT * m.k - 3.5 * waited;
      m.ox = (rand() - 0.5) * 8 * waited;
      if (m.label) m.labelAt = now + 0.3 + rand() * 1.6;
    }
  };

  const beginRoute = (m: Msg) => {
    // Start exactly where the message is drawn now (see draw()).
    const rise = m.phase === 'rise' ? LIFT * m.k * easeOut((now - m.t0) / RISE) : 0;
    m.sx = m.ox;
    m.sy = m.oy - rise;
    const start = startOf(m);
    m.node = nearestNode(start.x, start.y);
    const hub = hubPos();
    // Join the ring on the side the message arrives from: the last leg arcs in from above.
    const from = m.node >= 0 ? at(m.node) : start;
    const lift = Math.max(24, Math.hypot(hub.x - from.x, hub.y - from.y) * (m.node >= 0 ? 0.18 : 0.3));
    m.ea = ringAngle((from.x + hub.x) / 2, Math.min(from.y, hub.y) - lift);
    const dist = Math.hypot(hub.x - start.x, hub.y - start.y);
    m.dur = clamp(dist / 220 + 0.9, 1.8, 4.2);
    m.phase = 'route';
    m.t0 = now;
    // Whatever was written beside it fades where it was; the answer is confirmed when it lands.
    m.oldLabel = m.labelSlot ? m.label : null;
    if (!m.oldLabel) m.labelSlot = false;
    if (m.mine) m.label = YOUR_CALL.answered;
    else if (m.chaos) m.label = rand() < 0.65 ? pick(ORDER_LABELS[m.type], rand()) : null;
    m.labelAt = Infinity;
    m.chaos = false;
  };

  /** The answered building keeps a light on. */
  const lightUp = (m: Msg) => {
    const lit = lights.find((l) => l.src === m.src);
    if (lit) {
      lit.off = Infinity;
      lit.mine ||= m.mine;
      return;
    }
    lights.push({ src: m.src, t0: now, off: Infinity, seed: m.seed, mine: m.mine });
    const burning = lights.filter((l) => l.off === Infinity);
    if (burning.length > LIGHT_MAX) burning[0].off = now;
  };

  function update(dt: number) {
    now += dt;
    const step = dt / (target === 1 ? 2.6 : 2.0);
    order = target === 1 ? Math.min(1, order + step) : Math.max(0, order - step);
    hubPulse = Math.max(0, hubPulse - dt * 1.2);
    if (wave && now - wave.t0 > WAVE_DELAY + WAVE_T + 0.3) wave = null;
    // The coin arrives with a flip that settles, then turns steadily, faster while the ring is busy.
    kick *= Math.exp(-dt * 1.3);
    const load = msgs.reduce((n, m) => n + (m.phase === 'process' ? 1 : 0), 0);
    busy += (Math.min(1, load / 4) - busy) * Math.min(1, dt * 1.5);
    spin = (spin + TAU * (0.2 + 0.5 * busy + 1.1 * kick * kick) * dt) % TAU;

    if (vtSynced && sceneT0 < 0) {
      sceneT0 = now;
      if (target === 0) seedBacklog();
    }
    spawnAcc = vtSynced ? spawnAcc + dt * RATE : 0;
    while (spawnAcc >= 1) {
      spawnAcc -= 1;
      if (msgs.length < MAX) spawn();
    }

    for (let i = lights.length - 1; i >= 0; i--) {
      const l = lights[i];
      if (l.off === Infinity && now - l.t0 > LIGHT_LIFE) l.off = now;
      if (now - l.off > 2.6 || at(l.src).a < 0.05) lights.splice(i, 1);
    }

    for (let i = msgs.length - 1; i >= 0; i--) {
      const m = msgs[i];
      const age = now - m.t0;
      const src = at(m.src);
      // The sender left the frame before anyone answered: let the message go quietly.
      if (src.a < 0.2 && (m.phase === 'rise' || m.phase === 'drift')) {
        msgs.splice(i, 1);
        continue;
      }
      switch (m.phase) {
        case 'rise':
          if (age > RISE) {
            if (caught(src.x + m.ox, src.y + m.oy)) beginRoute(m);
            else {
              m.phase = 'drift';
              m.t0 = now;
              m.oy -= LIFT * m.k;
            }
          }
          break;
        case 'drift': {
          // Slow, wandering drift upward. They gather; nobody collects them.
          const sd = m.seed;
          m.ox += (Math.sin(now * 0.5 + sd) * 5 + Math.sin(now * 0.17 + sd * 3) * 3.5) * dt;
          m.oy += (-3.5 + Math.cos(now * 0.4 + sd * 2) * 3) * dt;
          if (age > 3) m.lost = Math.min(1, m.lost + dt / 1.6);
          if (!m.retried && age > 2 && rand() < 0.25) {
            m.retried = true;
            if (msgs.length < MAX) spawn(m.src, m.type, m.ox + (rand() - 0.5) * 28, m.oy + 6);
          }
          if (caught(src.x + m.ox, src.y + m.oy)) beginRoute(m);
          else if (age > WAIT) {
            tally++;
            msgs.splice(i, 1);
          }
          break;
        }
        case 'route':
          if (age >= m.dur) {
            m.phase = 'process';
            m.t0 = now;
            m.xa = exitAngle(m);
          }
          break;
        case 'process':
          if (age >= PROCESS) {
            hubPulse = Math.min(1, hubPulse + 0.2);
            m.phase = 'reply';
            m.t0 = now;
          }
          break;
        case 'reply':
          if (age >= REPLY) {
            m.phase = 'settle';
            m.t0 = now;
            if (m.label) m.labelAt = now + 0.15;
            if (target === 1) {
              tally++;
              lightUp(m);
            }
          }
          break;
        case 'settle':
          if (age >= SETTLE + (m.mine ? 1.6 : 0)) msgs.splice(i, 1);
          break;
      }
    }
  }

  // ---------------------------------------------------------------- draw

  const drawIcon = (name: IconName, x: number, y: number, size: number, color: RGB, alpha: number) => {
    const s = size / 24;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.translate(-12, -12);
    ctx.lineWidth = 1.7 / s;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = rgba(color, alpha);
    for (const p of paths[name]) ctx.stroke(p);
    ctx.restore();
  };

  const drawChip = (name: IconName, x: number, y: number, color: RGB, alpha: number, ring: RGB = color, scale = 1) => {
    if (alpha <= 0.01) return;
    const r = R * scale;
    const g = color === IVORY || color[0] > 240 ? glow.ivory : glow.amber;
    ctx.globalAlpha = alpha * 0.9;
    ctx.drawImage(g, x - r * 2.4, y - r * 2.4, r * 4.8, r * 4.8);
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fillStyle = `rgba(6,12,28,${(0.78 * alpha).toFixed(3)})`;
    ctx.fill();
    ctx.lineWidth = 1.3;
    ctx.strokeStyle = rgba(ring, 0.85 * alpha);
    ctx.stroke();
    drawIcon(name, x, y, ICON * scale, color, alpha);
  };

  const drawLabel = (text: string, x: number, y: number, color: RGB, alpha: number, gap = R) => {
    if (alpha <= 0.01) return;
    ctx.font = `500 ${compact ? 11 : 12}px Inter, system-ui, sans-serif`;
    const w = ctx.measureText(text).width + 16;
    const h = compact ? 20 : 22;
    let lx = x + gap + 6;
    if (lx + w > W - 12 || (compact && lx + w > W * 0.96)) lx = x - gap - 6 - w;
    const ly = y - h / 2;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = 'rgba(6,12,28,0.82)';
    ctx.beginPath();
    ctx.roundRect(lx, ly, w, h, h / 2);
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = rgba(color, 0.55);
    ctx.stroke();
    ctx.fillStyle = rgba(color, 0.95);
    ctx.textBaseline = 'middle';
    ctx.fillText(text, lx + 8, ly + h / 2 + 0.5);
    ctx.globalAlpha = 1;
  };

  /** Lamps left on in answered buildings: a few lit windows and their glow, locked to the footage. */
  const drawLights = () => {
    if (!lights.length) return;
    ctx.globalCompositeOperation = 'lighter';
    for (const l of lights) {
      const p = at(l.src);
      const b = smooth((now - l.t0) / 0.9) * (1 - smooth((now - l.off) / 2.5)) * clamp(p.a * 1.2) * clearOfCopy(p.x);
      if (b <= 0.01) continue;
      const k = depth(p.y) * (l.mine ? 1.25 : 1);
      const g = 17 * k;
      ctx.globalAlpha = b * (l.mine ? 0.9 : 0.7);
      ctx.drawImage(glow.warm, p.x - g, p.y - g, g * 2, g * 2);
      ctx.globalAlpha = 1;
      ctx.fillStyle = rgba(WARM, 0.9 * b);
      const w = 1.9 * k;
      const h = 2.6 * k;
      // A handful of windows, placed from the lamp's own seed so each building differs.
      for (let j = 0; j < 5; j++) {
        const ax = Math.sin(l.seed * (j + 1.3)) * 5.5 * k;
        const ay = Math.cos(l.seed * (j + 2.1)) * 4.5 * k;
        ctx.fillRect(p.x + ax - w / 2, p.y + ay - h / 2, w, h);
      }
    }
    ctx.globalCompositeOperation = 'source-over';
  };

  /** The pulse: one soft band of light leaving the hub, fading as it spreads. */
  const drawWave = () => {
    if (!wave) return;
    const p = waveP();
    if (p <= 0 || p >= 1) return;
    const hub = hubPos();
    const r = waveR();
    const a = Math.pow(1 - p, 1.3) * smooth(p / 0.08);
    const band = lerp(46, 110, p);
    const g = ctx.createRadialGradient(hub.x, hub.y, Math.max(0, r - band), hub.x, hub.y, r + 8);
    g.addColorStop(0, rgba(ORANGE, 0));
    g.addColorStop(0.72, rgba(ORANGE, 0.12 * a));
    g.addColorStop(0.93, rgba(IVORY, 0.28 * a));
    g.addColorStop(1, rgba(IVORY, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // A fine leading edge, so the eye can follow it across the city.
    ctx.beginPath();
    ctx.arc(hub.x, hub.y, r, 0, TAU);
    ctx.lineWidth = 1;
    ctx.strokeStyle = rgba(IVORY, 0.3 * a);
    ctx.stroke();
  };

  const drawNetwork = (o: number) => {
    const hub = hubPos();
    // Spokes from the hub to each skyline node grow outward with the pulse.
    // If the network was still fading out when the system came back, that remainder
    // fades under the new lines rather than vanishing.
    const hold = target === 1 ? 1 : o;
    const residue = wave ? wave.net0 * (1 - smooth(waveP() * 3)) : 0;
    const spoke = (p: Point, reach: number, alpha: number) => {
      if (reach <= 0.01 || alpha <= 0.004) return;
      ctx.strokeStyle = rgba(IVORY, alpha);
      ctx.beginPath();
      const steps = 24;
      for (let k = 0; k <= steps * reach; k++) {
        const q = arcPoint(hub, p, k / steps, 0.18);
        if (k === 0) ctx.moveTo(q.x, q.y);
        else ctx.lineTo(q.x, q.y);
      }
      ctx.stroke();
    };
    ctx.lineWidth = 1;
    for (const n of NODES) {
      const p = at(n);
      const w = p.a * clearOfCopy(p.x);
      if (w < 0.02) continue;
      const d = Math.hypot(p.x - hub.x, p.y - hub.y) || 1;
      spoke(p, 1, 0.2 * w * residue);
      spoke(p, wave ? clamp(waveR() / d) : 1, 0.2 * w * hold * (1 - residue));
      // The node lights as the pulse arrives.
      const na = (wave ? Math.max(residue, smooth((waveR() - d) / 70)) : 1) * w * hold;
      if (na > 0.01) {
        ctx.fillStyle = rgba(IVORY, 0.75 * na);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.1, 0, TAU);
        ctx.fill();
      }
    }
    // The hub: a coin with the SP mark, turning in the sky. Messages are processed
    // on the ring around it, whose far half passes behind the coin.
    const ha = smooth(clamp((o - 0.02) / 0.3));
    if (ha > 0.01) {
      const g = HUB_R * (2.4 + hubPulse * 0.6 + busy * 0.4);
      ctx.globalAlpha = ha * (0.45 + hubPulse * 0.3 + busy * 0.2);
      ctx.drawImage(glow.orange, hub.x - g, hub.y - g, g * 2, g * 2);
      ctx.globalAlpha = 1;
      drawRing(false, ha);
    }
    for (const m of msgs) if (m.phase === 'process') drawProcessing(m, false);
    if (ha > 0.01) {
      // It lands a little small and grows into place as the flip settles.
      const arrive = wave ? lerp(lerp(0.72, 1, wave.net0), 1, easeOut((now - wave.t0) / 0.9)) : 1;
      drawCoin(ctx, hub.x, hub.y, HUB_R * arrive, spin, ha, mark);
      drawRing(true, ha);
      ctx.font = `500 ${compact ? 10 : 11}px "JetBrains Mono", ui-monospace, monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      // A soft shadow keeps the name legible against the brightest part of the sunset.
      ctx.shadowColor = 'rgba(6,12,28,0.85)';
      ctx.shadowBlur = 8;
      ctx.fillStyle = rgba(IVORY, 0.9 * ha);
      ctx.fillText('SENTIENT PARTNERS', hub.x, hub.y + HUB_R + 16);
      ctx.shadowBlur = 0;
      ctx.shadowColor = 'transparent';
      ctx.textAlign = 'left';
    }
  };

  /** Half of the ring (the near half passes in front of the coin), lit a little more while busy. */
  function drawRing(front: boolean, ha: number) {
    const hub = hubPos();
    ctx.beginPath();
    ctx.ellipse(hub.x, hub.y, RING.rx, RING.ry, RING.tilt, front ? 0 : Math.PI, front ? Math.PI : TAU);
    ctx.lineWidth = 1;
    ctx.strokeStyle = rgba(IVORY, (0.14 + busy * 0.16) * ha * (front ? 1 : 0.6));
    ctx.stroke();
  }

  /**
   * A message on the ring: its chip shrinks away as it joins, and it circles the
   * coin while it is processed, its trail turning from ivory to orange. Drawn in
   * two passes so it disappears behind the coin on the far side.
   */
  function drawProcessing(m: Msg, front: boolean) {
    const age = now - m.t0;
    const k = easeInOut(age / PROCESS);
    const p = ringPoint(lerp(m.ea, m.xa, k));
    if (p.front !== front) return;
    const done = smooth(age / PROCESS);
    const colr = mix(IVORY, ORANGE, done);
    // If the sender has left the frame meanwhile, the answer has nowhere to land: let it fade here.
    const home = lerp(1, clamp(at(m.src).a * 1.2), done);
    const a = lerp(0.3, 1, smooth(age / 0.25)) * home;
    for (let j = 6; j >= 1; j--) {
      const q0 = ringPoint(lerp(m.ea, m.xa, Math.max(0, k - j * 0.035)));
      const q1 = ringPoint(lerp(m.ea, m.xa, Math.max(0, k - (j - 1) * 0.035)));
      ctx.strokeStyle = rgba(colr, 0.45 * (1 - j / 7) * a);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(q0.x, q0.y);
      ctx.lineTo(q1.x, q1.y);
      ctx.stroke();
    }
    const joining = 1 - smooth(age / 0.3);
    if (joining > 0.01) drawChip(m.type, p.x, p.y, IVORY, 0.3 * joining, IVORY, m.k * lerp(0.3, 0.5, joining));
    ctx.globalAlpha = a * (0.4 + 0.4 * done);
    ctx.drawImage(done > 0.5 ? glow.orange : glow.ivory, p.x - 12, p.y - 12, 24, 24);
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2.4, 0, TAU);
    ctx.fillStyle = rgba(IVORY, 0.95 * a);
    ctx.fill();
    note(m, p.x, p.y, a);
  }

  const dbg = { skip: '', jumps: 0, pops: 0, samples: 0, last: new WeakMap<Msg, { x: number; y: number; a: number; ph: string }>(), log: [] as string[] };
  const note = (m: Msg, x: number, y: number, a: number) => {
    if (!import.meta.env.DEV) return;
    const prev = dbg.last.get(m);
    dbg.samples++;
    if (prev) {
      const d = Math.hypot(x - prev.x, y - prev.y);
      if (d > 30) {
        dbg.jumps++;
        if (dbg.log.length < 12) dbg.log.push(`jump ${prev.ph}->${m.phase} ${d.toFixed(0)}px`);
      }
      if (prev.a - a > 0.35) {
        dbg.pops++;
        if (dbg.log.length < 12) dbg.log.push(`pop ${prev.ph}->${m.phase} ${prev.a.toFixed(2)}->${a.toFixed(2)}`);
      }
    }
    dbg.last.set(m, { x, y, a, ph: m.phase });
  };

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const o = smooth(order);
    drawLights();
    drawWave();
    if (dbg.skip !== 'network') drawNetwork(o);
    if (dbg.skip === 'msgs') return;
    const hub = hubPos();
    // The whole scene fades in once, when the footage is first there to sit on.
    const opening = sceneT0 < 0 ? 0 : smooth((now - sceneT0) / 1.2);
    labelsShown = msgs.reduce((n, m) => n + (m.labelSlot ? 1 : 0), 0);
    /**
     * A label takes a slot when one is free and nothing else is written nearby,
     * and only early enough to be read in full. It keeps the slot until it fades.
     * The visitor's own call is always labelled.
     */
    const wantsLabel = (m: Msg, x: number, y: number, window: number) => {
      if (!m.label || now < m.labelAt) return false;
      if (!m.labelSlot) {
        if (!m.mine) {
          if (labelsShown >= LABEL_CAP || now - m.labelAt > window) return false;
          if (Math.abs(x - hub.x) < RING.rx + 110 && Math.abs(y - hub.y) < HUB_R + 44) return false;
          for (const other of msgs) {
            if (other !== m && (other.labelSlot || other.oldLabel) && Math.abs(other.lx - x) < 190 && Math.abs(other.ly - y) < 34) return false;
          }
        }
        m.labelSlot = true;
        m.shownAt = now;
        labelsShown++;
      }
      m.lx = x;
      m.ly = y;
      return true;
    };

    for (const m of msgs) {
      const src = at(m.src);
      const age = now - m.t0;
      const vis = clamp(src.a * 1.2);
      const lift = LIFT * m.k;
      const r = R * m.k;
      if (m.phase === 'rise' || m.phase === 'drift') {
        const rise = m.phase === 'rise' ? lift * easeOut(age / RISE) : 0;
        const x = src.x + m.ox;
        const y = src.y + m.oy - rise - lift;
        const appear = m.phase === 'rise' ? easeOut(age / 0.5) : 1;
        const fade = m.phase === 'drift' ? 1 - smooth((age - (WAIT - 1.5)) / 1.5) : 1;
        const colr = mix(AMBER, GREY, m.lost);
        const a = appear * fade * vis * opening;
        // A thin stem back to the sender.
        ctx.strokeStyle = rgba(colr, 0.25 * a);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(src.x, src.y);
        ctx.lineTo(x, y + r);
        ctx.stroke();
        ctx.fillStyle = rgba(colr, 0.8 * a);
        ctx.fillRect(src.x - 1.5, src.y - 1.5, 3, 3);
        // Calls ring: two soft waves, continuous rather than blinking.
        if (m.type === 'call' && m.lost < 0.6) {
          for (const off of [0, 0.5]) {
            const w = ((now * 0.5 + off + m.seed) % 1 + 1) % 1;
            ctx.strokeStyle = rgba(colr, 0.35 * (1 - w) * a);
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.arc(x, y, r + 3 + w * 9 * m.k, -Math.PI * 0.35, Math.PI * 0.05);
            ctx.stroke();
          }
        }
        note(m, x, y, a);
        drawChip(m.type, x, y, colr, a, m.mine ? mix(ORANGE, GREY, m.lost * 0.6) : colr, m.k * lerp(0.8, 1, appear));
        if (wantsLabel(m, x, y, 0.6)) {
          const shown = now - m.shownAt;
          const hold = m.mine ? 6 : 2.6;
          const la = smooth(shown / 0.4) * (1 - smooth((shown - hold) / 0.5)) * a;
          if (shown > hold + 0.5) {
            m.labelSlot = false;
            m.label = null;
          } else if (la > 0.01) drawLabel(m.label!, x, y, colr, la, r);
        }
      } else if (m.phase === 'route') {
        const t = easeInOut(age / m.dur);
        // A comet trail sampled back along the same path.
        for (let k = 8; k >= 1; k--) {
          const tt = Math.max(0, t - k * 0.018);
          const p0 = routePoint(m, tt);
          const p1 = routePoint(m, Math.max(0, t - (k - 1) * 0.018));
          ctx.strokeStyle = rgba(IVORY, 0.5 * (1 - k / 9));
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y);
          ctx.lineTo(p1.x, p1.y);
          ctx.stroke();
        }
        const p = routePoint(m, t);
        const colr = mix(mix(AMBER, GREY, m.lost), IVORY, smooth(age / 0.4));
        if (m.oldLabel) {
          // What was written beside it fades where it was as the message is picked up.
          const s0 = startOf(m);
          const oa = 1 - smooth(age / 0.5);
          if (oa > 0.01) drawLabel(m.oldLabel, s0.x, s0.y, mix(AMBER, GREY, m.lost), oa, r);
          else {
            m.oldLabel = null;
            m.labelSlot = false;
          }
        }
        // It arrives small and dim, and becomes a point of light on the ring.
        // (Early enough that a whole backlog arriving together doesn't crowd the coin.)
        const into = 1 - 0.7 * smooth((t - 0.5) / 0.5);
        note(m, p.x, p.y, into);
        drawChip(m.type, p.x, p.y, colr, into, m.mine ? ORANGE : colr, m.k * lerp(1, 0.5, smooth(t)));
      } else if (m.phase === 'process') {
        drawProcessing(m, true);
      } else if (m.phase === 'reply') {
        // The answer leaves the ring as a spark; the confirmation opens where it lands.
        const t = easeInOut(age / REPLY);
        const dst = { x: src.x, y: src.y - lift };
        const exit = ringPoint(m.xa);
        const p = arcPoint(exit, dst, t, 0.22);
        const a = vis * (1 - smooth((t - 0.9) / 0.1) * 0.5);
        for (let k = 7; k >= 1; k--) {
          const p0 = arcPoint(exit, dst, Math.max(0, t - k * 0.028), 0.22);
          const p1 = arcPoint(exit, dst, Math.max(0, t - (k - 1) * 0.028), 0.22);
          ctx.strokeStyle = rgba(ORANGE, 0.55 * (1 - k / 8) * a);
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y);
          ctx.lineTo(p1.x, p1.y);
          ctx.stroke();
        }
        note(m, p.x, p.y, a);
        ctx.globalAlpha = a * 0.8;
        ctx.drawImage(glow.orange, p.x - 12, p.y - 12, 24, 24);
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.4, 0, TAU);
        ctx.fillStyle = rgba(IVORY, 0.95 * a);
        ctx.fill();
      } else if (m.phase === 'settle') {
        // Answered: the confirmation holds on the sender, a ring settles once, then it all fades.
        const total = SETTLE + (m.mine ? 1.6 : 0);
        const a = (1 - smooth((age - (total - 0.7)) / 0.7)) * vis;
        const y = src.y - lift;
        const ring = easeOut(age / 1.2);
        ctx.beginPath();
        ctx.arc(src.x, y, r * (0.85 + ring * 0.7), 0, TAU);
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = rgba(IVORY, 0.6 * (1 - ring) * a);
        ctx.stroke();
        const grow = easeOut(age / 0.4);
        // The spark that carried the answer dissolves into it.
        const spark = 0.5 * vis * (1 - smooth(age / 0.35));
        if (spark > 0.01) {
          ctx.globalAlpha = spark * 0.8;
          ctx.drawImage(glow.orange, src.x - 12, y - 12, 24, 24);
          ctx.globalAlpha = 1;
        }
        note(m, src.x, y, Math.max(spark, a * grow));
        drawChip('check', src.x, y, IVORY, a * grow, ORANGE, m.k * lerp(0.5, 0.9, grow));
        if (wantsLabel(m, src.x, y, 0.5)) {
          const la = smooth((now - m.shownAt) / 0.35) * a;
          if (la > 0.01) drawLabel(m.label!, src.x, y, IVORY, la, r);
        }
        ctx.fillStyle = rgba(IVORY, 0.8 * a);
        ctx.fillRect(src.x - 1.5, src.y - 1.5, 3, 3);
      }
    }
  }

  // ---------------------------------------------------------------- loop

  function readVideoTime(dt = 0) {
    frameId++;
    const t = getVideoTime();
    if (t === null) {
      vtSynced = false;
      return;
    }
    if (!vtSynced) {
      vt = t;
      vtSynced = true;
      return;
    }
    // The video presents frames at 30 fps; the display runs faster. Advance
    // smoothly, then ease toward the presented time so the two never drift.
    const D = track.duration;
    let err = t - vt;
    if (err > D / 2) err -= D;
    if (err < -D / 2) err += D;
    if (Math.abs(err) > 0.4) vt = t;
    else vt = (((vt + dt + err * Math.min(1, dt * 6)) % D) + D) % D;
  }

  function frame(ts: number) {
    raf = 0;
    const dt = Math.min(1 / 20, last ? (ts - last) / 1000 : 1 / 60);
    last = ts;
    readVideoTime(paused ? 0 : dt);
    update(dt);
    draw();
    onFrame?.(smooth(order));
    if (tally !== tallySent) {
      tallySent = tally;
      onTally?.({ mode: target === 1 ? 'order' : 'chaos', count: tally });
    }
    schedule();
  }
  function schedule() {
    if (!raf && !paused && visible && !reducedMotion && !document.hidden) raf = requestAnimationFrame(frame);
    else if (!raf) last = 0;
  }

  /** A composed still for reduced motion: the network holding, messages on their way, lights on. */
  function still() {
    order = 1;
    wave = null;
    kick = 0;
    readVideoTime();
    sceneT0 = now - 10;
    msgs.length = 0;
    lights.length = 0;
    for (let k = 0; k < (compact ? 10 : 26); k++) {
      const s = randomSender();
      if (s >= 0 && !lights.some((l) => l.src === s)) lights.push({ src: s, t0: now - 10, off: Infinity, seed: rand() * 100, mine: false });
    }
    for (let k = 0; k < (compact ? 7 : 14); k++) spawn();
    msgs.forEach((m, i) => {
      beginRoute(m);
      m.t0 = now - m.dur * (0.2 + (i % 5) * 0.14);
      if (i % 3 === 0) {
        m.phase = 'settle';
        m.t0 = now - 0.8;
        m.label = ORDER_LABELS[m.type][i % ORDER_LABELS[m.type].length];
        m.labelAt = now;
      } else if (i % 5 === 1) {
        // A few on the ring, part way through being processed.
        m.phase = 'process';
        m.t0 = now - PROCESS * (0.35 + (i % 3) * 0.2);
        m.xa = exitAngle(m);
      }
    });
    // Place the labels, then show them fully faded in.
    draw();
    msgs.forEach((m) => (m.shownAt = now - 1));
    draw();
    onFrame?.(1);
  }

  function resize() {
    const parent = canvas.parentElement ?? canvas;
    W = Math.max(1, parent.clientWidth);
    H = Math.max(1, parent.clientHeight);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    rect = getVideoRect();
    quiet = getQuietRect();
    frameId++;
    if (reducedMotion) still();
    else if (paused) draw();
  }

  const ro = new ResizeObserver(resize);
  ro.observe(canvas.parentElement ?? canvas);
  const io = new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    schedule();
  });
  io.observe(canvas);
  const onVis = () => schedule();
  document.addEventListener('visibilitychange', onVis);

  if (import.meta.env.DEV) {
    (window as unknown as Record<string, unknown>).__signals = {
      count: () => msgs.length,
      phases: () => msgs.reduce<Record<string, number>>((acc, m) => ((acc[m.phase] = (acc[m.phase] || 0) + 1), acc), {}),
      lights: () => lights.filter((l) => l.off === Infinity).length,
      mine: () => msgs.filter((m) => m.mine).map((m) => m.phase),
      emitters: () => EMITTERS.filter((i) => at(i).a > 0.99).length,
      usable: () => EMITTERS.filter(usableSender).length,
      vt: () => vt,
      skip: (w: string) => (dbg.skip = w),
      stats: () => ({ jumps: dbg.jumps, pops: dbg.pops, samples: dbg.samples, log: dbg.log.slice() }),
    };
  }

  resize();
  if (reducedMotion) still();
  else {
    draw();
    schedule();
  }

  return {
    setTarget(next, immediate = false) {
      if (next !== target) {
        // The tally counts what happens in the scene as it is now.
        tally = 0;
        tallySent = -1;
        if (next === 1 && !immediate && !reducedMotion) startWave();
        if (next === 0) {
          wave = null;
          // Without a system, the lights go out a few at a time.
          for (const l of lights) if (l.off === Infinity) l.off = now + 0.4 + rand() * 3.6;
        }
      }
      target = next;
      if (immediate) {
        order = next;
        wave = null;
      }
      if (reducedMotion) still();
      else schedule();
    },
    setPaused(p) {
      paused = p;
      if (p && raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
      schedule();
    },
    send(x, y) {
      if (reducedMotion || paused || !vtSynced) return false;
      if (now - lastSend < 0.3 || msgs.filter((m) => m.mine).length >= 5) return false;
      // The nearest building in view that can hold a message clear of the page's content.
      let best = -1;
      let bestD = compact ? 110 : 150;
      for (const c of EMITTERS) {
        const p = at(c);
        if (p.a < 0.99 || !onScreen(p.x, p.y, 16) || inQuiet(p.x, p.y - LIFT, 8) || !rightOfCopy(p.x, 8)) continue;
        const d = Math.hypot(p.x - x, p.y - y);
        if (d < bestD) {
          bestD = d;
          best = c;
        }
      }
      if (best < 0) return false;
      lastSend = now;
      return !!spawn(best, 'call', 0, 0, true);
    },
    resize,
    destroy() {
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
    },
  };
}
