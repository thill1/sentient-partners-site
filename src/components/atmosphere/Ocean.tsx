import { useEffect, useRef } from "react";

const vertex = `
attribute vec2 a_position;
varying vec2 v_uv;
void main() {
  v_uv = a_position * .5 + .5;
  gl_Position = vec4(a_position, 0., 1.);
}`;

const fragment = `
precision highp float;
varying vec2 v_uv;
uniform sampler2D u_bay;
uniform vec2 u_size, u_offset;
uniform float u_scale, u_time;

void main() {
  // The same cover projection as the photograph, in artwork pixels.
  vec2 pixel = vec2(v_uv.x, 1. - v_uv.y) * u_size;
  vec2 art = (pixel - u_offset) / u_scale;
  // All shoreline and baked distant mist are above row 465. The bridge and
  // foreground land are a separate photographic layer above this canvas.
  float water = smoothstep(465., 535., art.y);
  if (water <= 0.) { gl_FragColor = vec4(0.); return; }
  float depth = clamp((art.y - 430.) / 594., 0., 1.);
  float t = u_time;
  // Perspective shortens the distance between ripples toward the horizon.
  // Bent, crossing wave fronts break up the light instead of sliding the
  // entire photograph back and forth.
  float row = log(1. + max(0., art.y - 430.) / 120.) * 70.;
  float bend = sin(art.x * .012 + row * .14) * 1.4;
  float a = sin(row + bend - t * 1.45);
  float b = sin(row * 1.73 - art.x * .021 + sin(row * .23) + t * .85);
  float c = sin(row * .57 + art.x * .014 - t * .67);
  vec2 drift = vec2(a * 1.8 + b * .9, b * .7 + c * .55);
  drift *= (.7 + depth * 2.3) * water;
  vec2 uv = (art + drift) / vec2(1536., 1024.);
  vec3 color = texture2D(u_bay, clamp(uv, vec2(.001), vec2(.999))).rgb;
  // Moving wave faces catch and lose light. Broken crests are strongest on
  // existing highlights, preserving the photograph's color and water detail.
  float light = dot(color, vec3(.2126, .7152, .0722));
  float faces = a * .065 + b * .04 + c * .025;
  float crest = pow(max(0., a * .65 + b * .35), 5.);
  float broken = .5 + .5 * sin(art.x * .048 + row * .7 + c);
  color *= 1. + faces * (.45 + depth) * water;
  color += color * crest * broken * (.12 + light * .28) * water;
  gl_FragColor = vec4(color * water, water);
}`;

/** A moving photographic water layer beneath the scene's existing color grades. */
export default function Ocean() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", {
      alpha: true,
      antialias: false,
      depth: false,
      powerPreference: "low-power",
    });
    if (!gl) return;
    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
      gl.deleteShader(shader);
      return null;
    };
    const vs = compile(gl.VERTEX_SHADER, vertex);
    const fs = compile(gl.FRAGMENT_SHADER, fragment);
    const program = gl.createProgram();
    const buffer = gl.createBuffer();
    const texture = gl.createTexture();
    const release = () => {
      gl.deleteTexture(texture);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    };
    if (!vs || !fs || !program || !buffer || !texture) {
      release();
      return;
    }
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      release();
      return;
    }
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const timeUniform = gl.getUniformLocation(program, "u_time");
    const image = new Image();
    let ready = false, visible = true, frame = 0, previous = 0, elapsed = 0;
    const render = () => {
      if (!ready || gl.isContextLost()) return;
      gl.uniform1f(timeUniform, elapsed);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    };
    const draw = (time: number) => {
      frame = requestAnimationFrame(draw);
      if (time - previous < 40) return;
      elapsed += previous ? (time - previous) / 1000 : 0;
      previous = time;
      render();
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      previous = 0;
      if (ready && visible && !document.hidden && !gl.isContextLost())
        frame = requestAnimationFrame(draw);
    };
    const resize = () => {
      const width = canvas.clientWidth, height = canvas.clientHeight;
      if (!width || !height) return;
      const ratio = Math.min(devicePixelRatio, 1.25, 1800 / width);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      gl.viewport(0, 0, canvas.width, canvas.height);
      const bay = canvas.closest(".scene")?.querySelector(".scene-bay");
      const focus = bay ? getComputedStyle(bay).objectPosition.split(" ") : ["64%", "48%"];
      const fraction = (value: string) => value === "center" ? .5 : parseFloat(value) / 100;
      const scale = Math.max(width / 1536, height / 1024);
      gl.uniform2f(gl.getUniformLocation(program, "u_size"), width, height);
      gl.uniform2f(gl.getUniformLocation(program, "u_offset"),
        (width - 1536 * scale) * fraction(focus[0]),
        (height - 1024 * scale) * fraction(focus[1]));
      gl.uniform1f(gl.getUniformLocation(program, "u_scale"), scale);
      render();
    };
    image.onload = () => {
      if (gl.isContextLost()) return;
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
      ready = true;
      canvas.dataset.ready = "true";
      resize();
      schedule();
    };
    image.src = "/atmosphere/bay.webp";
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      schedule();
    });
    intersection.observe(canvas);
    const lost = () => {
      cancelAnimationFrame(frame);
      canvas.style.opacity = "0";
      canvas.dataset.ready = "false";
    };
    canvas.addEventListener("webglcontextlost", lost);
    document.addEventListener("visibilitychange", schedule);
    return () => {
      cancelAnimationFrame(frame);
      image.onload = null;
      observer.disconnect();
      intersection.disconnect();
      canvas.removeEventListener("webglcontextlost", lost);
      document.removeEventListener("visibilitychange", schedule);
      release();
    };
  }, []);
  return <canvas ref={ref} className="scene-ocean" aria-hidden="true" />;
}
