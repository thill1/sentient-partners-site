import React, { useEffect, useRef } from 'react';

const VERTEX = 'attribute vec2 p; void main() { gl_Position = vec4(p, 0.0, 1.0); }';

/*
 * Fog drawn over the photograph in the photograph's own colours. It opens
 * dense, thins to reveal the bridge, parts around the pointer, and on scroll
 * climbs back over the hill.
 */
const FRAGMENT = `
precision mediump float;
uniform vec2 uRes;
uniform float uTime;
uniform float uClear;
uniform float uRise;
uniform vec3 uPointer;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = p * 2.03 + vec2(17.1, 9.2);
    a *= 0.5;
  }
  return v;
}
vec3 fogColor(float y) {
  vec3 low = vec3(0.353, 0.455, 0.722);
  vec3 mid = vec3(0.561, 0.604, 0.820);
  vec3 high = vec3(0.690, 0.655, 0.816);
  return y < 0.5 ? mix(low, mid, y * 2.0) : mix(mid, high, (y - 0.5) * 2.0);
}
void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float aspect = uRes.x / uRes.y;
  vec2 p = vec2(uv.x * aspect, uv.y);
  vec2 q = p * vec2(1.25, 2.7);
  float warp = fbm(q * 0.8 + vec2(uTime * 0.010, 0.0));
  float n = fbm(q + vec2(uTime * 0.021, uTime * 0.004) + warp * 0.9);

  // The fog bank sits where the photograph's fog is: below the sky, above the hill.
  float band = smoothstep(0.10, 0.42, uv.y) * (1.0 - smoothstep(0.72, 0.96, uv.y));
  float threshold = mix(0.20, 0.60, uClear);
  float strength = mix(0.96, 0.50, uClear);
  float a = smoothstep(threshold, threshold + 0.30, n) * strength * mix(0.5, 1.0, band);
  a = max(a, (1.0 - uClear) * 0.62 * band);

  // The pointer parts it.
  vec2 pointer = vec2(uPointer.x * aspect, uPointer.y);
  float d = distance(p, pointer) + (n - 0.5) * 0.14;
  a *= 1.0 - uPointer.z * (1.0 - smoothstep(0.04, 0.36, d));

  // On scroll the fog climbs back over the hill as the scene leaves.
  float rise = smoothstep(0.0, 1.0, uRise);
  float wall = smoothstep(uv.y - 0.25, uv.y + 0.25, rise * 1.5 - 0.3 + (n - 0.5) * 0.6) * smoothstep(0.0, 0.12, uRise);
  vec3 color = fogColor(max(uv.y, 0.35));
  a = max(a, wall * 0.62);

  gl_FragColor = vec4(color * a, a);
}
`;

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
}

const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);

interface FogCanvasProps {
  /** Seconds before the fog begins to thin. */
  holdSeconds?: number;
  /** Seconds the thinning takes. */
  clearSeconds?: number;
  className?: string;
}

/**
 * Decorative only, and optional: without WebGL, or under reduced motion, it
 * draws nothing and the photograph stands on its own.
 */
export const FogCanvas: React.FC<FogCanvasProps> = ({ holdSeconds = 0.5, clearSeconds = 4.2, className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    if (!canvas || !host) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const gl = canvas.getContext('webgl', { premultipliedAlpha: true, antialias: false, powerPreference: 'low-power' });
    if (!gl) return;

    const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX);
    const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
    const program = gl.createProgram();
    if (!vertex || !fragment || !program) return;
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'p');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(program, 'uRes');
    const uTime = gl.getUniformLocation(program, 'uTime');
    const uClear = gl.getUniformLocation(program, 'uClear');
    const uRise = gl.getUniformLocation(program, 'uRise');
    const uPointer = gl.getUniformLocation(program, 'uPointer');
    gl.clearColor(0, 0, 0, 0);

    // Fog is soft, so half resolution is plenty and keeps this cheap on phones.
    const resize = () => {
      const scale = Math.min(window.devicePixelRatio || 1, 1.5) * 0.5;
      canvas.width = Math.max(2, Math.round(host.clientWidth * scale));
      canvas.height = Math.max(2, Math.round(host.clientHeight * scale));
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);

    const pointer = { x: 0.5, y: 0.5, targetX: 0.5, targetY: 0.5, strength: 0, lastMove: -10 };
    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      const rect = host.getBoundingClientRect();
      pointer.targetX = (event.clientX - rect.left) / rect.width;
      pointer.targetY = 1 - (event.clientY - rect.top) / rect.height;
      pointer.lastMove = performance.now() / 1000;
    };
    host.addEventListener('pointermove', onPointerMove);

    let visible = true;
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    intersection.observe(host);

    const started = performance.now() / 1000;
    let frame = 0;
    const draw = () => {
      frame = requestAnimationFrame(draw);
      if (!visible || document.hidden) return;
      const now = performance.now() / 1000;
      const elapsed = now - started;
      pointer.x += (pointer.targetX - pointer.x) * 0.06;
      pointer.y += (pointer.targetY - pointer.y) * 0.06;
      const wanted = now - pointer.lastMove < 1.6 ? 0.9 : 0;
      pointer.strength += (wanted - pointer.strength) * 0.035;

      const rect = host.getBoundingClientRect();
      const rise = Math.min(1, Math.max(0, -rect.top / Math.max(1, rect.height * 0.85)));
      const clear = easeOut(Math.min(1, Math.max(0, (elapsed - holdSeconds) / clearSeconds)));

      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, elapsed);
      gl.uniform1f(uClear, clear);
      gl.uniform1f(uRise, rise);
      gl.uniform3f(uPointer, pointer.x, pointer.y, pointer.strength);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };
    frame = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      intersection.disconnect();
      host.removeEventListener('pointermove', onPointerMove);
      // The context is left alive: a remount reuses the same canvas and context.
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.deleteProgram(program);
      gl.deleteBuffer(buffer);
    };
  }, [holdSeconds, clearSeconds]);

  return <canvas ref={canvasRef} aria-hidden="true" className={`pointer-events-none absolute inset-0 h-full w-full ${className}`} />;
};
