import React, { useEffect, useRef } from 'react';
import { EPIC_ALTITUDE, EPIC_BEATS } from '../../content/epicContent';
import { HOME_CTA } from '../../content/homeContent';
import { bookIntroduction, goToSection } from '../home/actions';
import { Arrow } from '../home/Arrow';
import { DESCENT_FRAGMENT, DESCENT_VERTEX } from './descentShader';

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
/** How much of a beat is showing at story position p. */
const presence = (p: number, from: number, to: number) => clamp01((p - from) / 0.045) * clamp01((to - p) / 0.045);

/**
 * The opening film. The page scrolls; the camera descends: from cruising
 * altitude above a sea of fog, past the bridge, through the fog, to the
 * lights of a foothill town. The scene is rendered live, and the scroll
 * position is the only control.
 */
export const Descent: React.FC = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const beatRefs = useRef<(HTMLDivElement | null)[]>([]);
  const altitudeRef = useRef<HTMLSpanElement>(null);
  const railRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const canvas = canvasRef.current;
    if (!section || !canvas) return;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const gl = canvas.getContext('webgl', { antialias: false, powerPreference: 'high-performance' });
    let program: WebGLProgram | null = null;
    let uniforms: Record<string, WebGLUniformLocation | null> = {};
    if (gl) {
      const vertex = compile(gl, gl.VERTEX_SHADER, DESCENT_VERTEX);
      const fragment = compile(gl, gl.FRAGMENT_SHADER, DESCENT_FRAGMENT);
      program = gl.createProgram();
      if (vertex && fragment && program) {
        gl.attachShader(program, vertex);
        gl.attachShader(program, fragment);
        gl.linkProgram(program);
      }
      if (program && gl.getProgramParameter(program, gl.LINK_STATUS)) {
        gl.useProgram(program);
        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
        const position = gl.getAttribLocation(program, 'p');
        gl.enableVertexAttribArray(position);
        gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
        uniforms = Object.fromEntries(
          ['uRes', 'uTime', 'uP', 'uLook'].map((name) => [name, gl.getUniformLocation(program as WebGLProgram, name)]),
        );
        canvas.dataset.live = 'true';
      } else {
        program = null;
      }
    }

    const resize = () => {
      const phone = window.innerWidth < 768;
      const scale = Math.min(window.devicePixelRatio || 1, phone ? 2 : 1.5) * (phone ? 0.45 : 0.62);
      canvas.width = Math.max(2, Math.round(canvas.clientWidth * scale));
      canvas.height = Math.max(2, Math.round(canvas.clientHeight * scale));
      gl?.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    window.addEventListener('resize', resize);

    const look = { x: 0, y: 0, targetX: 0, targetY: 0 };
    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      look.targetX = (event.clientX / window.innerWidth - 0.5) * 2;
      look.targetY = (0.5 - event.clientY / window.innerHeight) * 2;
    };
    window.addEventListener('pointermove', onPointerMove);

    const target = () => {
      const rect = section.getBoundingClientRect();
      return clamp01(-rect.top / Math.max(1, rect.height - window.innerHeight));
    };

    let story = target();
    let frame = 0;
    const started = performance.now();
    const draw = () => {
      frame = requestAnimationFrame(draw);
      const rect = section.getBoundingClientRect();
      if (rect.bottom < 0 || document.hidden) return;

      // The camera follows the scroll with a little weight, like a crane.
      const wanted = target();
      story = still ? wanted : story + (wanted - story) * 0.07;
      look.x += (look.targetX - look.x) * 0.04;
      look.y += (look.targetY - look.y) * 0.04;

      if (gl && program) {
        gl.uniform2f(uniforms.uRes, canvas.width, canvas.height);
        gl.uniform1f(uniforms.uTime, still ? 12 : (performance.now() - started) / 1000);
        gl.uniform1f(uniforms.uP, story);
        gl.uniform2f(uniforms.uLook, still ? 0 : look.x, still ? 0 : look.y);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }

      EPIC_BEATS.forEach((beat, index) => {
        const node = beatRefs.current[index];
        if (!node) return;
        const shown = presence(story, beat.range[0], beat.range[1]);
        node.style.opacity = String(shown);
        node.style.transform = still ? '' : `translateY(${(1 - shown) * 18}px)`;
        node.style.visibility = shown > 0.02 ? 'visible' : 'hidden';
      });
      const eased = story * story * (3 - 2 * story);
      const feet = EPIC_ALTITUDE.from + (EPIC_ALTITUDE.to - EPIC_ALTITUDE.from) * eased;
      if (altitudeRef.current) {
        altitudeRef.current.textContent = `${(story > 0.985 ? EPIC_ALTITUDE.to : Math.round(feet / 10) * 10).toLocaleString('en-US')} ft`;
      }
      if (railRef.current) railRef.current.style.transform = `scaleY(${story})`;
      // In the fog the frame is pale, so the instruments turn dark.
      section.dataset.fog = story > 0.47 && story < 0.585 ? 'true' : 'false';
    };
    frame = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointerMove);
    };
  }, []);

  return (
    <section id="top" ref={sectionRef} aria-label="Introduction" className="group/film relative h-[520vh] bg-[#060A1C] lg:h-[600vh]">
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        {/* Without WebGL the same dusk stands in as a still gradient. */}
        <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(to_bottom,#04061A_0%,#1B1F55_30%,#7A5A9A_52%,#F29B76_62%,#8C8DC6_66%,#3A3F86_82%,#0B1230_100%)]" />
        <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 h-full w-full opacity-0 transition-opacity duration-[1600ms] data-[live=true]:opacity-100" />
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#060A1C]/70 to-transparent transition-opacity duration-700 group-data-[fog=true]/film:opacity-0" />
        <div aria-hidden="true" className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#060A1C]/60 to-transparent transition-opacity duration-700 group-data-[fog=true]/film:opacity-0" />

        {/* Altitude: where you are in the story. */}
        <div
          aria-hidden="true"
          className="absolute bottom-[clamp(1.5rem,5vh,3rem)] left-[var(--sp-gutter)] hidden items-end gap-3 text-sp-ivory transition-colors duration-700 group-data-[fog=true]/film:text-sp-navy sm:flex"
        >
          <span className="relative block h-24 w-px">
            <span className="absolute inset-0 bg-current opacity-30" />
            <span ref={railRef} className="absolute inset-0 origin-top bg-current" />
          </span>
          <span ref={altitudeRef} className="text-[13px] tabular-nums tracking-[0.18em]">
            38,000 ft
          </span>
        </div>

        {EPIC_BEATS.map((beat, index) => {
          const Heading = index === 0 ? 'h1' : 'h2';
          const pale = beat.id === 'fog';
          return (
            <div
              key={beat.id}
              ref={(node) => {
                beatRefs.current[index] = node;
              }}
              className={`absolute inset-x-0 bottom-[clamp(4.5rem,13vh,8rem)] px-[var(--sp-gutter)] text-center will-change-[opacity,transform] ${
                pale ? 'text-sp-navy' : 'text-sp-ivory'
              } ${index === 0 ? '' : 'invisible opacity-0'}`}
            >
              <Heading
                className={`mx-auto font-editorial font-normal tracking-[-0.02em] ${
                  index === 0
                    ? 'max-w-[18ch] text-[clamp(2.5rem,1.3rem+4.4vw,5.25rem)] leading-[1.02] sm:max-w-none'
                    : 'max-w-[24ch] text-[clamp(2rem,1.2rem+3vw,4rem)] leading-[1.06]'
                }`}
              >
                {beat.heading}
              </Heading>
              {beat.body && (
                <p className={`mx-auto mt-5 max-w-[38rem] text-[clamp(1.0625rem,1rem+0.3vw,1.25rem)] leading-[1.55] ${pale ? 'text-sp-navy/85' : 'text-sp-ivory/90'}`}>
                  {beat.body}
                </p>
              )}
              {index === 0 && (
                <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
                  <button type="button" onClick={() => bookIntroduction('Film')} className="sp-btn sp-btn-champagne w-full max-w-[20rem] sm:w-auto">
                    {HOME_CTA.book}
                    <Arrow />
                  </button>
                  <a
                    href="#capabilities"
                    onClick={(event) => goToSection(event, 'capabilities')}
                    className="sp-btn sp-btn-outline-light w-full max-w-[20rem] sm:w-auto"
                  >
                    {HOME_CTA.explore}
                  </a>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};
