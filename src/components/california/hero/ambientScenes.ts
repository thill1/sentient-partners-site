import type { SceneDef } from './cityScene';

/**
 * Ambient scenes: live traffic and aircraft over the night photographs.
 * Coordinates traced against grid overlays of each 2400px export
 * (u across, v down; s = perspective size).
 */

// Tyler Casey, the Bay Bridge's upper deck running into downtown, with the
// Embarcadero and Market Street beyond. 2400×1572.
const BAY_DECK = [
  { u: 0.02, v: 0.97, s: 1.0 },
  { u: 0.12, v: 0.84, s: 0.82 },
  { u: 0.21, v: 0.73, s: 0.64 },
  { u: 0.29, v: 0.64, s: 0.5 },
  { u: 0.37, v: 0.56, s: 0.36 },
  { u: 0.43, v: 0.51, s: 0.25 },
  { u: 0.475, v: 0.475, s: 0.14 },
];
const EMBARCADERO = [
  { u: 0.53, v: 0.655, s: 0.34 },
  { u: 0.75, v: 0.662, s: 0.38 },
  { u: 0.99, v: 0.676, s: 0.42 },
];
const BAY_MARKET = [
  { u: 0.586, v: 0.636, s: 0.28 },
  { u: 0.597, v: 0.52, s: 0.18 },
  { u: 0.604, v: 0.43, s: 0.1 },
];
const BAY_RAMP = [
  { u: 0.13, v: 0.462, s: 0.3 },
  { u: 0.2, v: 0.5, s: 0.34 },
  { u: 0.27, v: 0.54, s: 0.38 },
];

export const BAY_BRIDGE_SCENE: SceneDef = {
  imageAspect: 2400 / 1572,
  lanes: [
    { path: BAY_DECK, offset: 0.014, dir: 1, kind: 'tail', count: 8, speed: 0.07 },
    { path: BAY_DECK, offset: 0.032, dir: 1, kind: 'tail', count: 7, speed: 0.064 },
    { path: BAY_DECK, offset: 0.05, dir: 1, kind: 'tail', count: 6, speed: 0.06 },
    { path: BAY_DECK, offset: -0.014, dir: -1, kind: 'head', count: 7, speed: 0.07 },
    { path: BAY_DECK, offset: -0.032, dir: -1, kind: 'head', count: 6, speed: 0.066 },
    { path: EMBARCADERO, offset: 0.003, dir: 1, kind: 'tail', count: 6, speed: 0.03 },
    { path: EMBARCADERO, offset: -0.003, dir: -1, kind: 'head', count: 6, speed: 0.03 },
    { path: BAY_MARKET, offset: 0.002, dir: 1, kind: 'tail', count: 4, speed: 0.02 },
    { path: BAY_MARKET, offset: -0.002, dir: -1, kind: 'head', count: 4, speed: 0.02 },
    { path: BAY_RAMP, offset: 0.003, dir: 1, kind: 'tail', count: 4, speed: 0.03 },
  ],
  walks: [{ path: EMBARCADERO, offset: 0.012, count: 10 }],
  flights: [
    { from: [1.06, 0.1], to: [-0.08, 0.17] },
    { from: [-0.08, 0.05], to: [1.08, 0.12] },
  ],
};

// Derek Zhang, the Golden Gate at night from the south, deck lit, towers in
// International Orange. 2400×1600.
const GG_DECK = [
  { u: 0.372, v: 0.507, s: 0.2 },
  { u: 0.42, v: 0.49, s: 0.2 },
  { u: 0.47, v: 0.482, s: 0.2 },
  { u: 0.52, v: 0.477, s: 0.2 },
  { u: 0.572, v: 0.473, s: 0.2 },
];

export const GOLDEN_GATE_NIGHT_SCENE: SceneDef = {
  imageAspect: 2400 / 1600,
  lanes: [
    { path: GG_DECK, offset: 0.002, dir: 1, kind: 'tail', count: 7, speed: 0.05 },
    { path: GG_DECK, offset: -0.002, dir: -1, kind: 'head', count: 7, speed: 0.05 },
  ],
  walks: [],
  flights: [
    { from: [-0.08, 0.14], to: [1.08, 0.22] },
    { from: [1.08, 0.08], to: [-0.08, 0.16] },
  ],
};
