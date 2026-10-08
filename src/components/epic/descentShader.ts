export const DESCENT_VERTEX = 'attribute vec2 p; void main() { gl_Position = vec4(p, 0.0, 1.0); }';

/*
 * One continuous shot, drawn live. uP is the story from 0 (cruising far above
 * a sea of fog at dusk, two bridge towers standing out of it) through the fog
 * to 1 (low over the lights of a foothill town). Nothing here is a photograph.
 *
 * The scene is two planes and a few boxes solved analytically, so it costs a
 * handful of noise lookups per pixel and no ray marching.
 */
export const DESCENT_FRAGMENT = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform float uP;
uniform vec2 uLook;

const float CLOUD = 1.0;
const vec3 SUN = vec3(0.4741, 0.0172, 0.8803);

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x),
             mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + vec2(17.1, 9.2); a *= 0.5; }
  return v;
}
float fbm3(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 3; i++) { v += a * noise(p); p = p * 2.03 + vec2(17.1, 9.2); a *= 0.5; }
  return v;
}

vec3 sky(vec3 rd, float high) {
  float y = max(rd.y, 0.0);
  vec3 horizon = vec3(0.97, 0.60, 0.44);
  vec3 band = vec3(0.47, 0.34, 0.62);
  vec3 zenith = mix(vec3(0.07, 0.09, 0.26), vec3(0.008, 0.012, 0.05), high);
  vec3 c = mix(horizon, band, smoothstep(0.0, mix(0.17, 0.09, high), y));
  c = mix(c, zenith, smoothstep(0.05, mix(0.6, 0.34, high), y));
  float s = max(dot(normalize(rd), SUN), 0.0);
  c += vec3(1.0, 0.50, 0.26) * pow(s, 42.0) * 0.34 + vec3(1.0, 0.82, 0.58) * pow(s, 900.0) * 0.9;
  return c;
}
float stars(vec3 rd) {
  vec2 uv = rd.xy / (rd.z + 0.6) * 110.0;
  vec2 id = floor(uv);
  vec2 f = fract(uv) - 0.5;
  float r = hash21(id);
  float star = step(0.982, r) * smoothstep(0.11, 0.0, length(f));
  return star * (0.55 + 0.45 * sin(uTime * 1.3 + r * 80.0));
}
vec3 townLights(vec2 g, float t) {
  float mask = smoothstep(0.36, 0.62, fbm3(g * 0.21 + 3.0));
  vec2 s = g * 5.0;
  vec2 id = floor(s);
  vec2 f = fract(s) - 0.5;
  float r = hash21(id);
  vec2 o = (vec2(hash21(id + 3.1), hash21(id + 7.7)) - 0.5) * 0.6;
  float d = length(f - o);
  float on = step(0.3, r) * mask;
  float core = smoothstep(0.12, 0.0, d);
  float glow = 0.02 / (d * d + 0.02);
  vec3 c = mix(vec3(1.0, 0.70, 0.36), vec3(1.0, 0.90, 0.74), hash21(id + 1.3));
  return c * on * (core * 1.7 + glow * 0.42) * exp(-t * 0.045);
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
  for (int i = 0; i < 6; i++) {
    vec3 c;
    vec3 b;
    if (i == 0) { c = vec3(-0.21, 1.05, 0.0); b = vec3(0.04, 1.3, 0.055); }
    else if (i == 1) { c = vec3(0.21, 1.05, 0.0); b = vec3(0.04, 1.3, 0.055); }
    else if (i == 2) { c = vec3(0.0, 2.27, 0.0); b = vec3(0.21, 0.07, 0.045); }
    else if (i == 3) { c = vec3(0.0, 1.9, 0.0); b = vec3(0.21, 0.05, 0.04); }
    else if (i == 4) { c = vec3(0.0, 1.5, 0.0); b = vec3(0.21, 0.05, 0.04); }
    else { c = vec3(0.0, 0.62, 0.0); b = vec3(0.21, 0.04, 0.04); }
    float t = box(ro, rd, base + c, b, nn);
    if (t > 0.0 && (best < 0.0 || t < best)) { best = t; n = nn; }
  }
  return best;
}
vec2 project(vec3 point, vec3 ro, float pitch) {
  vec3 v = point - ro;
  return vec2(v.x, v.y) / max(v.z, 0.001) * 1.25 - vec2(0.0, pitch);
}
float cable(vec2 uv, vec2 a, vec2 b, float sag) {
  float s = clamp((uv.x - a.x) / (b.x - a.x), 0.0, 1.0);
  float y = mix(a.y, b.y, s) - sag * 4.0 * s * (1.0 - s);
  float inside = step(min(a.x, b.x), uv.x) * step(uv.x, max(a.x, b.x));
  return inside * smoothstep(0.0028, 0.0006, abs(uv.y - y));
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  float p = uP;

  float h = p < 0.45 ? mix(6.2, 1.75, smoothstep(0.0, 0.45, p))
          : p < 0.6 ? mix(1.75, 0.6, (p - 0.45) / 0.15)
          : mix(0.6, 0.075, smoothstep(0.6, 1.0, p));
  float pitch = mix(-0.17, 0.02, smoothstep(0.0, 0.52, p)) + 0.13 * smoothstep(0.6, 1.0, p);
  vec3 ro = vec3(uLook.x * 0.25, h, p * 8.5 + uTime * 0.02 * smoothstep(0.6, 0.75, p));
  vec3 rd = normalize(vec3(uv.x + uLook.x * 0.02, uv.y + pitch + uLook.y * 0.015, 1.25));
  rd.x = abs(rd.x) < 0.0002 ? 0.0002 : rd.x;
  float high = smoothstep(1.4, 6.0, h);
  vec2 drift = vec2(uTime * 0.012, -uTime * 0.03);

  vec3 haze = sky(vec3(rd.x, 0.0, rd.z), high);
  vec3 col;
  float tScene = 1e5;

  if (h > CLOUD) {
    vec3 above = sky(rd, high) + stars(rd) * smoothstep(0.05, 0.3, rd.y) * (0.35 + 0.65 * high);
    if (rd.y < 0.0) {
      float t = (CLOUD - h) / rd.y;
      tScene = t;
      vec3 pos = ro + rd * t;
      vec2 q = pos.xz * 0.5 + drift;
      q += (fbm3(q * 0.6) - 0.5) * 0.9;
      float d = fbm(q);
      float lit = clamp(0.5 + (d - fbm(q + SUN.xz * 0.22)) * 2.6, 0.0, 1.0);
      vec3 cloud = mix(vec3(0.20, 0.21, 0.50), vec3(0.97, 0.69, 0.60), lit);
      cloud += vec3(1.0, 0.86, 0.76) * pow(lit, 5.0) * 0.22;
      cloud = mix(cloud, cloud * vec3(0.72, 0.78, 1.05), high * 0.45);
      float density = smoothstep(0.27, 0.5, d);
      float tg = -h / rd.y;
      vec3 ground = vec3(0.02, 0.035, 0.10) + townLights((ro + rd * tg).xz, tg * 0.4);
      vec3 sea = mix(ground, cloud, density);
      sea = mix(sea, haze * vec3(0.93, 0.9, 1.0), 1.0 - exp(-t * 0.05));
      col = mix(sea, above, smoothstep(-0.012, 0.004, rd.y));
    } else {
      col = above;
    }
  } else {
    vec3 dusk = vec3(0.80, 0.46, 0.40);
    if (rd.y > 0.0) {
      float t = (CLOUD - h) / rd.y;
      vec3 pos = ro + rd * t;
      float d = fbm(pos.xz * 0.55 + drift);
      vec3 under = mix(vec3(0.10, 0.11, 0.28), vec3(0.36, 0.30, 0.52), d);
      under = mix(under, dusk, exp(-rd.y * 11.0) * 0.85);
      col = under;
    } else {
      float t = -h / rd.y;
      tScene = t;
      vec3 pos = ro + rd * t;
      vec3 ground = vec3(0.022, 0.035, 0.10) * (0.8 + 0.5 * fbm3(pos.xz * 0.8));
      ground += townLights(pos.xz, t);
      // The glow a town throws into the haze above it.
      ground += vec3(1.0, 0.62, 0.34) * smoothstep(0.36, 0.7, fbm3(pos.xz * 0.21 + 3.0)) * 0.05;
      col = mix(ground, mix(dusk, vec3(0.2, 0.17, 0.36), 0.55), 1.0 - exp(-t * 0.07));
    }
    // Foothill ridgelines against the last light.
    for (int i = 0; i < 4; i++) {
      float fi = float(i);
      float ridge = (fbm3(vec2(rd.x * (2.6 + fi * 1.9) + fi * 7.3 + ro.z * 0.03 * (fi + 1.0), fi * 3.1)) - 0.36) * (0.13 - fi * 0.022);
      float edge = smoothstep(ridge + 0.003, ridge - 0.003, rd.y);
      vec3 ridgeColor = mix(vec3(0.035, 0.045, 0.13), mix(dusk, vec3(0.3, 0.24, 0.45), 0.6), 0.72 - fi * 0.2);
      col = mix(col, ridgeColor, edge * step(-0.02 - fi * 0.012, rd.y));
    }
  }

  // The two towers of the bridge, and the cable between them.
  vec3 towerA = vec3(1.7, 0.0, 12.5);
  vec3 towerB = vec3(-1.0, 0.0, 18.5);
  for (int i = 0; i < 2; i++) {
    vec3 base = i == 0 ? towerA : towerB;
    vec3 n;
    float t = tower(ro, rd, base, n);
    if (t > 0.0) {
      float y = ro.y + rd.y * t;
      float shade = 0.5 + 0.5 * dot(n, normalize(vec3(0.6, 0.35, -0.4)));
      vec3 steel = mix(vec3(0.30, 0.09, 0.12), vec3(0.98, 0.40, 0.24), shade);
      float show = h > CLOUD
        ? smoothstep(CLOUD - 0.04, CLOUD + 0.42, y)
        : (1.0 - smoothstep(CLOUD - 0.5, CLOUD - 0.02, y)) * step(t, tScene) * (1.0 - smoothstep(0.6, 0.7, p));
      steel = mix(steel, vec3(0.05, 0.05, 0.13), h > CLOUD ? 0.0 : 0.82);
      steel = mix(steel, haze, 1.0 - exp(-t * 0.035));
      col = mix(col, steel, show);
    }
    vec3 top = base + vec3(0.0, 2.42, 0.0);
    vec3 toTop = top - ro;
    float along = dot(toTop, rd);
    float miss = length(toTop - rd * along);
    float blink = 0.6 + 0.4 * sin(uTime * 1.6 + float(i) * 1.7);
    col += vec3(1.0, 0.16, 0.2) * (0.00045 / (miss * miss + 0.0004)) * blink * step(0.0, along) * step(CLOUD, h);
  }
  if (h > CLOUD) {
    vec2 a = project(towerA + vec3(0.0, 2.3, 0.0), ro, pitch);
    vec2 b = project(towerB + vec3(0.0, 2.3, 0.0), ro, pitch);
    vec2 a2 = project(towerA + vec3(2.4, 0.9, -5.0), ro, pitch);
    vec2 b2 = project(towerB + vec3(-2.6, 0.9, 6.0), ro, pitch);
    float line = cable(uv, a, b, 0.42 * abs(a.y - project(towerA + vec3(0.0, 1.0, 0.0), ro, pitch).y));
    line = max(line, cable(uv, a, a2, 0.0) * 0.8);
    line = max(line, cable(uv, b, b2, 0.0) * 0.6);
    float horizonY = -pitch;
    col = mix(col, vec3(0.80, 0.32, 0.22), line * 0.7 * smoothstep(horizonY - 0.34, horizonY - 0.02, uv.y));
  }

  // Passing through the fog.
  float through = h > CLOUD ? 1.0 - smoothstep(0.0, 0.75, h - CLOUD) : 1.0 - smoothstep(0.0, 0.38, CLOUD - h);
  vec3 fog = vec3(0.79, 0.775, 0.90) * (0.93 + 0.1 * fbm3(uv * 2.2 + drift * 3.0));
  col = mix(col, fog, through);

  // Lens: a soft vignette and a little grain.
  col *= 1.0 - 0.32 * dot(uv, uv);
  col += (hash21(gl_FragCoord.xy + fract(uTime) * 61.0) - 0.5) * 0.022;
  gl_FragColor = vec4(col, 1.0);
}
`;
