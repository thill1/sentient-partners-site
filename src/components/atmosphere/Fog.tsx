import { useEffect, useRef } from "react";
import { activeScene, type Scene } from "./sceneTime";

/** Global fog tempo: scales drift, shape evolution and gust cadence together. */
const FOG_SPEED = 0.9;

const vertex = `attribute vec2 a_position; varying vec2 v_uv;
void main(){v_uv=a_position*.5+.5;gl_Position=vec4(a_position,0.,1.);}`;
const fragment = `precision highp float;
varying vec2 v_uv;
uniform float u_time, u_progress, u_depth;
uniform vec2 u_size;
uniform vec3 u_tint, u_warm;
uniform float u_warmth, u_sunx, u_density;
uniform vec2 u_wind, u_wdir;
uniform float u_seed, u_octaves;
float hash3(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
float noise3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
 return mix(mix(mix(hash3(i),hash3(i+vec3(1,0,0)),f.x),mix(hash3(i+vec3(0,1,0)),hash3(i+vec3(1,1,0)),f.x),f.y),
  mix(mix(hash3(i+vec3(0,0,1)),hash3(i+vec3(1,0,1)),f.x),mix(hash3(i+vec3(0,1,1)),hash3(i+vec3(1,1,1)),f.x),f.y),f.z);}
// Time is the third axis: shapes form, thicken, thin and dissolve in place.
float fbm3(vec3 p){float v=0.,a=.5;for(int i=0;i<5;i++){if(float(i)>=u_octaves)break;v+=a*noise3(p);p=vec3(mat2(.8,-.6,.6,.8)*p.xy,p.z)*2.03+vec3(7.1,3.3,1.7);a*=.5;}return v;}
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*noise(p);p=mat2(.8,-.6,.6,.8)*p*2.03+7.1;a*=.5;}return v;}
void main(){
 vec2 uv=v_uv;
 bool passing=u_depth>2.5;
 float nearPlane=min(u_depth,2.)*.5;
 float layer=u_depth/3.;
 float mobile=1.-step(601.,u_size.x);
 // Wind is integrated on the CPU from noise-driven gusts (u_wind), so speed
 // and heading wander over tens of seconds, differently for every layer.
 float approach=1.+u_progress*layer*1.1;
 vec2 fieldSize=vec2(mix(u_size.x,max(u_size.x,780.),mobile),u_size.y);
 vec2 p=(uv-.5)*fieldSize/((360.-u_depth*30.)*approach);
 p*=vec2(.82,1.18);
 p.y-=u_progress*(.15+layer*.9);
 // Sample in the wind's frame, stretched along it, so streamers trail downwind.
 // Rotate only the on-screen coordinates, then add the seed/wind offsets:
 // rotating the large offsets made a small heading change sweep the whole
 // pattern hundreds of pixels per second.
 vec2 a=vec2(dot(p,u_wdir),dot(p,vec2(-u_wdir.y,u_wdir.x)))
  +vec2(u_depth*13.7,u_depth*8.3)+u_seed+u_wind;
 float t=u_time*(.05+u_depth*.012);
 vec2 q=vec2(fbm3(vec3(a*.7,t)+vec3(0.,0.,3.1)),fbm3(vec3(a*.8,t*1.2)+vec3(5.2,1.3,7.7)));
 vec2 r=vec2(fbm3(vec3(a*1.6+q*1.8,t*1.3+1.7)),fbm3(vec3(a*1.5+q*1.8,t*1.1+8.3)));
 float rolling=fbm3(vec3(a+q*1.6+r*.9,t*.8));
 // Wisps: strongly anisotropic noise, advected by the warp, that tears apart.
 float wisps=fbm3(vec3(vec2(a.x*.55,a.y*3.)*1.6+r*2.4,t*1.6));
 float openings=smoothstep(.3,.47,fbm3(vec3(a*.42+19.3,t*.45)));
 float body=smoothstep(.34,.66,rolling*.66+wisps*.34);
 // High-frequency erosion eats the edges of each bank so none reads as cotton.
 float ero=fbm3(vec3(a*8.+r*3.5,t*2.4));
 body=clamp(body-body*(1.-body)*4.*(ero-.36)*1.5,0.,1.);
 float streak=fbm3(vec3(a.x*.45+r.x*1.4,a.y*4.6+r.y*1.4,t*1.2));
 float fringe=smoothstep(.52,.74,streak)*(1.-body)*.6;
 float density=(body+fringe)*mix(.2+.8*openings,.5+.5*openings,mobile);
 float veil;
 if(passing){
  // The nearest plane rises through the frame with the descent: it is what the
  // camera flies through, uncovering the banks behind it.
  float band=-.15+u_progress*1.35;
  veil=exp(-pow((uv.y-band)/.24,2.))*(.28+.65*smoothstep(.05,.35,u_progress))
   +exp(-pow(uv.y/.14,2.))*.2*(1.-u_progress);
 }else{
  // Separate the horizon bank, mist around the span, and low foreground
  // tendrils. Clear gaps preserve the bridge's depth and the moving water.
  float center=mix(.63,.24,nearPlane);
  if(u_depth>.5&&u_depth<1.5){
   center=mix(.78-.5*uv.x,.59-.21*uv.x,mobile);
  }
  center+=sin(uv.x*5.5+u_depth*1.7+t*.025)*.035;
  center+=u_progress*(.035+nearPlane*.48);
  float bank=exp(-pow((uv.y-center)/(.125+nearPlane*.065+mobile*.025),2.));
  float lowBank=exp(-pow((uv.y-(center-.14))/.07,2.));
  veil=bank+lowBank*.24;
  veil*=1.-u_progress*nearPlane*.48;
 }
 veil*=passing?1.:mix(1.25,.5,smoothstep(.1,.85,uv.y));
 float alpha=1.-exp(-density*veil*(passing?1.1:1.8-nearPlane*.4)*(1.+mobile*.65));
 alpha=min(alpha,passing?.5:.8);
 // Cool silver and blue-grey in the body, soft white where it is thickest.
 vec3 color=mix(vec3(.66,.72,.78),vec3(.88,.91,.93),smoothstep(.3,.62,rolling));
 color=mix(color,vec3(.96,.97,.97),smoothstep(.55,.8,rolling)*.7);
 // Edges that face the light take its colour: the low western sun is screen
 // right, the rising sun and the moon sit to the left.
 float lit=clamp((rolling-fbm3(vec3(a+q*1.6+r*.9+vec2(.07,.035),t*.8)))*9.+.3,0.,1.);
 float sun=smoothstep(.2,1.,mix(1.-uv.x,uv.x,u_sunx))*(.45+.55*uv.y);
 color=mix(color,u_warm,clamp((lit*sun*.65+sun*.08)*u_warmth,0.,.7));
 color*=u_tint*(1.+mobile*.1);
 alpha*=u_density;
 gl_FragColor=vec4(color*alpha,alpha);
}`;

/** Overall fog strength for every layer and scene (0.9 = 10% lighter than the original tuning). Motion is unaffected. */
const FOG_LEVEL = 0.9;

/** How each scene lights the fog: overall tint, rim colour and strength, which side the light is on, density, and the density of the planes in front of the bridge. */
const sceneFog: Record<Scene, number[]> = {
  sunrise: [1, 0.96, 0.96, 1, 0.83, 0.72, 1, 0.3, 1.45, 1.05],
  day: [1.02, 1.05, 1.06, 1, 0.99, 0.95, 0.3, 0.8, 1.4, 1.0],
  sunset: [1, 0.96, 0.94, 1, 0.8, 0.58, 1.15, 1, 1.45, 1.05],
  night: [0.42, 0.52, 0.7, 0.73, 0.84, 1, 0.65, 0.2, 1.05, 0.9],
};

/** Four depth planes: rear bank, bridge-height mist, foreground, and a veil the camera passes through. */
export default function Fog({
  depth,
  progress,
}: {
  depth: number;
  progress: React.MutableRefObject<number>;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const clock = useRef(0);
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
    const tint = gl.getUniformLocation(program, "u_tint"),
      warm = gl.getUniformLocation(program, "u_warm"),
      warmth = gl.getUniformLocation(program, "u_warmth"),
      sunX = gl.getUniformLocation(program, "u_sunx"),
      density = gl.getUniformLocation(program, "u_density");
    let light = [...sceneFog[activeScene()]];
    const windU = gl.getUniformLocation(program, "u_wind"),
      wdirU = gl.getUniformLocation(program, "u_wdir");
    // A fresh seed per visit, so no two page loads show the same sky.
    const seed = Math.random() * 1000;
    gl.uniform1f(gl.getUniformLocation(program, "u_seed"), (seed % 97) * 1.3);
    gl.uniform1f(
      gl.getUniformLocation(program, "u_octaves"),
      innerWidth < 601 ? 3 : 4,
    );
    const gustNoise = (x: number) => {
      const i = Math.floor(x),
        f = x - i,
        h = (n: number) => {
          const v = Math.sin(n * 127.1 + seed) * 43758.5453;
          return v - Math.floor(v);
        };
      const u = f * f * (3 - 2 * f);
      return h(i) * (1 - u) + h(i + 1) * u;
    };
    // Field units per second. On screen the rear plane drifts at 22 px/s and
    // each nearer plane only 5% faster (front at most 1.15x the rear).
    const baseSpeed = (22 * (1 + depth * 0.05)) / (360 - depth * 30);
    const wind = [0, 0];
    gl.uniform1f(gl.getUniformLocation(program, "u_depth"), depth);
    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      canvas.width = Math.round(
        Math.min(560 + depth * 80, bounds.width * 0.55),
      );
      canvas.height = Math.round(
        (canvas.width * bounds.height) / Math.max(1, bounds.width),
      );
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(
        gl.getUniformLocation(program, "u_size"),
        bounds.width,
        bounds.height,
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
      clock.current += (delta / 1000) * FOG_SPEED;
      const target = sceneFog[activeScene()];
      light = light.map(
        (v, i) => v + (target[i] - v) * Math.min(1, delta / 600),
      );
      gl.uniform3f(tint, light[0], light[1], light[2]);
      gl.uniform3f(warm, light[3], light[4], light[5]);
      gl.uniform1f(warmth, light[6]);
      gl.uniform1f(sunX, light[7]);
      gl.uniform1f(density, FOG_LEVEL * light[8] * (depth >= 1 ? light[9] : 1));
      gl.uniform1f(time, clock.current);
      const c = clock.current;
      const gust = 0.75 + 0.4 * gustNoise(c / (14 + depth * 3) + depth * 7.3);
      const heading = (gustNoise(c / (31 + depth * 5) + 40 + depth) - 0.5) * 0.3;
      const dx = Math.cos(heading),
        dy = Math.sin(heading);
      wind[0] += dx * baseSpeed * gust * (delta / 1000) * FOG_SPEED;
      wind[1] += dy * baseSpeed * gust * (delta / 1000) * FOG_SPEED;
      gl.uniform2f(windU, wind[0], wind[1]);
      gl.uniform2f(wdirU, dx, dy);
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
  }, [depth, progress]);
  return (
    <canvas
      ref={ref}
      className={`fog fog-${["rear", "middle", "front", "veil"][depth]}`}
      aria-hidden="true"
    />
  );
}
