export const DESCENT_VERTEX = 'attribute vec2 p; void main() { gl_Position = vec4(p, 0.0, 1.0); }';

/*
 * One continuous shot, drawn live. uP is the story from 0 to 1:
 *
 *   cruising above a sea of fog at dusk, the Golden Gate standing out of it
 *   → down into the fog, which closes around the lens
 *   → out underneath, over the water, and under the deck of the bridge
 *   → inland along a highway to the lights of a foothill town.
 *
 * Nothing here is a photograph. The far fog is a height field the ray is
 * marched against; the near fog is a volume, so it wisps around the towers
 * and closes over the camera. The bridge is modelled in its own frame: two
 * stepped towers with portal struts, a deck, piers, main cables and
 * suspenders. All noise comes from one small texture.
 */
export const DESCENT_FRAGMENT = `
precision highp float;
uniform sampler2D uNoise;
uniform vec2 uRes;
uniform float uTime;
uniform float uP;
uniform vec2 uLook;

const float CLOUD = 1.45;
const vec3 SUN = vec3(0.4708, 0.0351, 0.8816);
const float FOCAL = 1.25;

// The bridge: centre of the main span, and the direction it runs.
const vec3 SPAN = vec3(4.5, 0.0, 18.0);
const vec2 AXIS = vec2(0.5, 0.866);
const vec2 ACROSS = vec2(-0.866, 0.5);
const float HALF = 5.5;    // centre of span to a tower
const float SIDE = 4.2;    // tower to anchorage
const float TOP = 2.72;    // tower height above the water
const float DECK = 0.8;    // roadway height
const float LEG = 0.2;     // half the distance between a tower's legs
const vec3 ORANGE = vec3(0.86, 0.27, 0.13);

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float n2(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return texture2D(uNoise, (i + f + 0.5) / 256.0).r;
}
float n3(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  vec2 uv = i.xy + vec2(37.0, 17.0) * i.z + f.xy;
  vec2 gr = texture2D(uNoise, (uv + 0.5) / 256.0).gr;
  return mix(gr.x, gr.y, f.z);
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * n2(p); p = p * 2.02 + vec2(31.7, 17.3); a *= 0.5; }
  return v;
}
float fbm3(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 3; i++) { v += a * n2(p); p = p * 2.02 + vec2(31.7, 17.3); a *= 0.5; }
  return v;
}

// The fog rolls in from the ocean: slowly, but always visibly moving.
vec3 gCam;

vec2 drift() { return vec2(uTime * 0.016, -uTime * 0.034); }

// ---------------------------------------------------------------- fog

// The top of the fog: slow swells with smaller billows riding on them.
// The fog banks up a little where it meets the roadway.
float banked(vec2 xz) {
  vec2 d = xz - SPAN.xz;
  float off = dot(d, ACROSS);
  return 0.34 * exp(-off * off * 0.5) * (1.0 - smoothstep(HALF + SIDE, HALF + SIDE + 3.0, abs(dot(d, AXIS))));
}
float cloudLow(vec2 xz) { return CLOUD + (fbm3(xz * 0.21 + drift()) - 0.5) * 1.05 + banked(xz); }
float cloudTop(vec2 xz) {
  float big = fbm3(xz * 0.21 + drift());
  float puffs = fbm(xz * 0.62 + drift() * 2.2 + big * 1.6);
  return CLOUD + (big - 0.5) * 1.05 + (puffs - 0.5) * 0.44 + banked(xz);
}
// How far a point is from the nearest tower, measured across the ground.
float towerReach(vec2 xz) {
  vec2 d = xz - SPAN.xz;
  float along = abs(dot(d, AXIS)) - HALF;
  return length(vec2(along, dot(d, ACROSS)));
}
// The fog as a volume: thick below its top, ragged at the edge, with a base
// you can come out underneath. It climbs a little where it meets the towers.
float fogDensity(vec3 q) {
  float wisp = n3(q * vec3(1.3, 2.6, 1.3) + vec3(drift().x * 5.0, uTime * 0.035, drift().y * 5.0)) * 0.62
             + n3(q * 3.7 + vec3(0.0, uTime * 0.06, uTime * 0.05)) * 0.38;
  float cling = exp(-towerReach(q.xz) * 1.3) * 0.85;
  float surface = cloudLow(q.xz) + cling;
  float d = clamp((surface - q.y) * 1.5 + (wisp - 0.5) * 2.1, 0.0, 1.0);
  // Thin streamers torn off the top by the wind, drawn out along its direction.
  vec2 wind = vec2(q.x * 0.5 - q.z * 0.86, q.x * 0.86 + q.z * 0.5);
  float streamer = n3(vec3(wind.x * 0.55 + uTime * 0.05, q.y * 5.0 - uTime * 0.02, wind.y * 3.2));
  float lift = clamp((q.y - surface) / 0.55, 0.0, 1.0);
  // Only near the camera: at range they are finer than the samples and would sparkle.
  float close = 1.0 - smoothstep(4.0, 10.0, length(q - gCam));
  d = max(d, smoothstep(0.6, 0.86, streamer) * (1.0 - lift) * step(surface - 0.1, q.y) * 0.5 * close);
  return d * smoothstep(0.9, 1.14, q.y + (wisp - 0.5) * 0.3);
}

// ---------------------------------------------------------------- sky

vec3 sky(vec3 rd, float high) {
  float y = max(rd.y, 0.0);
  vec3 c = mix(vec3(1.0, 0.57, 0.28), vec3(0.94, 0.36, 0.36), smoothstep(0.0, 0.045, y));
  c = mix(c, vec3(0.52, 0.26, 0.56), smoothstep(0.025, 0.12, y));
  c = mix(c, vec3(0.14, 0.14, 0.42), smoothstep(0.09, 0.27, y));
  c = mix(c, mix(vec3(0.03, 0.04, 0.16), vec3(0.004, 0.006, 0.028), high), smoothstep(0.22, 0.72, y));
  float toward = max(dot(normalize(rd.xz), normalize(SUN.xz)), 0.0);
  c = mix(c * vec3(0.5, 0.56, 0.92), c, 0.3 + 0.7 * pow(toward, 4.0));
  float s = max(dot(rd, SUN), 0.0);
  c += vec3(1.0, 0.42, 0.18) * pow(s, 90.0) * 0.42;
  c += vec3(1.0, 0.55, 0.30) * pow(s, 12.0) * 0.07;
  c += vec3(1.0, 0.70, 0.36) * pow(s, 1400.0) * 0.9;
  c += vec3(0.6, 0.55, 0.42) * smoothstep(0.99986, 0.99995, s);
  return c;
}
float stars(vec3 rd) {
  vec2 uv = rd.xy / (rd.z + 0.6) * 130.0;
  vec2 id = floor(uv);
  vec2 f = fract(uv) - 0.5;
  float r = hash21(id);
  float star = step(0.975, r) * smoothstep(0.10 * r, 0.0, length(f));
  return star * (0.5 + 0.5 * sin(uTime * 1.3 + r * 80.0));
}

// ---------------------------------------------------------------- bridge

vec3 toLocal(vec3 v) { return vec3(dot(v.xz, ACROSS), v.y, dot(v.xz, AXIS)); }

float box(vec3 ro, vec3 rd, vec3 c, vec3 b, out vec3 n) {
  vec3 m = 1.0 / rd;
  vec3 k = abs(m) * b;
  vec3 t1 = -m * (ro - c) - k;
  vec3 t2 = -m * (ro - c) + k;
  float tN = max(max(t1.x, t1.y), t1.z);
  float tF = min(min(t2.x, t2.y), t2.z);
  n = -sign(rd) * step(t1.yzx, t1.xyz) * step(t1.zxy, t1.xyz);
  return (tN > tF || tF < 0.0) ? -1.0 : tN;
}
// One tower at local z: two legs that step in as they rise, four portal
// struts above the roadway and two below it.
float tower(vec3 ro, vec3 rd, float z, out vec3 n) {
  vec3 nn;
  if (box(ro, rd, vec3(0.0, 1.3, z), vec3(LEG + 0.09, 1.55, 0.12), nn) < 0.0) return -1.0;
  float best = -1.0;
  for (int i = 0; i < 10; i++) {
    vec3 c;
    vec3 b;
    if (i == 0) { c = vec3(-LEG, 0.72, z); b = vec3(0.062, 0.86, 0.085); }
    else if (i == 1) { c = vec3(LEG, 0.72, z); b = vec3(0.062, 0.86, 0.085); }
    else if (i == 2) { c = vec3(-LEG, 2.14, z); b = vec3(0.046, 0.58, 0.066); }
    else if (i == 3) { c = vec3(LEG, 2.14, z); b = vec3(0.046, 0.58, 0.066); }
    else if (i == 4) { c = vec3(0.0, TOP - 0.07, z); b = vec3(LEG, 0.075, 0.05); }
    else if (i == 5) { c = vec3(0.0, 2.24, z); b = vec3(LEG, 0.05, 0.045); }
    else if (i == 6) { c = vec3(0.0, 1.78, z); b = vec3(LEG, 0.055, 0.05); }
    else if (i == 7) { c = vec3(0.0, 1.28, z); b = vec3(LEG, 0.06, 0.055); }
    else if (i == 8) { c = vec3(0.0, 0.52, z); b = vec3(LEG, 0.035, 0.05); }
    else { c = vec3(0.0, 0.26, z); b = vec3(LEG, 0.035, 0.05); }
    float t = box(ro, rd, c, b, nn);
    if (t > 0.0 && (best < 0.0 || t < best)) { best = t; n = nn; }
  }
  return best;
}
// Height of a main cable above the water at local z.
float cableY(float z) {
  float a = abs(z);
  if (a < HALF) { float s = a / HALF; return mix(DECK + 0.09, TOP - 0.04, s * s); }
  float s = clamp((a - HALF) / SIDE, 0.0, 1.0);
  return mix(TOP - 0.04, DECK + 0.03, s) - 0.22 * s * (1.0 - s);
}
// Everything solid in the bridge. Returns distance; kind is 1 tower, 2 deck, 3 pier.
float bridge(vec3 ro, vec3 rd, out vec3 n, out float kind) {
  float best = -1.0;
  vec3 nn;
  kind = 0.0;
  for (int i = 0; i < 2; i++) {
    float z = i == 0 ? -HALF : HALF;
    float t = tower(ro, rd, z, nn);
    if (t > 0.0 && (best < 0.0 || t < best)) { best = t; n = nn; kind = 1.0; }
    t = box(ro, rd, vec3(0.0, 0.03, z), vec3(LEG + 0.14, 0.09, 0.2), nn);
    if (t > 0.0 && (best < 0.0 || t < best)) { best = t; n = nn; kind = 3.0; }
  }
  float t = box(ro, rd, vec3(0.0, DECK, 0.0), vec3(LEG - 0.03, 0.045, HALF + SIDE + 4.0), nn);
  if (t > 0.0 && (best < 0.0 || t < best)) { best = t; n = nn; kind = 2.0; }
  return best;
}
// Cables and suspenders lie in two vertical planes, one over each side of the deck.
// Returns coverage; depth is the distance to the nearer one.
float rigging(vec3 ro, vec3 rd, out float depth) {
  float cover = 0.0;
  depth = 1e5;
  for (int i = 0; i < 2; i++) {
    float side = i == 0 ? -LEG : LEG;
    float t = (side - ro.x) / rd.x;
    if (t <= 0.0) continue;
    vec3 q = ro + rd * t;
    if (abs(q.z) > HALF + SIDE) continue;
    float y = cableY(q.z);
    float w = max(0.011, t * 0.0015);
    float line = smoothstep(w, w * 0.35, abs(q.y - y));
    float gap = 0.2;
    float hang = smoothstep(w * 0.55, 0.0, abs(fract(q.z / gap) - 0.5) * gap) * step(q.y, y) * step(DECK, q.y) * 0.55;
    float c = max(line, hang);
    if (c > cover) { cover = c; depth = t; }
  }
  return cover;
}
// Colour of a point on the bridge. lit is how much sun reaches it (above the
// fog); below the fog the towers are floodlit from their feet and the deck.
vec3 bridgeColor(vec3 q, vec3 n, float kind, float above) {
  vec3 sunLocal = toLocal(SUN);
  float facing = clamp(dot(n, normalize(sunLocal + vec3(0.0, 0.25, 0.0))), 0.0, 1.0);
  if (kind > 2.5) return mix(vec3(0.07, 0.07, 0.11), vec3(0.42, 0.33, 0.30), above * facing) + vec3(0.25, 0.14, 0.07) * (1.0 - above);
  if (kind > 1.5) {
    // The roadway: dark steel, a line of lamps along each edge.
    float lamp = smoothstep(0.045, 0.0, abs(fract(q.z * 2.4) - 0.5)) * step(0.5, abs(n.x)) * smoothstep(DECK - 0.01, DECK + 0.03, q.y);
    vec3 steel = mix(ORANGE * vec3(0.20, 0.17, 0.22), ORANGE * 0.5, above * (0.3 + 0.7 * facing));
    float truss = step(0.5, -n.y) * (0.5 + 0.5 * step(0.5, fract(q.z * 4.0)));
    steel *= 1.0 - truss * 0.45;
    // The stiffening truss along each side: chords top and bottom, diagonals between.
    float up = (q.y - (DECK - 0.045)) / 0.09;
    float zig = abs(fract(q.z * 7.0) - 0.5) * 2.0;
    float web = max(smoothstep(0.16, 0.06, abs(up - zig)), max(step(0.86, up), step(up, 0.14)));
    steel *= mix(1.0, 0.45 + 0.95 * web, step(0.5, abs(n.x)));
    return steel + vec3(1.0, 0.78, 0.48) * lamp * 1.6;
  }
  vec3 day = mix(ORANGE * vec3(0.5, 0.36, 0.56), ORANGE * 1.18, 0.15 + 0.85 * facing) + vec3(1.0, 0.7, 0.45) * pow(facing, 6.0) * 0.22;
  float flood = max(exp(-max(q.y - 0.1, 0.0) * 1.0), exp(-abs(q.y - DECK - 0.2) * 1.5));
  vec3 night = ORANGE * (0.22 + 1.35 * flood) * (0.7 + 0.3 * abs(n.z));
  vec3 paint = mix(night, day, above);
  // Art Deco detail: fluted legs, and stepped panels cut into the portal struts.
  float leg = step(LEG - 0.07, abs(q.x));
  float flute = 0.86 + 0.14 * smoothstep(0.25, 0.5, abs(fract((abs(n.z) > 0.5 ? q.x : q.z) * 34.0) - 0.5) * 2.0);
  float panel = smoothstep(0.42, 0.36, abs(fract(q.x * 5.2 + 0.5) - 0.5)) * step(0.5, abs(n.z)) * (1.0 - leg);
  paint *= mix(1.0, flute, leg);
  paint *= 1.0 - panel * 0.38;
  return paint;
}

// ---------------------------------------------------------------- ground

// Lights on the ground, drawn round whatever the angle they are seen from.
vec3 groundLights(vec2 g, float squash, float amount) {
  vec3 sum = vec3(0.0);
  for (int k = 0; k < 2; k++) {
    float scale = k == 0 ? 6.0 : 13.0;
    vec2 s = g * scale;
    vec2 id = floor(s);
    vec2 f = fract(s) - 0.5;
    float r = hash21(id + float(k) * 19.0);
    vec2 o = (vec2(hash21(id + 3.1), hash21(id + 7.7)) - 0.5) * 0.5;
    float d = length(vec2((f.x - o.x) / squash, f.y - o.y));
    float on = step(k == 0 ? 0.35 : 0.6, r) * amount;
    vec3 c = mix(vec3(1.0, 0.66, 0.32), vec3(1.0, 0.9, 0.74), hash21(id + 1.3));
    sum += c * on * (smoothstep(0.11, 0.0, d) * 1.7 + 0.012 / (d * d + 0.012) * 0.22) * (k == 0 ? 1.0 : 0.6);
  }
  return sum;
}
// The highway inland: a strip of road, a broken centre line, and cars. Each
// car is a pair of lamps, white coming toward you and red going away.
float roadCentre(float z) { return SPAN.x + 0.75 * sin((z - 30.0) * 0.2); }
vec3 highway(vec2 g, float squash) {
  float d = g.x - roadCentre(g.y);
  float on = smoothstep(29.5, 31.0, g.y);
  vec3 c = vec3(0.5, 0.45, 0.34) * smoothstep(0.004, 0.001, abs(d)) * step(0.5, fract(g.y * 3.0)) * 0.5;
  c += vec3(0.4, 0.36, 0.3) * smoothstep(0.004, 0.0015, abs(abs(d) - 0.066)) * 0.35;
  for (int lane = 0; lane < 2; lane++) {
    float side = lane == 0 ? -1.0 : 1.0;
    float u = g.y * 1.7 + side * uTime * (lane == 0 ? 0.9 : 0.5);
    float id = floor(u);
    float present = step(0.42, hash21(vec2(id, float(lane) * 7.0)));
    float along = (fract(u) - 0.5) / 1.7;
    float across = d - side * 0.032;
    // Two lamps, a car's width apart.
    float lamps = 0.0;
    for (int w = 0; w < 2; w++) {
      float off = w == 0 ? -0.011 : 0.011;
      float r = length(vec2((across - off) / squash, along));
      lamps += smoothstep(0.014, 0.003, r) + 0.00006 / (r * r + 0.00012);
    }
    vec3 tint = lane == 0 ? vec3(1.0, 0.96, 0.84) : vec3(1.0, 0.13, 0.09);
    // Headlamps throw a little light on the road ahead of the car.
    float pool = lane == 0 ? smoothstep(0.03, 0.0, abs(across)) * smoothstep(0.0, -0.02, along) * smoothstep(-0.16, -0.02, along) * 0.16 : 0.0;
    c += tint * present * (lamps * 1.5 + pool);
  }
  return c * on;
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  float p = uP;

  // The camera's path. Height is in units of about 84 m: the towers are 2.72 tall.
  // It lingers in the fog: most of the middle of the scroll is spent inside it.
  float h = p < 0.38 ? mix(4.7, 2.5, smoothstep(0.0, 0.38, p))
          : p < 0.43 ? mix(2.5, 2.0, (p - 0.38) / 0.05)
          : p < 0.57 ? mix(2.0, 0.98, (p - 0.43) / 0.14)
          : p < 0.61 ? mix(0.98, 0.36, smoothstep(0.57, 0.61, p))
          : mix(0.36, 0.16, smoothstep(0.66, 1.0, p));
  float z = 7.0 * clamp(p / 0.38, 0.0, 1.0) + 2.5 * clamp((p - 0.38) / 0.22, 0.0, 1.0)
          + 11.5 * clamp((p - 0.6) / 0.11, 0.0, 1.0) + 42.0 * smoothstep(0.71, 1.0, p);
  // Inland the camera follows the highway.
  float x = mix(SPAN.x * smoothstep(0.2, 0.66, p), roadCentre(z), smoothstep(0.74, 0.84, p));
  float high = smoothstep(2.0, 4.7, h);
  // From altitude the horizon bows, as it does through a wide lens.
  uv.y += 0.085 * high * uv.x * uv.x;
  float pitch = mix(-0.10, 0.03, smoothstep(0.0, 0.5, p)) + 0.09 * smoothstep(0.59, 0.65, p) * (1.0 - smoothstep(0.68, 0.75, p)) - 0.10 * smoothstep(0.78, 1.0, p);

  // The camera floats a little, as an aircraft does.
  vec3 ro = vec3(x + uLook.x * 0.25 + 0.05 * sin(uTime * 0.21), h + 0.035 * sin(uTime * 0.33 + 1.0), z);
  uv = mat2(cos(0.012 * sin(uTime * 0.17)), -sin(0.012 * sin(uTime * 0.17)), sin(0.012 * sin(uTime * 0.17)), cos(0.012 * sin(uTime * 0.17))) * uv;
  vec3 rd = normalize(vec3(uv.x + uLook.x * 0.025, uv.y + pitch + uLook.y * 0.018, FOCAL));
  rd.x = abs(rd.x) < 0.0002 ? 0.0002 : rd.x;
  gCam = ro;

  float fogHere = cloudLow(ro.xz);
  // 1 while the camera is clear above the fog, 0 once it is in or under it.
  float above = smoothstep(-0.05, 0.3, h - fogHere);
  // 1 while the camera is inside the fog itself.
  float inside = (1.0 - above) * smoothstep(0.9, 1.12, h);

  vec3 haze = mix(sky(normalize(vec3(rd.x, 0.012, rd.z)), high), vec3(0.40, 0.33, 0.60), 0.5);
  // At the horizon the fog dissolves into the glow of the sky behind it.
  vec3 farHaze = sky(normalize(vec3(rd.x, max(rd.y, 0.0) + 0.003, rd.z)), high);
  vec3 dusk = vec3(0.98, 0.50, 0.30);
  vec3 col;
  float tScene = 1e5;

  // -------- what lies behind everything: sky, the far fog, or the ground
  vec3 upper = sky(rd, high) + stars(rd) * smoothstep(0.04, 0.28, rd.y) * (0.3 + 0.7 * high);
  if (rd.y > 0.0) {
    vec2 cu = rd.xz / (rd.y + 0.13) * vec2(0.42, 1.6) + drift() * 0.4;
    float cirrus = smoothstep(0.5, 0.82, fbm(cu)) * smoothstep(0.0, 0.07, rd.y) * (1.0 - smoothstep(0.2, 0.46, rd.y));
    upper = mix(upper, vec3(1.0, 0.52, 0.42), cirrus * 0.42);
  }
  col = upper;

  bool sea = false;
  if (above > 0.02 && rd.y < 0.09) {
    float t = rd.y < 0.0 ? max((CLOUD + 0.95 - ro.y) / rd.y, 0.0) : 0.0;
    float hit = -1.0;
    for (int i = 0; i < 64; i++) {
      vec3 pos = ro + rd * t;
      float dh = pos.y - cloudLow(pos.xz);
      if (dh < 0.004 * t + 0.01) { hit = t; break; }
      t += max(dh * 0.55, 0.03) * (1.0 + t * 0.03);
      if (t > 82.0) break;
    }
    // A grazing ray can run out of steps just above the surface; it still lands on fog.
    if (hit < 0.0 && rd.y < 0.0 && t <= 82.0) hit = t;
    if (hit > 0.0) {
      sea = true;
      tScene = hit;
      vec3 pos = ro + rd * hit;
      float e = 0.05 + hit * 0.012;
      float here = cloudTop(pos.xz);
      vec3 n = normalize(vec3(cloudTop(pos.xz - vec2(e, 0.0)) - cloudTop(pos.xz + vec2(e, 0.0)), 2.0 * e,
                              cloudTop(pos.xz - vec2(0.0, e)) - cloudTop(pos.xz + vec2(0.0, e))));
      float facing = clamp(dot(n, SUN) * 0.5 + 0.5, 0.0, 1.0);
      float shade = clamp(1.0 - (cloudTop(pos.xz + SUN.xz * 0.6) - (here + SUN.y * 0.6)) * 3.2, 0.0, 1.0);
      shade *= clamp(1.0 - (cloudLow(pos.xz + SUN.xz * 2.0) - (here + SUN.y * 2.0)) * 2.2, 0.0, 1.0);
      shade *= clamp(1.0 - (cloudLow(pos.xz + SUN.xz * 5.0) - (here + SUN.y * 5.0)) * 1.4, 0.0, 1.0);
      float depth = smoothstep(CLOUD - 0.6, CLOUD + 0.5, here);
      float lit = smoothstep(0.44, 0.7, facing) * shade;
      vec3 cloud = mix(vec3(0.085, 0.095, 0.30), vec3(0.34, 0.29, 0.58), smoothstep(0.3, 0.75, facing));
      cloud = mix(cloud, vec3(1.0, 0.62, 0.44), lit);
      cloud += vec3(1.0, 0.86, 0.68) * pow(facing, 10.0) * shade * 0.4;
      cloud *= mix(0.55, 1.05, depth);
      cloud += vec3(1.0, 0.46, 0.24) * pow(max(dot(rd, SUN), 0.0), 6.0) * 0.20 * depth;
      cloud = mix(cloud, cloud * vec3(0.78, 0.84, 1.08), high * 0.4);
      cloud = mix(cloud, haze, 1.0 - exp(-hit * 0.026));
      col = mix(cloud, mix(farHaze, upper, smoothstep(-0.01, 0.02, rd.y)), smoothstep(22.0, 58.0, hit));
    } else if (rd.y < 0.0) {
      col = mix(farHaze, upper, smoothstep(-0.02, 0.0, rd.y));
    }
  }

  // As the camera sinks into the surface, the far fog gives way to the fog around the lens.
  if (sea) col = mix(vec3(0.62, 0.61, 0.82), col, smoothstep(0.02, 0.7, above));

  vec3 bro = toLocal(ro - SPAN);
  vec3 brd = toLocal(rd);
  brd.x = abs(brd.x) < 0.0002 ? 0.0002 : brd.x;

  // Only once the camera is in or under the fog; from above, rays that miss
  // the fog sea near the horizon must not fall through to the ground.
  if (!sea && above <= 0.02 && rd.y < 0.0) {
    float t = -h / rd.y;
    tScene = t;
    vec3 pos = ro + rd * t;
    float squash = clamp(-rd.y * 1.6, 0.14, 1.0);
    float alongSpan = abs(dot(pos.xz - SPAN.xz, AXIS));
    float inland = smoothstep(29.5, 31.0, pos.z + 1.2 * sin(pos.x * 0.35));
    float headland = smoothstep(10.4, 10.9, alongSpan + 0.9 * n2(pos.xz * 0.35)) * (1.0 - inland);
    float land = max(inland, headland);

    // Water: it mirrors the fog above it, and the bridge.
    float chop = 1.0 / (1.0 + t * 0.25);
    vec3 wn = normalize(vec3((n2(pos.xz * vec2(26.0, 9.0) + uTime * 0.5) - 0.5) * 0.10 * chop + (n2(pos.xz * vec2(70.0, 30.0) - uTime * 0.7) - 0.5) * 0.05 * chop, 1.0,
                             (n2(pos.xz * vec2(9.0, 22.0) + 9.0 - uTime * 0.4) - 0.5) * 0.12 * chop));
    vec3 rr = reflect(rd, wn);
    vec3 mirror = mix(vec3(0.06, 0.065, 0.18), dusk * 0.62, exp(-max(rr.y, 0.0) * 13.0));
    vec3 rn;
    float rk;
    vec3 rro = toLocal(pos - SPAN);
    vec3 rrd = toLocal(rr);
    rrd.x = abs(rrd.x) < 0.0002 ? 0.0002 : rrd.x;
    float rt = bridge(rro, rrd, rn, rk);
    if (rt > 0.0) mirror = mix(mirror, bridgeColor(rro + rrd * rt, rn, rk, 0.0), 0.8 * exp(-rt * 0.08));
    float fresnel = mix(0.28, 0.95, pow(1.0 - clamp(-rd.y, 0.0, 1.0), 4.0));
    vec3 water = mix(vec3(0.012, 0.022, 0.06), mirror, fresnel);

    // Land: dark, with the lights of towns, and inland the highway.
    float town = smoothstep(0.34, 0.6, fbm3(pos.xz * 0.21 + 3.0));
    vec2 home = pos.xz - vec2(SPAN.x, 67.0);
    float homeTown = exp(-dot(home, home) * 0.012);
    town = max(town, homeTown);
    float shore = smoothstep(31.0, 32.0, pos.z + 1.2 * sin(pos.x * 0.35)) * (1.0 - smoothstep(34.0, 40.0, pos.z));
    town = max(max(town * inland, shore * 0.9), smoothstep(11.2, 12.2, alongSpan) * (1.0 - inland) * smoothstep(0.3, 0.55, fbm3(pos.xz * 0.5)) * step(0.0, dot(pos.xz - SPAN.xz, AXIS)));
    vec3 earth = vec3(0.020, 0.030, 0.085) * (0.75 + 0.6 * fbm3(pos.xz * 0.8));
    earth += groundLights(pos.xz, squash, town) * exp(-t * 0.02);
    // Streets: lamps at even intervals, so a town reads as a town.
    vec2 st = pos.xz * 7.0;
    vec2 sf = abs(fract(st) - 0.5);
    float onStreet = step(0.5, hash21(floor(st.yx * vec2(1.0, 0.25)))) ;
    float lampAt = smoothstep(0.10, 0.0, length(vec2(sf.x / squash, sf.y))) * onStreet;
    earth += vec3(1.0, 0.74, 0.42) * lampAt * homeTown * 1.3 * exp(-t * 0.02);
    earth += vec3(1.0, 0.6, 0.32) * town * 0.04;
    float strip = smoothstep(0.078, 0.066, abs(pos.x - roadCentre(pos.z))) * inland;
    earth = mix(earth, vec3(0.035, 0.04, 0.075), strip);
    earth += highway(pos.xz, squash) * exp(-t * 0.02);

    col = mix(water, earth, land);
    col = mix(col, mix(dusk, vec3(0.22, 0.16, 0.36), 0.62), 1.0 - exp(-t * 0.05));
  }

  // Foothill ridgelines against the last light, once you are under the fog.
  if (above < 0.5 && tScene > 14.0) {
    float grow = 0.7 + 1.5 * smoothstep(0.7, 1.0, p);
    for (int i = 0; i < 5; i++) {
      float fi = float(i);
      float rx = rd.x * (2.3 + fi * 1.7) + fi * 7.3 + ro.z * 0.012 * (fi + 1.0) + ro.x * 0.05;
      float ridge = ((fbm3(vec2(rx, fi * 3.1)) - 0.33) * (0.17 - fi * 0.024) + (n2(vec2(rx * 30.0, fi)) - 0.5) * 0.0026 * step(2.5, fi)) * grow;
      float edge = smoothstep(ridge + 0.0025, ridge - 0.0025, rd.y);
      vec3 ridgeColor = mix(vec3(0.03, 0.04, 0.115), mix(dusk, vec3(0.34, 0.22, 0.44), 0.55), 0.74 - fi * 0.17);
      // Houses on the nearer slopes.
      vec2 cell = vec2(rx * 46.0, rd.y * 300.0);
      float house = step(0.9, hash21(floor(cell) + fi * 13.0)) * smoothstep(0.32, 0.0, length(fract(cell) - 0.5));
      ridgeColor += vec3(1.0, 0.72, 0.42) * house * step(0.5, fi) * smoothstep(ridge - 0.004, ridge - 0.03, rd.y) * (0.45 + 0.55 * smoothstep(0.72, 0.9, p));
      col = mix(col, ridgeColor, edge * step(-0.035 - fi * 0.014, rd.y));
    }
  }

  // -------- the bridge
  vec3 bn;
  float kind;
  float tb = bridge(bro, brd, bn, kind);
  if (tb > 0.0 && tb < tScene) {
    vec3 q = bro + brd * tb;
    // Sunlit where it stands above the fog, floodlit where it is under it.
    float sunlit = smoothstep(-0.25, 0.3, q.y - cloudLow((ro + rd * tb).xz));
    vec3 steel = bridgeColor(q, bn, kind, sunlit);
    steel = mix(steel, haze, (1.0 - exp(-tb * 0.03)) * above);
    col = steel;
    tScene = tb;
  }
  float rigDepth;
  float rig = rigging(bro, brd, rigDepth);
  if (rig > 0.0 && rigDepth < tScene) {
    float y = bro.y + brd.y * rigDepth;
    float sunlit = smoothstep(-0.25, 0.3, y - cloudLow((ro + rd * rigDepth).xz));
    vec3 wire = mix(ORANGE * 0.5, ORANGE * 1.05, sunlit);
    wire = mix(wire, haze, (1.0 - exp(-rigDepth * 0.03)) * above);
    col = mix(col, wire, rig * 0.85);
  }
  // Aircraft beacons on the tower tops.
  for (int i = 0; i < 2; i++) {
    vec3 top = vec3(0.0, TOP + 0.08, i == 0 ? -HALF : HALF) - bro;
    float along = dot(top, brd);
    float miss = length(top - brd * along);
    float blink = 0.55 + 0.45 * sin(uTime * 1.6 + float(i) * 1.7);
    col += vec3(1.0, 0.14, 0.18) * (0.0005 / (miss * miss + 0.0003)) * blink * step(0.0, along) * step(along, tScene + 0.5);
  }

  // -------- the near fog, as a volume in front of everything
  {
    float yTop = 2.85;
    float yBase = 0.86;
    float t0 = 0.0;
    float t1 = min(tScene, 46.0);
    if (rd.y < -0.0001) {
      if (ro.y > yTop) t0 = (yTop - ro.y) / rd.y;
      t1 = min(t1, (yBase - ro.y) / rd.y);
    } else if (rd.y > 0.0001) {
      if (ro.y < yBase) t0 = (yBase - ro.y) / rd.y;
      t1 = min(t1, (yTop - ro.y) / rd.y);
    }
    if (ro.y > yTop && rd.y >= 0.0) t1 = -1.0;
    if (ro.y < yBase && rd.y <= 0.0) t1 = -1.0;
    if (t1 > t0) {
      float t = t0 + hash21(gl_FragCoord.xy + fract(uTime) * 17.0) * max(0.05, t0 * 0.06);
      float through = 1.0;
      vec3 light = vec3(0.0);
      for (int i = 0; i < 44; i++) {
        if (t > t1 || through < 0.02) break;
        vec3 q = ro + rd * t;
        float stride = max(0.05, t * 0.06);
        float d = fogDensity(q);
        if (d > 0.01) {
          float toSun = fogDensity(q + SUN * 0.32) + clamp((cloudLow(q.xz + SUN.xz * 1.6) - q.y) * 0.9, 0.0, 1.0);
          float lit = exp(-toSun * 2.0);
          float depth = clamp((cloudLow(q.xz) - q.y) * 1.3, 0.0, 1.0);
          // Seen from above: deep violet shadow and sunlit crests. From
          // inside: the pale, even glow of being in it. From below: a dark
          // ceiling, warm where the last light gets under it.
          vec3 outer = mix(vec3(0.10, 0.11, 0.32), vec3(0.36, 0.30, 0.58), 0.5 + 0.5 * lit);
          outer = mix(outer, vec3(1.0, 0.62, 0.44), lit * (1.0 - depth * 0.6));
          // Inside, it streams upward past the lens as you sink through it.
          float stream = n3(q * vec3(0.9, 0.5, 0.9) + vec3(uTime * 0.03, uTime * 0.1 - p * 34.0, 0.0)) * 0.65 + n3(q * 2.6 + vec3(0.0, uTime * 0.16 - p * 50.0, uTime * 0.05)) * 0.35;
          vec3 inner = mix(vec3(0.56, 0.56, 0.80), vec3(0.98, 0.95, 0.99), smoothstep(0.3, 0.72, stream));
          vec3 under = mix(vec3(0.045, 0.055, 0.17), vec3(0.30, 0.23, 0.44), smoothstep(0.28, 0.72, fbm3(q.xz * 0.5 + drift() * 3.0)));
          under = mix(under, vec3(1.0, 0.46, 0.28), exp(-abs(rd.y) * 6.0) * (0.35 + 0.5 * n3(q * 1.3)));
          vec3 c = mix(mix(under, inner, inside), outer, above);
          c = mix(c, haze, (1.0 - exp(-t * 0.02)) * above);
          float a = 1.0 - exp(-d * stride * mix(mix(3.6, 9.5, inside), 2.6, above));
          a *= 1.0 - smoothstep(18.0, 34.0, t) * above;
          // From underneath, the deck of cloud ends short of the horizon.
          a *= 1.0 - smoothstep(9.0, 20.0, t) * (1.0 - above) * (1.0 - inside);
          light += through * a * c;
          through *= 1.0 - a;
        }
        t += stride;
      }
      col = col * through + light;
    }
  }

  // Inside the fog: the sun is a soft glow somewhere ahead, and the fog itself
  // streams past in sheets as you sink through it.
  if (inside > 0.01) {
    float sheets = fbm(vec2(uv.x * 1.6 + uTime * 0.03, uv.y * 0.9 - p * 46.0 + uTime * 0.07));
    col *= mix(1.0, 0.8 + 0.42 * sheets, inside);
    vec2 glowAt = SUN.xy / SUN.z * FOCAL - vec2(0.0, pitch);
    float glow = exp(-length((uv - glowAt) * vec2(1.0, 1.5)) * 2.6);
    col += vec3(1.0, 0.66, 0.46) * glow * 0.42 * inside * smoothstep(1.0, 1.9, h);
  }

  // The sun drawn out along the horizon, as a lens would.
  vec2 sunUv = SUN.xy / SUN.z * FOCAL - vec2(uLook.x * 0.025, pitch + uLook.y * 0.018);
  col += vec3(1.0, 0.50, 0.24) * exp(-abs(uv.y - sunUv.y) * 90.0) * exp(-abs(uv.x - sunUv.x) * 2.8) * 0.10 * above;

  // Lens: a vignette and a little grain.
  col *= 1.0 - 0.36 * dot(uv, uv);
  col += (hash21(gl_FragCoord.xy + fract(uTime) * 61.0) - 0.5) * 0.02;
  gl_FragColor = vec4(col, 1.0);
}
`;
