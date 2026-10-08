import React, { useEffect, useRef } from 'react';
import { EPIC_ALTITUDE, EPIC_BEATS, EPIC_CHAPTERS, EPIC_SCROLL_CUE } from '../../content/epicContent';
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
  const chapterRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const cueRef = useRef<HTMLParagraphElement>(null);

  const goTo = (at: number) => {
    const section = sectionRef.current;
    if (!section) return;
    const top = section.getBoundingClientRect().top + window.scrollY;
    const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: top + at * (section.offsetHeight - window.innerHeight), behavior: smooth ? 'smooth' : 'auto' });
  };

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
          ['uRes', 'uTime', 'uP', 'uLook', 'uNoise'].map((name) => [name, gl.getUniformLocation(program as WebGLProgram, name)]),
        );
        // One small tile of random values feeds every cloud, ridge and light.
        const tile = new Uint8Array(256 * 256 * 4);
        let seed = 20261008;
        for (let index = 0; index < tile.length; index += 4) {
          seed = (seed * 1664525 + 1013904223) >>> 0;
          tile[index] = seed >>> 24;
          tile[index + 3] = 255;
        }
        // Green holds the same values one layer down, so a single fetch
        // returns both layers a 3D lookup needs.
        for (let y = 0; y < 256; y++) {
          for (let x = 0; x < 256; x++) {
            tile[(y * 256 + x) * 4 + 1] = tile[(((y - 17) & 255) * 256 + ((x - 37) & 255)) * 4];
          }
        }
        gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 256, 256, 0, gl.RGBA, gl.UNSIGNED_BYTE, tile);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.uniform1i(uniforms.uNoise, 0);
        canvas.dataset.live = 'true';
      } else {
        program = null;
      }
    }

    // Rendering resolution follows the machine: it steps down if frames run
    // long and back up when there is room, so the film stays smooth.
    let quality = 1;
    const resize = () => {
      const phone = window.innerWidth < 768;
      const scale = Math.min(window.devicePixelRatio || 1, phone ? 2 : 1.5) * (phone ? 0.5 : 0.75) * quality;
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
    let last = started;
    let slow = 0;
    let quick = 0;
    const draw = () => {
      frame = requestAnimationFrame(draw);
      const rect = section.getBoundingClientRect();
      const now = performance.now();
      const elapsed = now - last;
      last = now;
      if (rect.bottom < 0 || document.hidden) return;

      // Ignore the first seconds (loading makes every machine look slow), step
      // down only on a sustained run of long frames, and climb back promptly.
      if (program && elapsed < 250 && now - started > 2500) {
        slow = elapsed > 26 ? slow + 1 : Math.max(0, slow - 1);
        quick = elapsed < 18 ? quick + 1 : 0;
        if (slow > 45 && quality > 0.6) {
          quality = Math.max(0.6, quality * 0.88);
          slow = 0;
          quick = 0;
          resize();
        } else if (quick > 150 && quality < 1) {
          quality = Math.min(1, quality * 1.12);
          quick = 0;
          resize();
        }
      }

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
      if (railRef.current) railRef.current.style.transform = `scaleX(${story})`;
      if (cueRef.current) cueRef.current.style.opacity = String(clamp01(1 - story * 14));
      let current = 0;
      EPIC_CHAPTERS.forEach((chapter, index) => {
        if (story >= chapter.at - 0.06) current = index;
      });
      chapterRefs.current.forEach((node, index) => {
        if (node) node.dataset.current = index === current ? 'true' : 'false';
      });
      // In the fog the frame is pale, so the instruments turn dark.
      section.dataset.fog = story > 0.5 && story < 0.592 ? 'true' : 'false';
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

        {/* Chapters of the film. */}
        <nav
          aria-label="Chapters"
          className="absolute right-[var(--sp-gutter)] top-[72%] hidden -translate-y-1/2 text-sp-ivory transition-colors duration-700 group-data-[fog=true]/film:text-sp-navy md:block"
        >
          {/* Altitude: where you are in the story. */}
          <p aria-hidden="true" className="mb-5 flex items-center justify-end gap-3 text-[13px] tabular-nums tracking-[0.18em]">
            <span ref={altitudeRef}>38,000 ft</span>
            <span className="relative block h-px w-9">
              <span className="absolute inset-0 bg-current opacity-30" />
              <span ref={railRef} className="absolute inset-0 origin-left bg-current" />
            </span>
          </p>
          <ol className="flex flex-col items-end gap-4">
            {EPIC_CHAPTERS.map((chapter, index) => (
              <li key={chapter.label}>
                <button
                  type="button"
                  ref={(node) => {
                    chapterRefs.current[index] = node;
                  }}
                  onClick={() => goTo(chapter.at)}
                  className="group/chapter flex items-center gap-3 py-1 text-[13px] tracking-[0.08em]"
                >
                  <span className="opacity-0 transition-opacity duration-300 group-hover/chapter:opacity-100 group-focus-visible/chapter:opacity-100 group-data-[current=true]/chapter:opacity-100">
                    {chapter.label}
                  </span>
                  <span
                    aria-hidden="true"
                    className="block h-px w-5 bg-current opacity-50 transition-all duration-500 group-hover/chapter:w-9 group-hover/chapter:opacity-100 group-data-[current=true]/chapter:w-9 group-data-[current=true]/chapter:opacity-100"
                  />
                </button>
              </li>
            ))}
          </ol>
        </nav>

        <p
          ref={cueRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-5 flex flex-col items-center gap-2 text-[12px] uppercase tracking-[0.24em] text-sp-ivory/80"
        >
          {EPIC_SCROLL_CUE}
          <span className="sp-cue block h-7 w-px bg-sp-ivory/70" />
        </p>

        {EPIC_BEATS.map((beat, index) => {
          const Heading = index === 0 ? 'h1' : 'h2';
          const pale = beat.id === 'fog';
          return (
            <div
              key={beat.id}
              ref={(node) => {
                beatRefs.current[index] = node;
              }}
              className={`absolute inset-x-0 bottom-[clamp(5.5rem,13vh,8rem)] px-[var(--sp-gutter)] text-center will-change-[opacity,transform] lg:text-left ${
                pale ? 'text-sp-navy' : 'text-sp-ivory'
              } ${index === 0 ? '' : 'invisible opacity-0'}`}
            >
              <Heading
                className={`mx-auto font-editorial font-normal tracking-[-0.022em] lg:mx-0 ${
                  index === 0
                    ? 'max-w-[12ch] text-[clamp(2.75rem,1.3rem+5.4vw,6.75rem)] leading-[0.98]'
                    : 'max-w-[20ch] text-[clamp(2rem,1.2rem+3.4vw,4.75rem)] leading-[1.03]'
                }`}
              >
                {beat.heading}
              </Heading>
              {beat.body && (
                <p className={`mx-auto mt-5 max-w-[34rem] text-[clamp(1.0625rem,1rem+0.4vw,1.3125rem)] leading-[1.55] lg:mx-0 ${pale ? 'text-sp-navy/85' : 'text-sp-ivory/90'}`}>
                  {beat.body}
                </p>
              )}
              {index === 0 && (
                <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4 lg:justify-start">
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
