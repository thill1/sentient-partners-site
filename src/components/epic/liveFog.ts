/**
 * Depth-aware volumetric marine fog, ray-marched live over a fog-free plate.
 *
 * For every pixel the film camera's viewing ray is rebuilt from the exported
 * pose and lens (public/film/camera.json). The ray is marched through a 3D
 * density field in world metres and stops at the scene's own depth (a
 * geometry depth map rendered from the same camera as the clean plate), so
 * fog in front of the bridge hides it, fog behind stays behind it, and an
 * opening in the bank shows the real scenery under it.
 *
 * The field is advected by a steady west-to-east wind on its own clock, so it
 * keeps moving at rest and scrolling backward never reverses it. Broad banks,
 * a separate broad field of openings, a lower bank beneath the roadway and
 * sparse high strands; restrained fine detail. Light: cool sky ambient plus
 * champagne sun from the scene's sun direction, with two density samples
 * toward the sun for self-shadowing. Noise lives in one tileable texture read
 * at incommensurate scales, so it is cheap and does not visibly repeat.
 */
import type { CameraData, FrameRect, Pose } from './airTraffic';
import { NOISE_SEED, NOISE_SIZE, noiseTexture } from './fogField';

const VERTEX = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

const FRAGMENT = `
precision highp float;
uniform sampler2D uNoise, uDepth;
uniform vec2 uCanvas, uTan;
uniform vec4 uRect;
uniform vec3 uCamP, uCamR, uCamU, uCamF, uSun, uSunCol, uAmbient, uDeep;
uniform vec2 uWind;
uniform float uTime, uAlpha, uSeed;

// Smoothstepped texel coordinates: the hardware's bilinear filter becomes C1,
// which removes the faceted, speckled look plain bilinear noise gives.
const float NS = 256.0;
float tex(vec2 p, int c) {
  vec2 x = p * NS + 0.5;
  vec2 i = floor(x), f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  vec4 v = texture2D(uNoise, (i + f - 0.5) / NS);
  return c == 0 ? v.r : c == 1 ? v.g : c == 2 ? v.b : v.a;
}
// Log-encoded distance along the ray, 24 bits in RGB; 1.0 means sky.
float sceneDistance(vec2 uv) {
  vec3 e = texture2D(uDepth, uv).rgb;
  float n = dot(e, vec3(1.0, 1.0 / 255.0, 1.0 / 65025.0));
  return n > 0.9999 ? 1.0e6 : exp(mix(log(5.0), log(60000.0), n));
}

// Density in world metres; q is the wind-advected position.
float density(vec3 p, float t, out float cover) {
  vec2 q = p.xy - uWind * uTime;
  // Slow domain deformation: banks bend and change shape as they travel.
  vec2 w = vec2(tex(q / 9100.0 + uSeed, 3), tex(q / 8300.0 + 0.37 + uSeed, 3)) - 0.5;
  vec2 xy = q + w * 1100.0 + vec2(uTime * 0.6, -uTime * 0.4);
  float bank = tex(xy / 6200.0 + uSeed * 0.71, 0) * 0.7 + tex(xy / 2350.0 + 0.19, 0) * 0.3;
  // Openings at two scales: broad clearings, and smaller holes and lanes
  // that read from close by (one broad field left the near top flat).
  float open = tex(xy / 7900.0 + uSeed * 1.3 + 0.53, 1) * 0.6 + tex(xy / 2100.0 + uSeed * 0.9 + 0.29, 1) * 0.4;
  float detail = tex(xy / 760.0 + vec2(p.z / 640.0, -p.z / 910.0) + 0.11, 2);
  // Main marine layer: base ~105-120 m, a rolling top between ~150 and 230 m.
  float top = 148.0 + 82.0 * bank + 22.0 * (detail - 0.5);
  float base = 104.0 + 18.0 * open;
  // Fine detail fades with distance so far banks stay smooth, not speckled.
  float near = 1.0 - smoothstep(1500.0, 6000.0, t);
  detail = mix(0.5, detail, near);
  // Rolling relief on the top: domes and troughs that catch the low sun.
  float dome = tex(xy / 1300.0 + 0.47, 3);
  top = 140.0 + 82.0 * bank + 48.0 * (dome - 0.5) + 22.0 * (detail - 0.5);
  float upper = smoothstep(base, base + 28.0, p.z) * (1.0 - smoothstep(top - 38.0, top, p.z));
  cover = smoothstep(0.3, 0.55, bank * 0.82 + detail * 0.18) * smoothstep(0.26, 0.46, open);
  float d = upper * cover * (0.62 + 0.38 * detail);
  // A separate lower bank beneath the 67.6 m roadway.
  float lowCover = smoothstep(0.44, 0.7, tex(xy / 3300.0 + 0.61, 0));
  float low = smoothstep(4.0, 16.0, p.z) * (1.0 - smoothstep(40.0, 56.0, p.z)) * lowCover;
  d += low * 0.85;
  // Sparse high strands the camera passes through on the way down.
  // Delicate strands near the camera only: far away they read as speckle.
  float strand = smoothstep(0.58, 0.82, tex(xy / 1450.0 + vec2(p.z / 520.0, p.z / 770.0) + 0.83, 2));
  float high = smoothstep(260.0, 330.0, p.z) * (1.0 - smoothstep(620.0, 860.0, p.z)) * strand * (1.0 - smoothstep(600.0, 1800.0, t));
  d += high * 0.12;
  // The marine layer stops short of the city, east of the Bay.
  float east = 1.0 - smoothstep(2300.0, 4600.0, p.x + 1400.0 * (open - 0.5));
  return d * east;
}

float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

void main() {
  vec2 frag = vec2(gl_FragCoord.x, uCanvas.y - gl_FragCoord.y);
  vec2 uv = (frag - uRect.xy) / uRect.zw;
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) { gl_FragColor = vec4(0.0); return; }
  vec2 ndc = vec2(uv.x * 2.0 - 1.0, 1.0 - uv.y * 2.0);
  vec3 dir = normalize(uCamF + uCamR * ndc.x * uTan.x + uCamU * ndc.y * uTan.y);
  float hit = sceneDistance(uv);

  // Only the slab that holds fog (sea level to 900 m) is marched.
  float t0 = 0.0, t1 = hit;
  if (abs(dir.z) > 1e-4) {
    float a = (0.0 - uCamP.z) / dir.z, b = (900.0 - uCamP.z) / dir.z;
    t0 = max(0.0, min(a, b));
    t1 = min(hit, max(a, b));
  }
  t1 = min(t1, 14000.0);
  if (t1 <= t0) { gl_FragColor = vec4(0.0); return; }

  // Steps grow with distance: fine near the camera, coarse far away (where
  // equal steps hundreds of metres long showed as streaks and speckle).
  const int STEPS = 56;
  float span = t1 - t0;
  float jitter = 0.25 * hash(gl_FragCoord.xy);
  float trans = 1.0;
  vec3 light = vec3(0.0);
  float mu = dot(dir, uSun);
  float phase = 0.75 + 0.9 * pow(max(mu, 0.0), 6.0);   // forward-scatter glow toward the sun
  for (int i = 0; i < STEPS; i++) {
    float u0 = (float(i) + jitter) / float(STEPS), u1 = (float(i) + 1.0 + jitter) / float(STEPS);
    float t = t0 + span * pow(u0, 1.7);
    float dt = span * (pow(min(u1, 1.0), 1.7) - pow(u0, 1.7));
    vec3 p = uCamP + dir * t;
    float cover;
    float d = density(p, t, cover);
    if (d > 0.002) {
      float sigma = d * (p.z < 60.0 ? 0.018 : p.z > 250.0 ? 0.006 : 0.024);
      float opacity = 1.0 - exp(-sigma * dt);
      // Self-shadowing: how much fog lies toward the sun.
      float c1, c2;
      float toward = density(p + uSun * 45.0, t, c1) * 45.0 + density(p + uSun * 140.0, t, c2) * 95.0;
      float sunlit = exp(-toward * 0.024);
      float height = clamp((p.z - 100.0) / 130.0, 0.0, 1.0);
      vec3 colour = mix(uDeep, uAmbient, 0.3 + 0.55 * height) + uSunCol * sunlit * phase * 0.38;
      light += trans * opacity * colour;
      trans *= 1.0 - opacity;
      if (trans < 0.02) break;
    }
  }
  float a = (1.0 - trans) * uAlpha;
  // Soft shoulder: bright tops roll off instead of clipping to flat white.
  vec3 c = light / max(a, 1e-4);
  c = c / (1.0 + max(vec3(0.0), c - 0.82) * 1.6);
  gl_FragColor = vec4(c * a * uAlpha, a * uAlpha);
}`;

export interface FogLook { sun: [number, number, number]; sunColour: [number, number, number]; ambient: [number, number, number]; deep: [number, number, number] }

const sunFrom = (azimuth: number, elevation: number): [number, number, number] => {
  const az = azimuth * Math.PI / 180, el = elevation * Math.PI / 180;
  return [Math.sin(az) * Math.cos(el), Math.cos(az) * Math.cos(el), Math.sin(el)];
};

/** Sun directions match film/render.py; colours are cool silver fog under warm sun. */
export const FOG_LOOKS: Record<'sunset' | 'day' | 'night', FogLook> = {
  sunset: { sun: sunFrom(262, 6.5), sunColour: [1.0, 0.8, 0.58], ambient: [0.74, 0.77, 0.84], deep: [0.46, 0.5, 0.6] },
  day: { sun: sunFrom(200, 34), sunColour: [0.95, 0.94, 0.9], ambient: [0.84, 0.86, 0.9], deep: [0.6, 0.64, 0.72] },
  night: { sun: sunFrom(262, 9), sunColour: [0.22, 0.26, 0.36], ambient: [0.18, 0.2, 0.28], deep: [0.07, 0.08, 0.13] },
};

/**
 * World wind, metres a second, west to east with a little northerly set.
 * Stronger than a real marine push (~10-15 m/s) on purpose: the main bank is
 * 5-10 km from the opening camera, where real speeds barely move on screen;
 * this gives the 5-12 CSS px/s drift the owner specified.
 */
export const FOG_WIND: [number, number] = [40, -7];

export class LiveFog {
  private gl: WebGLRenderingContext | null;
  private program: WebGLProgram | null = null;
  private noise: WebGLTexture | null = null;
  private depth: WebGLTexture | null = null;
  private depthUrl = '';
  private depthReady = false;
  /** Key of the depth map now in the texture (the frame it belongs to). */
  depthKey = '';
  private uniforms: Record<string, WebGLUniformLocation | null> = {};
  private visible = false;
  private seed: number;

  constructor(private canvas: HTMLCanvasElement) {
    const forced = Number(new URLSearchParams(window.location.search).get('fogSeed'));
    this.seed = Number.isFinite(forced) && forced > 0 ? forced : Math.floor(Math.random() * 1e6) + 1;
    this.gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false });
    const gl = this.gl;
    if (!gl) return;
    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) { console.warn('liveFog shader:', gl.getShaderInfoLog(shader)); return null; }
      return shader;
    };
    const vertex = compile(gl.VERTEX_SHADER, VERTEX);
    const fragment = compile(gl.FRAGMENT_SHADER, FRAGMENT);
    const program = gl.createProgram();
    if (!vertex || !fragment || !program) return;
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    this.program = program;
    gl.useProgram(program);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'aPos');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    for (const name of ['Noise', 'Depth', 'Canvas', 'Tan', 'Rect', 'CamP', 'CamR', 'CamU', 'CamF', 'Sun', 'SunCol', 'Ambient', 'Deep', 'Wind', 'Time', 'Alpha', 'Seed']) {
      this.uniforms[name] = gl.getUniformLocation(program, `u${name}`);
    }
    const size = NOISE_SIZE;
    this.noise = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.noise);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, noiseTexture(size, NOISE_SEED));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    this.depth = gl.createTexture();
  }

  /** The deterministic seed in use (for review captures). */
  get fogSeed() { return this.seed; }

  /** The seed as the shader sees it (uSeed), for the CPU mirror in fogField.ts. */
  get shaderSeed() { return (this.seed % 997) / 997; }

  /** Depth map for the frame on screen; until it has loaded nothing is drawn. */
  setDepth(url: string, image?: HTMLImageElement | ImageBitmap) {
    if (url === this.depthUrl && this.depthReady) return;
    this.depthUrl = url;
    this.depthReady = false;
    const upload = (source: HTMLImageElement | ImageBitmap) => {
      const gl = this.gl;
      if (!gl || this.depthUrl !== url) return;
      gl.bindTexture(gl.TEXTURE_2D, this.depth);
      // Depth is encoded in RGB: no colour conversion, no filtering across edges.
      gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      this.depthReady = true;
      this.depthKey = url;
    };
    if (image) { upload(image); return; }
    const loader = new Image();
    loader.onload = () => upload(loader);
    loader.src = url;
  }

  get ready() { return !!this.program && this.depthReady; }

  clear() {
    const gl = this.gl;
    if (gl && this.visible) { gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); this.visible = false; }
  }

  /** rect is in the film canvas's pixels; the fog renders at 1x CSS resolution. */
  draw(filmCanvas: HTMLCanvasElement, rect: FrameRect, camera: CameraData, pose: Pose, seconds: number, alpha: number, look: FogLook) {
    const gl = this.gl;
    if (!gl || !this.program || !this.depthReady || alpha <= 0.01) { this.clear(); return; }
    const width = Math.max(2, Math.round(this.canvas.clientWidth));
    const height = Math.max(2, Math.round(this.canvas.clientHeight));
    if (this.canvas.width !== width || this.canvas.height !== height) { this.canvas.width = width; this.canvas.height = height; }
    const scale = width / Math.max(1, filmCanvas.width);
    const tanX = Math.tan(camera.fov / 2);
    gl.viewport(0, 0, width, height);
    gl.useProgram(this.program);
    const u = this.uniforms;
    gl.uniform2f(u.Canvas, width, height);
    gl.uniform2f(u.Tan, tanX, tanX / camera.aspect);
    gl.uniform4f(u.Rect, rect.x * scale, rect.y * scale, rect.w * scale, rect.h * scale);
    gl.uniform3fv(u.CamP, pose.p); gl.uniform3fv(u.CamR, pose.r); gl.uniform3fv(u.CamU, pose.u); gl.uniform3fv(u.CamF, pose.f);
    gl.uniform3fv(u.Sun, look.sun); gl.uniform3fv(u.SunCol, look.sunColour); gl.uniform3fv(u.Ambient, look.ambient); gl.uniform3fv(u.Deep, look.deep);
    gl.uniform2fv(u.Wind, FOG_WIND);
    gl.uniform1f(u.Time, seconds);
    gl.uniform1f(u.Alpha, alpha);
    gl.uniform1f(u.Seed, this.shaderSeed);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.noise); gl.uniform1i(u.Noise, 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.depth); gl.uniform1i(u.Depth, 1);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    this.visible = true;
  }

  dispose() {
    const gl = this.gl;
    if (!gl) return;
    if (this.noise) gl.deleteTexture(this.noise);
    if (this.depth) gl.deleteTexture(this.depth);
    if (this.program) gl.deleteProgram(this.program);
    this.program = null;
  }
}
