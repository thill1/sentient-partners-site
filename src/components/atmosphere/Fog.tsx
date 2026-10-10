import { useEffect, useRef } from "react";

const vertex = `attribute vec2 a_position; varying vec2 v_uv;
void main(){v_uv=a_position*.5+.5;gl_Position=vec4(a_position,0.,1.);}`;
const fragment = `precision mediump float;
varying vec2 v_uv; uniform float u_time; uniform float u_progress; uniform float u_depth; uniform float u_aspect;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*noise(p);p=mat2(.8,-.6,.6,.8)*p*2.03+7.1;a*=.5;}return v;}
void main(){
 vec2 uv=v_uv; vec2 p=vec2(uv.x*u_aspect,uv.y)*2.8;
 float t=u_time*.024; p+=vec2(t*(.45+u_depth*.3),t*.08+u_progress*.65);
 vec2 warp=vec2(fbm(p+vec2(t*.2,3.4)),fbm(p*1.1+vec2(9.1,-t*.13)));
 float n=fbm(p+warp*2.4); float w=fbm(p*3.2+warp+t*.1);
 float bank=exp(-pow((uv.y-(.42+u_depth*.13-u_progress*.2))*2.6,2.));
 float density=smoothstep(.24,.65,n*.82+w*.18)*bank;
 float alpha=density*(.95-u_progress*.45)*(u_depth<.5?.8:.95);
 vec3 color=mix(vec3(.46,.55,.61),vec3(.83,.84,.81),n);
 gl_FragColor=vec4(color*alpha,alpha);
}`;

/** Two small canvases place continuously evolving weather on either side of the bridge. */
export default function Fog({
  depth,
  progress,
  paused,
}: {
  depth: number;
  progress: React.MutableRefObject<number>;
  paused: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const clock = useRef(0);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || paused) return;
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
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };
    const vs = compile(gl.VERTEX_SHADER, vertex),
      fs = compile(gl.FRAGMENT_SHADER, fragment);
    const program = gl.createProgram();
    if (!vs || !fs || !program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );
    const position = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const time = gl.getUniformLocation(program, "u_time");
    const camera = gl.getUniformLocation(program, "u_progress");
    gl.uniform1f(gl.getUniformLocation(program, "u_depth"), depth);
    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      canvas.width = Math.min(760, bounds.width * 0.6);
      canvas.height = Math.round(
        (canvas.width * bounds.height) / Math.max(1, bounds.width),
      );
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform1f(
        gl.getUniformLocation(program, "u_aspect"),
        bounds.width / Math.max(1, bounds.height),
      );
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    let visible = true,
      frame = 0,
      previous = 0;
    const draw = (now: number) => {
      frame = requestAnimationFrame(draw);
      if (now - previous < 42) return;
      const delta = Math.min(100, now - previous);
      previous = now;
      clock.current += delta / 1000;
      gl.uniform1f(time, clock.current);
      gl.uniform1f(camera, progress.current);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      if (visible && !document.hidden) {
        previous = performance.now();
        frame = requestAnimationFrame(draw);
      }
    };
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      schedule();
    });
    intersection.observe(canvas);
    document.addEventListener("visibilitychange", schedule);
    schedule();
    const lost = (event: Event) => {
      event.preventDefault();
      cancelAnimationFrame(frame);
      canvas.style.opacity = "0";
    };
    canvas.addEventListener("webglcontextlost", lost);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      intersection.disconnect();
      document.removeEventListener("visibilitychange", schedule);
      canvas.removeEventListener("webglcontextlost", lost);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    };
  }, [depth, paused, progress]);
  return (
    <canvas
      ref={ref}
      className={`fog fog-${depth === 0 ? "rear" : "front"}`}
      aria-hidden="true"
    />
  );
}
