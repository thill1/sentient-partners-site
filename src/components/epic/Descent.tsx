import React, { useEffect, useRef } from 'react';
import { EPIC_ALTITUDE, EPIC_BEATS, EPIC_CHAPTERS, EPIC_SCROLL_CUE } from '../../content/epicContent';
import { HOME_CTA } from '../../content/homeContent';
import { bookIntroduction, goToSection } from '../home/actions';
import { Arrow } from '../home/Arrow';
import { DESCENT_FRAGMENT, DESCENT_VERTEX } from './descentShader';
import { AirTraffic } from './airTraffic';
import { SurfaceTraffic } from './surfaceTraffic';
import { FILM_SEQUENCES, FramePlayer, focusAt } from './filmFrames';
import { followTarget } from './scrollEasing';
import { timeOfDay } from './timeOfDay';

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
  const filmRef = useRef<HTMLCanvasElement>(null);
  const airRef = useRef<HTMLCanvasElement>(null);
  const airModelRef = useRef<HTMLCanvasElement>(null);
  const surfaceRef = useRef<HTMLCanvasElement>(null);
  const surfaceModelRef = useRef<HTMLCanvasElement>(null);
  const beatRefs = useRef<(HTMLDivElement | null)[]>([]);
  const altitudeRef = useRef<HTMLSpanElement>(null);
  const railRef = useRef<HTMLSpanElement>(null);
  const chapterRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const chapterLabelRef = useRef<HTMLSpanElement>(null);
  const chapterCountRef = useRef<HTMLSpanElement>(null);
  const mobileChapterRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const mobileChapterLabelRef = useRef<HTMLSpanElement>(null);
  const mobileChapterCountRef = useRef<HTMLSpanElement>(null);
  const cueRef = useRef<HTMLParagraphElement>(null);
  const clockRef = useRef<HTMLSpanElement>(null);
  const stillRefs = useRef<Record<string, HTMLImageElement | null>>({});

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
    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let still = motionPreference.matches;

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
          ['uRes', 'uTime', 'uP', 'uLook', 'uNoise', 'uPhase', 'uLight'].map((name) => [name, gl.getUniformLocation(program as WebGLProgram, name)]),
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
      // Full CSS resolution, sharper still on high-density screens when there is room.
      const scale = Math.min(window.devicePixelRatio || 1, phone ? 1.5 : 1.35) * (phone ? 0.8 : 1) * quality;
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
    // The light and the clock follow Pacific time, checked every few seconds.
    let sky = timeOfDay();
    const showClock = () => {
      if (clockRef.current && clockRef.current.textContent !== `${sky.clock} PT`) clockRef.current.textContent = `${sky.clock} PT`;
      const phase = sky.phase[2] > 0.5 ? 'night' : sky.phase[0] > 0.5 ? 'day' : 'golden';
      if (section.dataset.phase !== phase) section.dataset.phase = phase;
      // The rendered opening shot for this time of day.
      const weights: Record<string, number> = { day: sky.phase[0], sunset: sky.phase[1], night: sky.phase[2] };
      Object.entries(stillRefs.current).forEach(([kind, node]) => {
        if (node && node.dataset.weight !== String(weights[kind] ?? 0)) node.dataset.weight = String(weights[kind] ?? 0);
      });
    };
    showClock();

    // The rendered film for this time of day, when one exists.
    const film = filmRef.current;
    const filmCtx = film?.getContext('2d') ?? null;
    const air = airRef.current;
    const airCtx = air?.getContext('2d') ?? null;
    const surface = surfaceRef.current;
    const surfaceCtx = surface?.getContext('2d') ?? null;
    const traffic = new AirTraffic(airModelRef.current ?? undefined);
    const surfaceTraffic = new SurfaceTraffic(surfaceModelRef.current ?? undefined);
    const onMotionChange = () => {
      still = motionPreference.matches;
      if (still) {
        airCtx?.clearRect(0, 0, air?.width ?? 0, air?.height ?? 0);
        surfaceCtx?.clearRect(0, 0, surface?.width ?? 0, surface?.height ?? 0);
        traffic.clear();
      }
    };
    motionPreference.addEventListener('change', onMotionChange);
    let player: FramePlayer | null = null;
    // Held-camera loops for when the visitor pauses at the start or the end.
    let openLoop: FramePlayer | null = null;
    let cityLoop: FramePlayer | null = null;
    let playerKind = '';
    const choosePlayer = () => {
      const kind: 'night' | 'day' | 'sunset' = sky.phase[2] > 0.5 ? 'night' : sky.phase[0] > 0.5 ? 'day' : 'sunset';
      const count = FILM_SEQUENCES[kind];
      if (kind === playerKind) return;
      playerKind = kind;
      player = count ? new FramePlayer(kind, count) : null;
      traffic.setKind(kind);
      surfaceTraffic.setPhase(kind);
      // The reviewed high-resolution sunset loop is the only complete held-camera
      // loop. Use it for the sunset hero by default; other phases stay on their
      // existing backgrounds until matching loops pass visual review.
      const hasCleanSunsetOpening = kind === 'sunset';
      // Sunset's loops have their cross-fade baked in (film/seamless_loop.py):
      // one image a frame, so the loop never hitches the live aircraft.
      const pad = (index: number) => String(index + 1).padStart(4, '0');
      openLoop = count
        ? hasCleanSunsetOpening
          ? new FramePlayer(`${kind}-open`, 38, (index) => `/film/sunset-open-seamless/${pad(index)}.webp`, true)
          : new FramePlayer(`${kind}-open`, 48)
        : null;
      cityLoop = count
        ? kind === 'sunset'
          ? new FramePlayer('sunset-city-seamless', 38, undefined, true)
          : new FramePlayer(`${kind}-city`, 48)
        : null;
    };
    choosePlayer();
    const sizeFilm = () => {
      if (!film) return;
      const scale = Math.min(window.devicePixelRatio || 1, 2);
      film.width = Math.round(film.clientWidth * scale);
      film.height = Math.round(film.clientHeight * scale);
      if (air) {
        air.width = film.width;
        air.height = film.height;
      }
      if (surface) {
        surface.width = film.width;
        surface.height = film.height;
      }
    };
    sizeFilm();
    window.addEventListener('resize', sizeFilm);
    const clockTimer = window.setInterval(() => {
      sky = timeOfDay();
      showClock();
      choosePlayer();
    }, 5000);

    let story = target();
    let lastFilmPaint = '';
    let frame = 0;
    // ?t=42 starts the film's own clock 42 s in, so a review can catch a moment.
    let offset = 0;
    try {
      offset = Number(new URLSearchParams(window.location.search).get('t')) || 0;
    } catch {
      offset = 0;
    }
    const started = performance.now() - offset * 1000;
    let last = started;
    let slow = 0;
    let quick = 0;
    // Touch the page only when a value actually changes. Rewriting the same
    // text, styles and attributes 60 times a second made the browser redo
    // style and layout work every frame for the whole page.
    const setText = (node: HTMLElement | null, value: string) => { if (node && node.textContent !== value) node.textContent = value; };
    const setStyle = (node: HTMLElement | null, key: 'opacity' | 'transform' | 'visibility', value: string) => { if (node && node.style[key] !== value) node.style[key] = value; };
    const setData = (node: HTMLElement | null, key: string, value: string) => { if (node && node.dataset[key] !== value) node.dataset[key] = value; };
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
        if (slow > 45 && quality > 0.74) {
          quality = Math.max(0.74, quality * 0.9);
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
      story = still || Math.abs(wanted - story) < .00001 ? wanted : followTarget(story, wanted, elapsed, 230);
      look.x = followTarget(look.x, look.targetX, elapsed, 400);
      look.y = followTarget(look.y, look.targetY, elapsed, 400);

      // Play the rendered film once it has frames; until then, or if it has none, the still and live film stand in.
      const playing = !!player && player.available && player.loaded > 0;
      setData(section, 'rendered', playing ? 'true' : 'false');
      if (playing && player && filmCtx) {
        // At rest at either end, the scene keeps moving: fog rolls, aircraft
        // pass, boats and traffic carry on. The loop shares the film's first
        // and last camera, so it fades in over the film without doubling.
        const seconds = still ? 0 : (performance.now() - started) / 1000;
        const atOpen = 1 - clamp01(story / 0.02);
        const atCity = clamp01((story - 0.975) / 0.02);
        const opening = atOpen > 0 && openLoop?.available && openLoop.complete ? openLoop : null;
        const ending = atCity > 0 && cityLoop?.available && cityLoop.complete ? cityLoop : null;
        const paintKey = `${playerKind}:${filmCtx.canvas.width}:${filmCtx.canvas.height}:${player.paintKey(story)}:${atOpen}:${atCity}:${opening?.loopPaintKey(seconds, 12) ?? ''}:${ending?.loopPaintKey(seconds, 12) ?? ''}`;
        // Repaint the full background composition only when an image/crop
        // changes. Aircraft still advance every animation frame. Redrawing
        // identical multi-megapixel layers was delaying their live motion.
        if (paintKey !== lastFilmPaint) {
          player.draw(filmCtx, story);
          opening?.drawLoop(filmCtx, seconds, 12, atOpen, focusAt(0));
          ending?.drawLoop(filmCtx, seconds, 12, atCity, focusAt(1));
          lastFilmPaint = paintKey;
        }
        // Aircraft on random paths, in the frame's own camera. They are above
        // the fog, so they fade out as the camera goes into it and stay hidden
        // until it is out from under it, east of the Gate.
        if (airCtx && !still) {
          const visible = 1 - clamp01((story - 0.43) / 0.035) + clamp01((story - 0.76) / 0.05);
          const shot = opening && atOpen > .5 ? 'open' as const : ending && atCity > .5 ? 'city' as const : player.lastIndex;
          const pose = traffic.pose(shot);
          const frameRect = opening && atOpen > .5 ? opening.lastRect : ending && atCity > .5 ? ending.lastRect : player.lastRect;
          traffic.draw(airCtx, pose, frameRect, seconds, clamp01(visible));
          // Boats and bridge traffic are live through the whole film (the
          // frames have none baked in), shown only where that shot's fog mask
          // says water or deck is visible. They are below the fog, so unlike
          // the aircraft they hide only while the camera is inside it.
          const belowFog = 1 - clamp01((story - 0.44) / 0.03) + clamp01((story - 0.555) / 0.03);
          if (surfaceCtx) surfaceTraffic.draw(surfaceCtx, pose, frameRect, seconds, clamp01(belowFog), shot);
        }
      } else if (gl && program) {
        gl.uniform2f(uniforms.uRes, canvas.width, canvas.height);
        gl.uniform1f(uniforms.uTime, still ? 12 : (performance.now() - started) / 1000);
        gl.uniform1f(uniforms.uP, story);
        gl.uniform2f(uniforms.uLook, still ? 0 : look.x, still ? 0 : look.y);
        gl.uniform3f(uniforms.uPhase, sky.phase[0], sky.phase[1], sky.phase[2]);
        gl.uniform3f(uniforms.uLight, sky.light[0], sky.light[1], sky.light[2]);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }

      EPIC_BEATS.forEach((beat, index) => {
        const node = beatRefs.current[index];
        if (!node) return;
        const range: readonly number[] = playing ? beat.film : beat.range;
        const shown = presence(story, range[0], range[1]);
        const rounded = Math.round(shown * 1000) / 1000;
        setStyle(node, 'opacity', String(rounded));
        setStyle(node, 'transform', still ? '' : `translateY(${Math.round((1 - rounded) * 180) / 10}px)`);
        setStyle(node, 'visibility', shown > 0.02 ? 'visible' : 'hidden');
      });
      const eased = story * story * (3 - 2 * story);
      const feet = EPIC_ALTITUDE.from + (EPIC_ALTITUDE.to - EPIC_ALTITUDE.from) * eased;
      setText(altitudeRef.current, `${(story > 0.985 ? EPIC_ALTITUDE.to : Math.round(feet / 10) * 10).toLocaleString('en-US')} ft`);
      setStyle(railRef.current, 'transform', `scaleX(${Math.round(story * 1000) / 1000})`);
      setStyle(cueRef.current, 'opacity', String(Math.round(clamp01(1 - story * 14) * 100) / 100));
      let current = 0;
      EPIC_CHAPTERS.forEach((chapter, index) => {
        if (story >= chapter.at - 0.06) current = index;
      });
      chapterRefs.current.forEach((node, index) => {
        if (!node) return;
        setData(node, 'current', index === current ? 'true' : 'false');
        if (index === current) { if (node.getAttribute('aria-current') !== 'step') node.setAttribute('aria-current', 'step'); }
        else if (node.hasAttribute('aria-current')) node.removeAttribute('aria-current');
      });
      const count = `${String(current + 1).padStart(2, '0')} / ${String(EPIC_CHAPTERS.length).padStart(2, '0')}`;
      setText(chapterLabelRef.current, EPIC_CHAPTERS[current].label);
      setText(chapterCountRef.current, count);
      mobileChapterRefs.current.forEach((node, index) => {
        if (!node) return;
        setData(node, 'current', index === current ? 'true' : 'false');
        if (index === current) { if (node.getAttribute('aria-current') !== 'step') node.setAttribute('aria-current', 'step'); }
        else if (node.hasAttribute('aria-current')) node.removeAttribute('aria-current');
      });
      setText(mobileChapterLabelRef.current, EPIC_CHAPTERS[current].label);
      setText(mobileChapterCountRef.current, count);
      // In the fog the frame is pale, so the instruments turn dark.
      // At night the inside of the fog is dark, so the copy stays light.
      // The rendered still leads the opening and hands over to the live film as you descend.
      // The rendered shot carries the whole descent above the fog, and gives way
      // only inside the fog, where the frame is pale and no bridge is visible.
      const opening = playing ? 0 : 1 - clamp01((story - 0.47) / 0.04);
      Object.values(stillRefs.current).forEach((node) => {
        setStyle(node, 'opacity', String(Math.round(opening * Number(node?.dataset.weight ?? 0) * 1000) / 1000));
      });
      const inFog = playing ? story > 0.465 && story < 0.565 : story > 0.5 && story < 0.592;
      setData(section, 'fog', inFog && sky.phase[2] < 0.5 ? 'true' : 'false');
    };
    frame = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frame);
      traffic.dispose();
      surfaceTraffic.dispose();
      motionPreference.removeEventListener('change', onMotionChange);
      window.clearInterval(clockTimer);
      window.removeEventListener('resize', resize);
      window.removeEventListener('resize', sizeFilm);
      window.removeEventListener('pointermove', onPointerMove);
    };
  }, []);

  return (
    <section id="top" ref={sectionRef} aria-label="Introduction" className="group/film relative h-[440vh] bg-[#060A1C] lg:h-[500vh]">
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        {/* Without WebGL the same dusk stands in as a still gradient. */}
        <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(to_bottom,#04061A_0%,#1B1F55_30%,#7A5A9A_52%,#F29B76_62%,#8C8DC6_66%,#3A3F86_82%,#0B1230_100%)]" />
        <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 h-full w-full opacity-0 transition-opacity duration-[1600ms] data-[live=true]:opacity-100 group-data-[rendered=true]/film:hidden" />
        {/* The rendered descent, played by scroll (film/descent.blend). */}
        <canvas ref={filmRef} aria-hidden="true" className="absolute inset-0 h-full w-full opacity-0 transition-opacity duration-700 group-data-[rendered=true]/film:opacity-100" />
        {/* Independent road and water traffic over the clean review sequence. */}
        <canvas ref={surfaceRef} aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full opacity-0 transition-opacity duration-700 group-data-[rendered=true]/film:opacity-100" />
        <canvas ref={surfaceModelRef} aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full opacity-0 transition-opacity duration-700 group-data-[rendered=true]/film:opacity-100" />
        {/* Live air traffic, drawn over the film in its own 3D space. */}
        <canvas ref={airRef} aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full opacity-0 transition-opacity duration-700 group-data-[rendered=true]/film:opacity-100" />
        <canvas ref={airModelRef} aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full opacity-0 transition-opacity duration-700 group-data-[rendered=true]/film:opacity-100" />
        {/* Path-traced stills of the opening shot, one per time of day (rendered in Blender, film/descent.blend). */}
        {(['sunset', 'day', 'night'] as const).map((kind) => (
          <img
            key={kind}
            ref={(node) => {
              stillRefs.current[kind] = node;
            }}
            src={`/home/hero-${kind}-1600.webp`}
            srcSet={`/home/hero-${kind}-960.webp 960w, /home/hero-${kind}-1600.webp 1600w`}
            sizes="100vw"
            alt=""
            aria-hidden="true"
            decoding="async"
            className="pointer-events-none absolute inset-0 h-full w-full object-cover object-[40%_42%] opacity-0 transition-opacity duration-700 lg:origin-[40%_42%] lg:scale-[1.06] lg:object-[34%_42%]"
          />
        ))}
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#060A1C]/70 to-transparent transition-opacity duration-700 group-data-[fog=true]/film:opacity-0" />
        {/* By day the sky is bright, so the copy gets a little shade of its own. */}
        <div aria-hidden="true" className="absolute inset-y-0 left-0 w-[62%] bg-gradient-to-r from-[#0A1840]/75 via-[#0A1840]/45 to-transparent opacity-0 transition-opacity duration-700 group-data-[phase=day]/film:opacity-100 group-data-[fog=true]/film:!opacity-0" />
        <div aria-hidden="true" className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#060A1C]/60 to-transparent transition-opacity duration-700 group-data-[fog=true]/film:opacity-0" />

        {/* Chapters of the film. */}
        <nav
          aria-label="Film chapters"
          className="absolute right-[var(--sp-gutter)] top-[32%] z-30 -translate-y-1/2 text-right text-sp-ivory group-data-[phase=day]/film:text-sp-navy md:hidden"
        >
          <p className="mb-2 inline-flex items-center gap-2 whitespace-nowrap border border-white/20 bg-[#060A1C]/70 px-2 py-1 text-[9px] font-medium uppercase tracking-[0.12em] text-sp-ivory shadow-sm backdrop-blur-md">
            <span ref={mobileChapterLabelRef} aria-live="polite">Above the fog</span>
            <span ref={mobileChapterCountRef} className="tabular-nums text-sp-mist">01 / 05</span>
          </p>
          <ol className="ml-auto flex w-[13.75rem] flex-row items-center justify-between gap-0">
            {EPIC_CHAPTERS.map((chapter, index) => (
              <li key={chapter.label} className="min-w-0 flex-1">
                <button
                  type="button"
                  ref={(node) => {
                    mobileChapterRefs.current[index] = node;
                  }}
                  onClick={() => goTo(chapter.at)}
                  aria-label={`Go to ${chapter.label} chapter`}
                  aria-current={index === 0 ? 'step' : undefined}
                  className="group/mobile-chapter flex h-11 w-11 items-center justify-end focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sp-champagne"
                >
                  <span
                    aria-hidden="true"
                    className="block h-[2px] w-3 bg-current opacity-45 transition-all duration-300 group-hover/mobile-chapter:w-6 group-hover/mobile-chapter:opacity-80 group-focus-visible/mobile-chapter:w-6 group-focus-visible/mobile-chapter:opacity-100 group-data-[current=true]/mobile-chapter:w-6 group-data-[current=true]/mobile-chapter:opacity-100"
                  />
                </button>
              </li>
            ))}
          </ol>
        </nav>

        <nav
          aria-label="Chapters"
          className="absolute right-[var(--sp-gutter)] hidden -translate-y-1/2 text-sp-ivory transition-colors duration-700 group-data-[phase=day]/film:text-sp-navy group-data-[fog=true]/film:text-sp-navy md:top-[40%] md:block lg:top-[72%]"
        >
          {/* Altitude: where you are in the story. */}
          {/* The time in San Francisco, which also sets the light in the film. */}
          <p className="mb-2 flex items-center justify-end gap-3 text-[13px] tabular-nums tracking-[0.18em]">
            <span className="sr-only">Time in San Francisco: </span>
            <span ref={clockRef} />
            <span aria-hidden="true" className="block w-9" />
          </p>
          <p aria-hidden="true" className="mb-5 flex items-center justify-end gap-3 text-[13px] tabular-nums tracking-[0.18em]">
            <span ref={altitudeRef}>2,950 ft</span>
            <span className="relative block h-px w-9">
              <span className="absolute inset-0 bg-current opacity-30" />
              <span ref={railRef} className="absolute inset-0 origin-left bg-current" />
            </span>
          </p>
          <p aria-label="Current film chapter" className="mb-1 flex items-center justify-end gap-3 text-[11px] uppercase tracking-[0.12em] text-current/90">
            <span ref={chapterLabelRef} aria-live="polite">Above the fog</span>
            <span ref={chapterCountRef} className="tabular-nums text-current/70">01 / 05</span>
          </p>
          <ol className="flex flex-col items-end gap-0">
            {EPIC_CHAPTERS.map((chapter, index) => (
              <li key={chapter.label}>
                <button
                  type="button"
                  ref={(node) => {
                    chapterRefs.current[index] = node;
                  }}
                  onClick={() => goTo(chapter.at)}
                  aria-label={`Go to ${chapter.label} chapter`}
                  className="group/chapter flex min-h-11 items-center gap-3 rounded-sm py-2 text-[13px] tracking-[0.08em] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sp-champagne"
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
          className="sp-film-scroll-cue pointer-events-none absolute inset-x-0 bottom-5 flex flex-col items-center gap-2 text-[12px] uppercase tracking-[0.24em] text-sp-ivory/80"
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
              className={`${index === 0 ? 'absolute inset-0' : 'absolute inset-x-0 bottom-[clamp(5.5rem,13vh,8rem)]'} px-[var(--sp-gutter)] text-center will-change-[opacity,transform] lg:text-left ${
                pale ? 'text-sp-ivory group-data-[fog=true]/film:text-sp-navy' : 'text-sp-ivory'
              } ${index === 0 ? '' : 'invisible opacity-0'}`}
            >
              {index === 0 ? (
                <>
                  <h1 className="pointer-events-none absolute inset-0 font-editorial text-[clamp(2.75rem,1.3rem+5.4vw,6.75rem)] font-normal leading-[0.98] tracking-[-0.022em]">
                    <span className="absolute inset-x-0 top-[clamp(5.75rem,11vh,7.5rem)] mx-auto block max-w-[12ch] lg:inset-x-[var(--sp-gutter)] lg:mx-0">
                      Global Experience.
                    </span>
                    <span className="sp-hero-local-impact absolute inset-x-0 bottom-[clamp(20rem,39vh,21rem)] mx-auto block max-w-[12ch] translate-y-8 lg:inset-x-[var(--sp-gutter)] lg:bottom-[clamp(13.5rem,26vh,17.5rem)] lg:mx-0">
                      Local Impact.
                    </span>
                  </h1>
                  <div className="absolute inset-x-[var(--sp-gutter)] bottom-[clamp(5rem,12vh,7.5rem)] translate-y-6">
                    <p className="mx-auto mb-5 max-w-[34rem] text-[clamp(1.0625rem,1rem+0.4vw,1.3125rem)] leading-[1.55] text-sp-ivory/90 lg:mx-0">
                      {beat.body}
                    </p>
                    <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4 lg:justify-start">
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
                  </div>
                </>
              ) : (
                <>
                  <Heading className="mx-auto max-w-[20ch] font-editorial text-[clamp(2rem,1.2rem+3.4vw,4.75rem)] font-normal leading-[1.03] tracking-[-0.022em] lg:mx-0">
                    {beat.heading}
                  </Heading>
                  {beat.body && (
                    <p className={`mx-auto mt-5 max-w-[34rem] text-[clamp(1.0625rem,1rem+0.4vw,1.3125rem)] leading-[1.55] lg:mx-0 ${pale ? 'text-sp-ivory/90 group-data-[fog=true]/film:text-sp-navy/85' : 'text-sp-ivory/90'}`}>
                      {beat.body}
                    </p>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};
