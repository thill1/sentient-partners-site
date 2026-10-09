/**
 * Live fog over the held opening frame: soft wisps that drift west to east
 * across the rendered fog bank, continuously and never repeating.
 *
 * The rendered film's fog is baked into its frames, so at rest it used to
 * come from a 3.2 s loop clip that jumped back and drifted ~70 m/s. This
 * draws the motion live instead: domain-warped noise laid out on the fog
 * bank's own surface (so wisps shrink and slow toward the horizon), advected
 * by a slow wind, lit with champagne highlights and cool blue-grey shadows,
 * and confined to where the scene has fog (blue channel of the shot's mask,
 * film/export_traffic_mask.py). Rendered at 1x for cost; fog is soft.
 */
import type { FrameRect } from './airTraffic';

const VERTEX = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

const FRAGMENT = `
precision highp float;
uniform sampler2D uMask;
uniform vec2 uCanvas;
uniform vec4 uRect;      // frame rectangle in canvas pixels (x, y from top, w, h)
uniform float uTime, uAlpha, uHorizon, uSeed;
uniform vec2 uWind;      // fog-surface units per second
uniform vec3 uLight, uShade;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7)) + uSeed) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int k = 0; k < 5; k++) { v += a * noise(p); p = p * 2.03 + vec2(17.1, 9.2); a *= 0.5; }
  return v;
}

void main() {
  vec2 frag = vec2(gl_FragCoord.x, uCanvas.y - gl_FragCoord.y);
  vec2 uv = (frag - uRect.xy) / uRect.zw;
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0 || uv.y <= uHorizon + 0.01) { gl_FragColor = vec4(0.0); return; }
  float fog = texture2D(uMask, uv).b;
  if (fog < 0.01) { gl_FragColor = vec4(0.0); return; }

  // Lay the noise on the fog bank's surface: depth grows toward the horizon.
  float depth = 1.0 / (uv.y - uHorizon);
  vec2 surface = vec2((uv.x - 0.5) * (uRect.z / uRect.w) * depth * 2.2, depth * 1.4);
  vec2 drift = uWind * uTime;

  // Domain warp: the wisps curl and evolve as they drift instead of sliding.
  vec2 q = surface * 0.9 + drift;
  vec2 warp = vec2(fbm(q + vec2(0.0, uTime * 0.012)), fbm(q + vec2(5.2, 1.3) - uTime * 0.009));
  float n = fbm(q * 1.6 + warp * 1.8 + drift * 0.35);
  float fine = fbm(q * 4.0 + warp * 2.5 + drift * 1.2);

  // Thin streamers, denser in some places, open in others.
  float wisp = smoothstep(0.48, 0.78, n) * (0.65 + 0.35 * fine);
  // Lit tops toward champagne, the hollows cool blue-grey.
  float lift = smoothstep(0.55, 0.85, n + fine * 0.25);
  vec3 colour = mix(uShade, uLight, lift);
  // Fade with distance so the horizon stays crisp, and near the frame edge.
  float far = smoothstep(0.0, 0.18, uv.y - uHorizon);
  float a = wisp * fog * far * uAlpha * 0.42;
  gl_FragColor = vec4(colour * a, a);
}`;

export interface FogLook { light: [number, number, number]; shade: [number, number, number] }

export const FOG_LOOKS: Record<'sunset' | 'day' | 'night', FogLook> = {
  sunset: { light: [1.0, 0.88, 0.74], shade: [0.6, 0.66, 0.78] },
  day: { light: [0.98, 0.98, 0.97], shade: [0.72, 0.77, 0.86] },
  night: { light: [0.42, 0.47, 0.6], shade: [0.1, 0.12, 0.2] },
};

export class LiveFog {
  private gl: WebGLRenderingContext | null;
  private program: WebGLProgram | null = null;
  private mask: WebGLTexture | null = null;
  private maskReady = false;
  private uniforms: Record<string, WebGLUniformLocation | null> = {};
  private seed = Math.random() * 100;

  constructor(private canvas: HTMLCanvasElement, maskUrl: string) {
    this.gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false });
    const gl = this.gl;
    if (!gl) return;
    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
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
    for (const name of ['Mask', 'Canvas', 'Rect', 'Time', 'Alpha', 'Horizon', 'Seed', 'Wind', 'Light', 'Shade']) {
      this.uniforms[name] = gl.getUniformLocation(program, `u${name}`);
    }
    this.mask = gl.createTexture();
    const image = new Image();
    image.onload = () => {
      if (!this.mask) return;
      gl.bindTexture(gl.TEXTURE_2D, this.mask);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      this.maskReady = true;
    };
    image.src = maskUrl;
  }

  private visible = false;

  /** rect is in the film canvas's pixels; this canvas may be lower resolution. */
  draw(filmCanvas: HTMLCanvasElement, rect: FrameRect, seconds: number, alpha: number, horizon: number, wind: [number, number], look: FogLook) {
    const gl = this.gl;
    if (!gl || !this.program || !this.maskReady) return;
    if (alpha <= 0.01) {
      if (this.visible) { gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); this.visible = false; }
      return;
    }
    // 1x CSS resolution: soft fog does not need Retina pixels.
    const width = Math.max(2, Math.round(this.canvas.clientWidth));
    const height = Math.max(2, Math.round(this.canvas.clientHeight));
    if (this.canvas.width !== width || this.canvas.height !== height) { this.canvas.width = width; this.canvas.height = height; }
    const scale = width / Math.max(1, filmCanvas.width);
    gl.viewport(0, 0, width, height);
    gl.useProgram(this.program);
    gl.uniform2f(this.uniforms.Canvas, width, height);
    gl.uniform4f(this.uniforms.Rect, rect.x * scale, rect.y * scale, rect.w * scale, rect.h * scale);
    gl.uniform1f(this.uniforms.Time, seconds);
    gl.uniform1f(this.uniforms.Alpha, alpha);
    gl.uniform1f(this.uniforms.Horizon, horizon);
    gl.uniform1f(this.uniforms.Seed, this.seed);
    gl.uniform2f(this.uniforms.Wind, wind[0], wind[1]);
    gl.uniform3fv(this.uniforms.Light, look.light);
    gl.uniform3fv(this.uniforms.Shade, look.shade);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.mask);
    gl.uniform1i(this.uniforms.Mask, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    this.visible = true;
  }
}
