export const DESCENT_VERTEX = 'attribute vec2 p; void main() { gl_Position = vec4(p, 0.0, 1.0); }';

/*
 * One continuous shot, drawn live. uP is the story from 0 (cruising far above
 * a sea of fog at dusk, two bridge towers standing out of it) through the fog
 * to 1 (low over the lights of a foothill town). Nothing here is a photograph.
 *
 * Above the fog, the cloud tops are a height field that the ray is marched
 * against, lit by a low sun so every swell throws a long shadow. Below it,
 * the valley floor is a plane carrying town lights and a road with traffic.
 * All noise comes from one small texture, so a sample costs a single fetch.
 */
export const DESCENT_FRAGMENT = `
precision highp float;
uniform sampler2D uNoise;
uniform vec2 uRes;
uniform float uTime;
uniform float uP;
uniform vec2 uLook;

const float CLOUD = 1.0;
const vec3 SUN = vec3(0.4708, 0.0351, 0.8816);

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

vec2 drift() { return vec2(uTime * 0.006, -uTime * 0.014); }

// The top of the fog: slow swells with smaller billows riding on them.
float swell(vec2 xz) { return fbm3(xz * 0.21 + drift()); }
float cloudLow(vec2 xz) {
  float big = swell(xz);
  return CLOUD + (big - 0.5) * 1.05;
}
float cloudTop(vec2 xz) {
  float big = swell(xz);
  float puffs = fbm(xz * 0.62 + drift() * 2.2 + big * 1.6);
  return CLOUD + (big - 0.5) * 1.05 + (puffs - 0.5) * 0.44;
}

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
vec3 townLights(vec2 g, float t) {
  float town = smoothstep(0.34, 0.6, fbm3(g * 0.21 + 3.0));
  // The town the film lands in sits straight ahead at the end of the descent.
  vec2 home = g - vec2(0.1, 12.2);
  town = max(town, exp(-dot(home, home) * 0.09));
  vec3 sum = vec3(0.0);
  // Two sizes of light: house windows, and streets laid out in a loose grid.
  for (int k = 0; k < 2; k++) {
    float scale = k == 0 ? 5.0 : 11.0;
    vec2 s = g * scale;
    vec2 id = floor(s);
    vec2 f = fract(s) - 0.5;
    float r = hash21(id + float(k) * 19.0);
    vec2 o = (vec2(hash21(id + 3.1), hash21(id + 7.7)) - 0.5) * (k == 0 ? 0.6 : 0.2);
    float d = length(f - o);
    float on = step(k == 0 ? 0.3 : 0.55, r) * town;
    float core = smoothstep(0.12, 0.0, d);
    float glow = 0.02 / (d * d + 0.02);
    vec3 c = mix(vec3(1.0, 0.68, 0.34), vec3(1.0, 0.9, 0.74), hash21(id + 1.3));
    sum += c * on * (core * 1.6 + glow * 0.38) * (k == 0 ? 1.0 : 0.55);
  }
  return sum * exp(-t * 0.045);
}
// A road through the valley, with traffic in both directions.
vec3 road(vec2 g, float t) {
  float centre = 0.9 * sin(g.y * 0.33) + 0.35;
  float d = g.x - centre;
  vec3 c = vec3(1.0, 0.6, 0.3) * smoothstep(0.09, 0.0, abs(d)) * 0.035;
  for (int lane = 0; lane < 2; lane++) {
    float side = lane == 0 ? -1.0 : 1.0;
    float u = g.y * 2.6 + side * uTime * 0.55;
    float car = step(0.55, hash21(vec2(floor(u), float(lane) * 7.0)));
    float along = smoothstep(0.5, 0.0, abs(fract(u) - 0.5) * 2.4);
    float across = smoothstep(0.02, 0.0, abs(d - side * 0.022));
    c += (lane == 0 ? vec3(1.0, 0.95, 0.82) : vec3(1.0, 0.16, 0.12)) * car * along * across * 1.5;
  }
  return c * exp(-t * 0.05);
}

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
float tower(vec3 ro, vec3 rd, vec3 base, out vec3 n) {
  float best = -1.0;
  vec3 nn;
  for (int i = 0; i < 7; i++) {
    vec3 c;
    vec3 b;
    if (i == 0) { c = vec3(-0.25, 1.15, 0.0); b = vec3(0.05, 1.55, 0.065); }
    else if (i == 1) { c = vec3(0.25, 1.15, 0.0); b = vec3(0.05, 1.55, 0.065); }
    else if (i == 2) { c = vec3(0.0, 2.62, 0.0); b = vec3(0.25, 0.085, 0.055); }
    else if (i == 3) { c = vec3(0.0, 2.2, 0.0); b = vec3(0.25, 0.055, 0.045); }
    else if (i == 4) { c = vec3(0.0, 1.78, 0.0); b = vec3(0.25, 0.055, 0.045); }
    else if (i == 5) { c = vec3(0.0, 1.3, 0.0); b = vec3(0.25, 0.05, 0.045); }
    else { c = vec3(0.0, 0.7, 0.0); b = vec3(0.25, 0.045, 0.045); }
    float t = box(ro, rd, base + c, b, nn);
    if (t > 0.0 && (best < 0.0 || t < best)) { best = t; n = nn; }
  }
  return best;
}
vec2 project(vec3 point, vec3 ro, float pitch) {
  vec3 v = point - ro;
  return vec2(v.x, v.y) / max(v.z, 0.001) * 1.25 - vec2(0.0, pitch);
}
// A hanging cable between two screen points, and the suspenders below it.
float cable(vec2 uv, vec2 a, vec2 b, float sag, float deck) {
  float s = clamp((uv.x - a.x) / (b.x - a.x), 0.0, 1.0);
  float y = mix(a.y, b.y, s) - sag * 4.0 * s * (1.0 - s);
  float inside = step(min(a.x, b.x), uv.x) * step(uv.x, max(a.x, b.x));
  float px = 1.4 / uRes.y;
  float main = smoothstep(px * 1.6, px * 0.3, abs(uv.y - y));
  float gap = abs(b.x - a.x) / 26.0;
  float hang = smoothstep(px * 0.9, 0.0, abs(fract(uv.x / gap) - 0.5) * gap) * step(uv.y, y) * step(deck, uv.y) * 0.35;
  return inside * max(main, hang);
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  float p = uP;

  float h = p < 0.45 ? mix(4.3, 2.05, smoothstep(0.0, 0.45, p))
          : p < 0.6 ? mix(2.05, 0.6, (p - 0.45) / 0.15)
          : mix(0.6, 0.24, smoothstep(0.6, 1.0, p));
  float high = smoothstep(1.6, 4.3, h);
  // From altitude the horizon bows, as it does through a wide lens.
  uv.y += 0.085 * high * uv.x * uv.x;

  float pitch = mix(-0.10, 0.035, smoothstep(0.0, 0.5, p)) + 0.03 * smoothstep(0.6, 1.0, p);
  vec3 ro = vec3(uLook.x * 0.3, h, p * 8.5);
  vec3 rd = normalize(vec3(uv.x + uLook.x * 0.025, uv.y + pitch + uLook.y * 0.018, 1.25));
  rd.x = abs(rd.x) < 0.0002 ? 0.0002 : rd.x;

  vec3 haze = mix(sky(normalize(vec3(rd.x, 0.012, rd.z)), high), vec3(0.40, 0.33, 0.60), 0.5);
  vec3 col;
  float tScene = 1e5;

  if (h > CLOUD - 0.2) {
    vec3 above = sky(rd, high);
    above += stars(rd) * smoothstep(0.04, 0.28, rd.y) * (0.3 + 0.7 * high);
    // High cirrus catching the last light.
    if (rd.y > 0.0) {
      vec2 cu = rd.xz / (rd.y + 0.13) * vec2(0.42, 1.6) + drift() * 0.4;
      float cirrus = smoothstep(0.5, 0.82, fbm(cu)) * smoothstep(0.0, 0.07, rd.y) * (1.0 - smoothstep(0.2, 0.46, rd.y));
      above = mix(above, vec3(1.0, 0.52, 0.42), cirrus * 0.42);
    }
    col = above;

    if (rd.y < 0.09) {
      float t = rd.y < 0.0 ? max((CLOUD + 0.8 - ro.y) / rd.y, 0.0) : 0.0;
      float hit = -1.0;
      for (int i = 0; i < 64; i++) {
        vec3 pos = ro + rd * t;
        float dh = pos.y - cloudLow(pos.xz);
        if (dh < 0.004 * t + 0.01) { hit = t; break; }
        t += max(dh * 0.55, 0.03) * (1.0 + t * 0.03);
        if (t > 82.0) break;
      }
      if (hit > 0.0) {
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
        // Light scattering forward through the crests, toward the sun.
        cloud += vec3(1.0, 0.46, 0.24) * pow(max(dot(rd, SUN), 0.0), 6.0) * 0.20 * depth;
        // Towns glowing up through the thin places.
        cloud += vec3(1.0, 0.6, 0.3) * smoothstep(0.42, 0.7, fbm3(pos.xz * 0.21 + 3.0)) * (1.0 - depth) * 0.16;
        cloud = mix(cloud, cloud * vec3(0.78, 0.84, 1.08), high * 0.4);

        float far = 1.0 - exp(-hit * 0.02);
        cloud = mix(cloud, haze, far);
        col = mix(cloud, mix(haze, above, smoothstep(-0.01, 0.02, rd.y)), smoothstep(34.0, 80.0, hit));
      } else if (rd.y < 0.0) {
        col = mix(haze, above, smoothstep(-0.02, 0.0, rd.y));
      }
    }

    // The sun drawn out along the horizon, as a lens would.
    vec2 sunUv = SUN.xy / SUN.z * 1.25 - vec2(uLook.x * 0.025, pitch + uLook.y * 0.018);
    col += vec3(1.0, 0.50, 0.24) * exp(-abs(uv.y - sunUv.y) * 90.0) * exp(-abs(uv.x - sunUv.x) * 2.8) * 0.10;
  } else {
    vec3 dusk = vec3(0.98, 0.50, 0.30);
    if (rd.y > 0.0) {
      float t = (CLOUD - h) / rd.y;
      vec3 pos = ro + rd * t;
      float d = fbm(pos.xz * 0.5 + drift() * 2.0);
      // The ceiling, lit from below by a sun that has slipped under it.
      float under = exp(-rd.y * 5.5) * (0.35 + 0.9 * d);
      vec3 ceiling = mix(vec3(0.07, 0.08, 0.22), vec3(0.30, 0.22, 0.46), d);
      ceiling = mix(ceiling, vec3(1.0, 0.44, 0.30), clamp(under, 0.0, 1.0) * 0.85);
      ceiling = mix(ceiling, dusk, exp(-rd.y * 22.0));
      float s = max(dot(rd, SUN), 0.0);
      ceiling += vec3(1.0, 0.55, 0.28) * pow(s, 40.0) * 0.45;
      col = ceiling;
    } else {
      float t = -h / rd.y;
      tScene = t;
      vec3 pos = ro + rd * t;
      vec3 ground = vec3(0.020, 0.032, 0.095) * (0.75 + 0.6 * fbm3(pos.xz * 0.8));
      ground += townLights(pos.xz, t);
      ground += road(pos.xz, t);
      ground += vec3(1.0, 0.6, 0.32) * smoothstep(0.36, 0.7, fbm3(pos.xz * 0.21 + 3.0)) * 0.05;
      col = mix(ground, mix(dusk, vec3(0.22, 0.16, 0.36), 0.62), 1.0 - exp(-t * 0.06));
    }
    // Foothill ridgelines against the last light, the nearest with a tree line.
    for (int i = 0; i < 5; i++) {
      float fi = float(i);
      float x = rd.x * (2.3 + fi * 1.7) + fi * 7.3 + ro.z * 0.03 * (fi + 1.0);
      float ridge = (fbm3(vec2(x, fi * 3.1)) - 0.36) * (0.16 - fi * 0.024) + (n2(vec2(x * 30.0, fi)) - 0.5) * 0.0022 * step(2.5, fi);
      float edge = smoothstep(ridge + 0.0025, ridge - 0.0025, rd.y);
      vec3 ridgeColor = mix(vec3(0.03, 0.04, 0.115), mix(dusk, vec3(0.34, 0.22, 0.44), 0.55), 0.74 - fi * 0.17);
      col = mix(col, ridgeColor, edge * step(-0.03 - fi * 0.012, rd.y));
    }
  }

  // The two towers of the bridge, with the cable and suspenders between them.
  // On a tall, narrow screen the bridge moves in so both towers stay in frame.
  float inward = clamp((1.6 - uRes.x / uRes.y) * 3.2, 0.0, 3.8);
  vec3 towerA = vec3(5.0 - inward, 0.0, 12.5);
  vec3 towerB = vec3(3.1 - inward, 0.0, 19.0);
  float gone = 1.0 - smoothstep(0.6, 0.7, p);
  for (int i = 0; i < 2; i++) {
    vec3 base = i == 0 ? towerA : towerB;
    vec3 n;
    float t = tower(ro, rd, base, n);
    if (t > 0.0 && t < tScene) {
      float y = ro.y + rd.y * t;
      float lit = clamp(dot(n, normalize(vec3(0.55, 0.25, -0.6))), 0.0, 1.0);
      vec3 steel = mix(vec3(0.20, 0.05, 0.10), vec3(1.0, 0.36, 0.18), 0.25 + 0.75 * lit);
      steel += vec3(1.0, 0.7, 0.45) * pow(lit, 6.0) * 0.25;
      float sink = h > CLOUD ? smoothstep(-0.05, 0.4, y - cloudLow((ro + rd * t).xz)) : (1.0 - smoothstep(CLOUD - 0.5, CLOUD - 0.02, y)) * gone;
      steel = mix(steel, vec3(0.04, 0.04, 0.11), h > CLOUD ? 0.0 : 0.85);
      steel = mix(steel, haze, 1.0 - exp(-t * 0.03));
      col = mix(col, steel, sink);
    }
    vec3 top = base + vec3(0.0, 2.8, 0.0);
    vec3 toTop = top - ro;
    float along = dot(toTop, rd);
    float miss = length(toTop - rd * along);
    float blink = 0.55 + 0.45 * sin(uTime * 1.6 + float(i) * 1.7);
    col += vec3(1.0, 0.14, 0.18) * (0.0005 / (miss * miss + 0.0003)) * blink * step(0.0, along) * step(CLOUD, h);
  }
  if (h > CLOUD) {
    vec2 a = project(towerA + vec3(0.0, 2.66, 0.0), ro, pitch);
    vec2 b = project(towerB + vec3(0.0, 2.66, 0.0), ro, pitch);
    vec2 a2 = project(towerA + vec3(1.6, 1.0, -5.2), ro, pitch);
    vec2 b2 = project(towerB + vec3(-2.6, 1.0, 6.0), ro, pitch);
    float deck = project(towerA + vec3(0.0, 1.25, 0.0), ro, pitch).y;
    float line = cable(uv, a, b, 0.5 * (a.y - deck), min(deck, project(towerB + vec3(0.0, 1.25, 0.0), ro, pitch).y));
    line = max(line, cable(uv, a, a2, 0.0, 9.0) * 0.8);
    line = max(line, cable(uv, b, b2, 0.0, 9.0) * 0.6);
    float seaLine = -pitch - 0.02;
    col = mix(col, vec3(0.92, 0.34, 0.2), line * 0.75 * (1.0 - smoothstep(seaLine - 0.02, seaLine - 0.30, uv.y)) * step(0.5, a.x - b.x + 9.0));
  }

  // Passing through the fog: it streams upward past the lens.
  float through = h > CLOUD ? 1.0 - smoothstep(0.0, 0.62, h - CLOUD) : 1.0 - smoothstep(0.0, 0.38, CLOUD - h);
  float streak = fbm3(vec2(uv.x * 2.6, uv.y * 0.8 + p * 26.0) + drift() * 4.0);
  vec3 fog = mix(vec3(0.70, 0.69, 0.86), vec3(0.90, 0.86, 0.94), streak);
  col = mix(col, fog, through * (0.9 + 0.1 * streak));

  // Lens: a soft shoulder on the highlights, a vignette, a little grain.
  col *= 1.0 - 0.36 * dot(uv, uv);
  col += (hash21(gl_FragCoord.xy + fract(uTime) * 61.0) - 0.5) * 0.02;
  gl_FragColor = vec4(col, 1.0);
}
`;
