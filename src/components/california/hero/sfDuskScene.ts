import type { SceneDef } from './cityScene';

/**
 * Scene geometry for sf-dusk (Peter Zhan, Unsplash): San Francisco at blue
 * hour, looking down Market Street toward downtown and the Bay Bridge.
 *
 * All coordinates are fractions of the source image (u across, v down), traced
 * against a grid overlay of the 2400×1350 export. `s` is perspective size:
 * 1 at the bottom edge, shrinking toward the vanishing point.
 */

// Market Street centreline, bottom (near) → downtown (far).
const MARKET = [
  { u: 0.549, v: 1.02, s: 1.0 },
  { u: 0.528, v: 0.9, s: 0.8 },
  { u: 0.4985, v: 0.8, s: 0.6 },
  { u: 0.4715, v: 0.7, s: 0.42 },
  { u: 0.458, v: 0.635, s: 0.28 },
  { u: 0.4475, v: 0.585, s: 0.13 },
];

// I-80 approach on the right, near (lower right) → far (toward the bridge).
const FREEWAY = [
  { u: 1.03, v: 0.655, s: 1.0 },
  { u: 0.97, v: 0.622, s: 0.85 },
  { u: 0.93, v: 0.6, s: 0.72 },
  { u: 0.9, v: 0.583, s: 0.6 },
  { u: 0.875, v: 0.563, s: 0.48 },
  { u: 0.868, v: 0.555, s: 0.4 },
];

// The visible stretch of the Bay Bridge's western span deck.
const BRIDGE_DECK = [
  { u: 0.606, v: 0.4838, s: 0.32 },
  { u: 0.678, v: 0.4805, s: 0.32 },
];

// East Bay shoreline, far across the water.
const SHORELINE = [
  { u: 0.875, v: 0.4975, s: 0.26 },
  { u: 1.02, v: 0.494, s: 0.26 },
];

// Embarcadero promenade by the Ferry Building.
const WATERFRONT = [
  { u: 0.912, v: 0.5655, s: 0.42 },
  { u: 0.992, v: 0.568, s: 0.46 },
];

export const SF_DUSK_SCENE: SceneDef = {
  imageAspect: 2400 / 1350,
  lanes: [
    // Market Street: taillights run away from the viewer on the right,
    // headlights come toward the viewer on the left.
    { path: MARKET, offset: 0.009, dir: 1, kind: 'tail', count: 9, speed: 0.05 },
    { path: MARKET, offset: 0.019, dir: 1, kind: 'tail', count: 7, speed: 0.044 },
    { path: MARKET, offset: -0.009, dir: -1, kind: 'head', count: 8, speed: 0.05 },
    { path: MARKET, offset: -0.019, dir: -1, kind: 'head', count: 6, speed: 0.046 },
    // Freeway: taillights on the lower lanes heading for the bridge, headlights above.
    { path: FREEWAY, offset: -0.006, dir: 1, kind: 'tail', count: 8, speed: 0.07 },
    { path: FREEWAY, offset: -0.013, dir: 1, kind: 'tail', count: 6, speed: 0.064 },
    { path: FREEWAY, offset: 0.006, dir: -1, kind: 'head', count: 8, speed: 0.07 },
    { path: FREEWAY, offset: 0.013, dir: -1, kind: 'head', count: 6, speed: 0.066 },
    // Bridge deck and far shoreline: small, steady, distant.
    { path: BRIDGE_DECK, offset: 0.0015, dir: 1, kind: 'tail', count: 4, speed: 0.03 },
    { path: BRIDGE_DECK, offset: -0.0015, dir: -1, kind: 'head', count: 4, speed: 0.03 },
    { path: SHORELINE, offset: 0.001, dir: 1, kind: 'head', count: 5, speed: 0.022 },
  ],
  walks: [
    { path: MARKET, offset: 0.028, count: 9 },
    { path: MARKET, offset: -0.028, count: 9 },
    { path: WATERFRONT, offset: 0, count: 6 },
  ],
  // The Salesforce Tower crown carries the system.
  hub: { u: 0.5555, v: 0.302 },
  towers: [
    { u: 0.16, v: 0.352 }, // Transamerica Pyramid
    { u: 0.244, v: 0.364 },
    { u: 0.352, v: 0.432 },
    { u: 0.597, v: 0.38 },
    { u: 0.643, v: 0.443 }, // Bay Bridge tower
    { u: 0.743, v: 0.446 }, // Bay Bridge tower
    { u: 0.862, v: 0.408 },
  ],
  grounds: [
    { u: 0.196, v: 0.575, tower: 0 }, // City Hall
    { u: 0.1, v: 0.72, tower: 0 },
    { u: 0.3, v: 0.66, tower: 1 },
    { u: 0.4475, v: 0.585, tower: 2 }, // Market Street, downtown end
    { u: 0.39, v: 0.8, tower: 2 },
    { u: 0.6, v: 0.64, tower: 3 },
    { u: 0.63, v: 0.82, tower: 3 },
    { u: 0.7, v: 0.585, tower: 4 },
    { u: 0.8, v: 0.64, tower: 5 },
    { u: 0.875, v: 0.56, tower: 6 }, // freeway junction
    { u: 0.93, v: 0.72, tower: 6 },
  ],
  chaosBounds: [0.02, 0.4, 0.98, 0.97],
  signalZones: [
    [0.03, 0.46, 0.42, 0.95],
    [0.54, 0.44, 0.86, 0.93],
    [0.86, 0.6, 0.99, 0.93],
  ],
  flights: [
    { from: [1.06, 0.1], to: [-0.08, 0.2] },
    { from: [-0.08, 0.06], to: [1.08, 0.13] },
    { from: [1.06, 0.19], to: [0.25, 0.27] },
  ],
};
