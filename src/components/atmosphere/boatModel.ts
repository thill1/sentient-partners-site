/** Routes use the bay photograph's 1536 × 1024 coordinates. */
export type VesselKind = "sloop" | "yacht" | "cargo";

export interface Vessel {
  kind: VesselKind;
  x0: number;
  y: number;
  speed: number;
  width: number;
  born: number;
  life: number;
  phase: number;
}

export interface WaterView {
  left: number;
  right: number;
  compact?: boolean;
}

export function planVessel(
  random: () => number,
  now: number,
  slot: number,
  view: WaterView,
): Vessel {
  const kind = slot === 0 ? (random() < 0.65 ? "cargo" : "yacht")
    : random() < 0.5 ? "sloop" : "yacht";
  const left = Math.max(40, view.left - 60);
  // The portrait crop is dominated by the near tower. Its open water is
  // below the deck and to the left of the pier, before the foreground shore.
  const right = Math.min(view.compact ? 990 : 1490, view.right + 60);
  const direction = random() < 0.5 ? -1 : 1;
  // Nearer yachts cross perceptibly in a few seconds; the much larger ship
  // moves more slowly through the distant channel.
  const speed = kind === "cargo" ? 1.6 + random() * 0.6 : 2.8 + random() * 1.2;
  return {
    kind,
    x0: direction > 0 ? left : right,
    y: (view.compact ? 740 : 520) + slot * 104 + random() * 25,
    speed: speed * direction,
    width: kind === "cargo" ? 88 + random() * 18 : 19 + slot * 3 + random() * 6,
    born: now,
    life: (right - left) / speed,
    phase: random() * Math.PI * 2,
  };
}

export function vesselAt(vessel: Vessel, now: number) {
  const age = now - vessel.born;
  const fade = Math.max(0, Math.min(1, age / 18, (vessel.life - age) / 18));
  return {
    x: vessel.x0 + vessel.speed * age,
    y: vessel.y + Math.sin(now * 0.7 + vessel.phase) * (vessel.kind === "cargo" ? 0.12 : 0.45),
    alpha: fade * fade * (3 - 2 * fade),
  };
}
