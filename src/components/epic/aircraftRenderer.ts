import type { CameraData, FrameRect, Pose } from './airTraffic';
import { poseTan } from './airTraffic';
import { flightBasis, type FlightMotion, type FlightVector } from './flightPhysics';

interface ModelMesh {
  name: string;
  positions: number[];
  normals: number[];
  color: number[];
  roughness: number;
  metallic: number;
  emission: number[];
}
interface MeshBuffers extends Omit<ModelMesh, 'positions' | 'normals'> {
  positions: WebGLBuffer;
  normals: WebGLBuffer;
  count: number;
}
export interface AircraftInstance {
  position: FlightVector;
  motion: FlightMotion;
  age: number;
  alpha: number;
  flash: boolean;
  model?: string;
  /** Body colour for this instance (meshes named CarPaint*), so traffic is not one colour per model. */
  paint?: number[];
  basis?: ReturnType<typeof flightBasis>;
}
export interface ModelWake { points: FlightVector[]; widths: number[]; alpha: number }

const VERTEX = `
attribute vec3 aPosition;
attribute vec3 aNormal;
attribute float aOpacity;
uniform vec3 uPosition, uRight, uForward, uUp;
uniform vec3 uCamera, uCameraRight, uCameraUp, uCameraForward;
uniform vec2 uTan;
varying vec3 vNormal, vView;
varying vec3 vWorld;
varying float vOpacity;
void main() {
  vec3 world = uPosition + uRight * aPosition.x + uForward * aPosition.y + uUp * aPosition.z;
  vec3 relative = world - uCamera;
  float depth = dot(relative, uCameraForward);
  gl_Position = vec4(dot(relative, uCameraRight) / uTan.x, dot(relative, uCameraUp) / uTan.y,
    depth * 1.00004 - 2.00004, depth);
  vNormal = uRight * aNormal.x + uForward * aNormal.y + uUp * aNormal.z;
  vView = -relative;
  vWorld = world;
  vOpacity = aOpacity;
}`;

const FRAGMENT = `
precision highp float;
uniform vec3 uColor, uEmission, uSunDirection, uSunColor, uSkyColor;
uniform float uRoughness, uMetallic, uAlpha, uExposure;
uniform float uFoam, uTime;
varying vec3 vNormal, vView;
varying vec3 vWorld;
varying float vOpacity;
const float PI = 3.14159265;
vec3 aces(vec3 x) { return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14), 0., 1.); }
void main() {
  vec3 N = normalize(vNormal) * (gl_FrontFacing ? 1. : -1.);
  vec3 V = normalize(vView);
  vec3 L = normalize(uSunDirection);
  vec3 H = normalize(V + L);
  float nv = max(dot(N, V), .001), nl = max(dot(N, L), 0.);
  float nh = max(dot(N, H), 0.), vh = max(dot(V, H), 0.);
  float a = max(.035, uRoughness * uRoughness), a2 = a*a;
  float den = nh*nh*(a2-1.)+1.;
  float D = a2/(PI*den*den);
  float k = (uRoughness+1.)*(uRoughness+1.)/8.;
  float G = (nv/(nv*(1.-k)+k))*(nl/(nl*(1.-k)+k));
  vec3 F0 = mix(vec3(.04), uColor, uMetallic);
  vec3 F = F0 + (1.-F0)*pow(1.-vh, 5.);
  vec3 specular = D*G*F/max(4.*nv*max(nl,.001), .001);
  vec3 diffuse = (1.-F)*(1.-uMetallic)*uColor/PI;
  float sky = .3 + .7 * (N.z*.5+.5);
  vec3 light = (diffuse+specular)*uSunColor*nl + uColor*uSkyColor*sky + uEmission;
  vec3 color = pow(aces(light * uExposure), vec3(1./2.2));
  float breakup = mix(1., .25 + .75 * fract(sin(dot(floor(vWorld.xy*.65 + uTime*.15), vec2(127.1,311.7)))*43758.5453), uFoam);
  gl_FragColor = vec4(color, uAlpha * vOpacity * breakup);
}`;

/** Same Blender geometry, shaded and oriented continuously in the film camera. */
export class AircraftRenderer {
  private canvas = document.createElement('canvas');
  private direct = false;
  private gl: WebGLRenderingContext | null;
  private program: WebGLProgram | null = null;
  private models = new Map<string, MeshBuffers[]>();
  private occluders: { buffer: WebGLBuffer; count: number }[] = [];
  private uniforms: Record<string, WebGLUniformLocation | null> = {};
  private attributes = { position: -1, normal: -1, opacity: -1 };
  private wakeBuffers: WebGLBuffer[] = [];
  private abort = new AbortController();

  constructor(modelUrl = '/film/aircraft/airliner.json', directCanvas?: HTMLCanvasElement) {
    if (directCanvas) { this.canvas = directCanvas; this.direct = true; }
    this.gl = this.canvas.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: true, preserveDrawingBuffer: !this.direct });
    const gl = this.gl;
    if (!gl) return;
    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) { gl.deleteShader(shader); return null; }
      return shader;
    };
    const vertex = compile(gl.VERTEX_SHADER, VERTEX);
    const fragment = compile(gl.FRAGMENT_SHADER, FRAGMENT);
    const program = gl.createProgram();
    if (!vertex || !fragment || !program) return;
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) { gl.deleteProgram(program); return; }
    this.program = program;
    gl.useProgram(program);
    this.attributes = { position: gl.getAttribLocation(program, 'aPosition'), normal: gl.getAttribLocation(program, 'aNormal'), opacity: gl.getAttribLocation(program, 'aOpacity') };
    this.wakeBuffers = [gl.createBuffer(), gl.createBuffer()].filter((buffer): buffer is WebGLBuffer => !!buffer);
    this.uniforms = Object.fromEntries(['Position', 'Right', 'Forward', 'Up', 'Camera', 'CameraRight', 'CameraUp', 'CameraForward', 'Tan', 'Color', 'Emission', 'SunDirection', 'SunColor', 'SkyColor', 'Roughness', 'Metallic', 'Alpha', 'Exposure', 'Foam', 'Time'].map(name => [name, gl.getUniformLocation(program, `u${name}`)]));
    fetch(modelUrl, { signal: this.abort.signal })
      .then(response => response.ok ? response.json() as Promise<{ meshes?: ModelMesh[]; models?: Record<string, ModelMesh[]>; occluders?: number[][] }> : null)
      .then(model => {
        if (!model || this.abort.signal.aborted) return;
        for (const [name, meshes] of Object.entries(model.models ?? { airliner: model.meshes ?? [] })) {
        this.models.set(name, meshes.flatMap(mesh => {
          const positions = gl.createBuffer(), normals = gl.createBuffer();
          if (!positions || !normals) return [];
          gl.bindBuffer(gl.ARRAY_BUFFER, positions);
          gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.positions), gl.STATIC_DRAW);
          gl.bindBuffer(gl.ARRAY_BUFFER, normals);
          gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.normals), gl.STATIC_DRAW);
          return [{ ...mesh, positions, normals, count: mesh.positions.length / 3 }];
        }));
        }
        this.occluders = (model.occluders ?? []).flatMap(positions => {
          const buffer = gl.createBuffer();
          if (!buffer) return [];
          gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
          gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
          return [{ buffer, count: positions.length / 3 }];
        });
      })
      .catch(() => undefined);
  }

  get ready() { return !!this.program && [...this.models.values()].some(meshes => meshes.length > 0) && !this.gl?.isContextLost(); }

  clear() {
    if (!this.gl || this.gl.isContextLost()) return;
    this.gl.clearColor(0, 0, 0, 0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
  }

  draw(ctx: CanvasRenderingContext2D, camera: CameraData, pose: Pose, rect: FrameRect, instances: AircraftInstance[], phase: string, wakes: ModelWake[] = [], seconds = 0) {
    const gl = this.gl;
    if (!gl || !this.program || !this.ready) return false;
    if (this.canvas.width !== ctx.canvas.width || this.canvas.height !== ctx.canvas.height) {
      this.canvas.width = ctx.canvas.width; this.canvas.height = ctx.canvas.height;
    }
    gl.useProgram(this.program);
    gl.viewport(Math.round(rect.x), Math.round(this.canvas.height - rect.y - rect.h), Math.round(rect.w), Math.round(rect.h));
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    const vector = (name: string, value: number[]) => gl.uniform3fv(this.uniforms[name], value);
    vector('Camera', pose.p); vector('CameraRight', pose.r); vector('CameraUp', pose.u); vector('CameraForward', pose.f);
    const tanX = poseTan(camera, pose);
    gl.uniform2f(this.uniforms.Tan, tanX, tanX / camera.aspect);
    const day = phase === 'day', night = phase === 'night';
    // Matches film/render.py: golden-hour sunset (sun 6.5 degrees up, warm
    // gold) with a cool blue sky fill, so live traffic sits in the film's light.
    const azimuth = (day ? 200 : 262) * Math.PI / 180, elevation = (day ? 34 : night ? 9 : 6.5) * Math.PI / 180;
    vector('SunDirection', [Math.sin(azimuth)*Math.cos(elevation), Math.cos(azimuth)*Math.cos(elevation), Math.sin(elevation)]);
    vector('SunColor', day ? [2.5, 2.4, 2.25] : night ? [.08, .1, .17] : [3.0, 1.85, .95]);
    vector('SkyColor', day ? [.26, .32, .43] : night ? [.012, .023, .045] : [.42, .42, .52]);
    gl.uniform1f(this.uniforms.Exposure, day ? .9 : night ? 1.6 : .85);
    gl.uniform1f(this.uniforms.Foam, 0); gl.uniform1f(this.uniforms.Time, seconds);
    gl.disableVertexAttribArray(this.attributes.opacity); gl.vertexAttrib1f(this.attributes.opacity, 1);
    // Match the background's opaque land/bridge surfaces in depth only.
    // Traffic can pass behind them without repainting the rendered scenery.
    gl.colorMask(false, false, false, false);
    vector('Position', [0, 0, 0]); vector('Right', [1, 0, 0]); vector('Forward', [0, 1, 0]); vector('Up', [0, 0, 1]);
    gl.disableVertexAttribArray(this.attributes.normal);
    gl.vertexAttrib3f(this.attributes.normal, 0, 0, 1);
    for (const mesh of this.occluders) {
      gl.bindBuffer(gl.ARRAY_BUFFER, mesh.buffer); gl.enableVertexAttribArray(this.attributes.position); gl.vertexAttribPointer(this.attributes.position, 3, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLES, 0, mesh.count);
    }
    gl.colorMask(true, true, true, true);
    // Wakes occupy the water surface and use the same depth mask as hulls.
    // They therefore disappear behind shore/towers rather than crossing land.
    if (wakes.length && this.wakeBuffers.length === 2) {
      gl.uniform1f(this.uniforms.Foam, 1);
      vector('Color', [.82, .86, .89]); vector('Emission', [0, 0, 0]);
      gl.uniform1f(this.uniforms.Roughness, 1); gl.uniform1f(this.uniforms.Metallic, 0);
      gl.depthMask(false);
      for (const wake of wakes) {
        const positions: number[] = [], opacities: number[] = [];
        const rows = wake.points.map((point, index) => {
          const other = wake.points[Math.min(index + 1, wake.points.length - 1)];
          const previous = wake.points[Math.max(0, index - 1)];
          const dx = other[0] - previous[0], dy = other[1] - previous[1], length = Math.hypot(dx, dy) || 1;
          return [-1, 0, 1].map(side => [point[0] - dy / length * wake.widths[index] * side, point[1] + dx / length * wake.widths[index] * side, .16]);
        });
        for (let row = 0; row < rows.length - 1; row++) for (let col = 0; col < 2; col++) {
          for (const [r, c] of [[row, col], [row + 1, col], [row, col + 1], [row, col + 1], [row + 1, col], [row + 1, col + 1]]) {
            positions.push(...rows[r][c]); opacities.push(c === 1 ? (1 - r / (rows.length - 1)) : 0);
          }
        }
        gl.uniform1f(this.uniforms.Alpha, wake.alpha);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.wakeBuffers[0]); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.DYNAMIC_DRAW);
        gl.enableVertexAttribArray(this.attributes.position); gl.vertexAttribPointer(this.attributes.position, 3, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.wakeBuffers[1]); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(opacities), gl.DYNAMIC_DRAW);
        gl.enableVertexAttribArray(this.attributes.opacity); gl.vertexAttribPointer(this.attributes.opacity, 1, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.TRIANGLES, 0, positions.length / 3);
      }
      gl.depthMask(true); gl.uniform1f(this.uniforms.Foam, 0);
      gl.disableVertexAttribArray(this.attributes.opacity); gl.vertexAttrib1f(this.attributes.opacity, 1);
    }
    for (const instance of instances) {
      const basis = instance.basis ?? flightBasis(instance.motion, instance.age);
      vector('Position', instance.position); vector('Right', basis.right); vector('Forward', basis.forward); vector('Up', basis.up);
      gl.uniform1f(this.uniforms.Alpha, instance.alpha);
      for (const mesh of this.models.get(instance.model ?? 'airliner') ?? []) {
        gl.bindBuffer(gl.ARRAY_BUFFER, mesh.positions); gl.enableVertexAttribArray(this.attributes.position); gl.vertexAttribPointer(this.attributes.position, 3, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, mesh.normals); gl.enableVertexAttribArray(this.attributes.normal); gl.vertexAttribPointer(this.attributes.normal, 3, gl.FLOAT, false, 0, 0);
        // Cabin and passenger windows are dark tinted glass by day and glow
        // only from dusk; exported as always-lit, they read as white bands.
        const window = mesh.name === 'CabinLight' || mesh.name === 'AirlinerWindow';
        const glow = window ? (day ? 0 : night ? 1 : 0.15) : 1;
        vector('Color', window ? [.03, .035, .04] : instance.paint && mesh.name.startsWith('CarPaint') ? instance.paint : mesh.color);
        // Lights are actual housing geometry and share the airframe transform
        // and depth buffer. No independently placed screen-space light dots.
        vector('Emission', mesh.name === 'Strobe' && !instance.flash ? [0, 0, 0] : mesh.emission.map((c) => c * glow));
        gl.uniform1f(this.uniforms.Roughness, mesh.roughness);
        gl.uniform1f(this.uniforms.Metallic, mesh.metallic);
        gl.drawArrays(gl.TRIANGLES, 0, mesh.count);
      }
    }
    if (!this.direct) ctx.drawImage(this.canvas, 0, 0);
    if (this.canvas.dataset.modelRenderer !== '3d') this.canvas.dataset.modelRenderer = '3d';
    return true;
  }

  dispose() {
    this.abort.abort();
    for (const meshes of this.models.values()) for (const mesh of meshes) { this.gl?.deleteBuffer(mesh.positions); this.gl?.deleteBuffer(mesh.normals); }
    for (const mesh of this.occluders) this.gl?.deleteBuffer(mesh.buffer);
    for (const buffer of this.wakeBuffers) this.gl?.deleteBuffer(buffer);
    if (this.program) this.gl?.deleteProgram(this.program);
    // React development mode reruns effects on the same visible canvas.
    // Losing its context here made the second renderer permanently blank.
    // Delete owned resources; only discard a canvas this instance created.
    if (!this.direct) this.gl?.getExtension('WEBGL_lose_context')?.loseContext();
    this.models.clear(); this.occluders = []; this.program = null;
  }
}
