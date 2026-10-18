import { useEffect, useRef, useState } from "react";
import { Moon, Sun, Sunrise, Sunset } from "lucide-react";
import {
  pacificClock,
  sceneAt,
  sceneLabels,
  sceneOverride,
  type Scene,
} from "./sceneTime";

const sceneIcons: [Scene, typeof Sun][] = [
  ["sunrise", Sunrise],
  ["day", Sun],
  ["sunset", Sunset],
  ["night", Moon],
];
const CHOICE_KEY = "sp-hero-scene";
const isScene = (value: unknown): value is Scene =>
  typeof value === "string" && value in sceneLabels;

// Every minute except the four that carry numerals.
const ticks = Array.from({ length: 60 }, (_, i) => i).filter((i) => i % 15);
const numerals = [
  { label: "12", x: 50, y: 21 },
  { label: "3", x: 80, y: 51.5 },
  { label: "6", x: 50, y: 82 },
  { label: "9", x: 20, y: 51.5 },
];

/**
 * Pacific time on a translucent dial. It also chooses the hero's scene, which
 * it publishes as `data-scene` on <html> for the stylesheet and canvases.
 * Visitors can pick a scene for the rest of their visit, or return to live time.
 */
export function HeroClock() {
  const root = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  useEffect(() => {
    if (!pickerOpen) return;
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target))
        setPickerOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setPickerOpen(false);
      toggle.current?.focus();
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [pickerOpen]);
  // Unset until mounted, so the prerendered HTML never disagrees with the client.
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    let id = 0;
    const tick = () => {
      setNow(new Date());
      id = window.setTimeout(tick, 1000 - (Date.now() % 1000));
    };
    tick();
    return () => clearTimeout(id);
  }, []);

  const [chosen, setChosen] = useState<Scene | null>(null);
  const [preview, setPreview] = useState<Scene | null>(null);
  const [hovered, setHovered] = useState<Scene | null>(null);
  useEffect(() => {
    setPreview(sceneOverride(location.search));
    try {
      const saved = sessionStorage.getItem(CHOICE_KEY);
      if (isScene(saved)) setChosen(saved);
    } catch {
      // Storage unavailable: the choice simply lasts until the page reloads.
    }
  }, []);
  const live = now ? sceneAt(now) : null;
  const choose = (next: Scene | null) => {
    // A shared preview can start in a mode, but must not lock the picker.
    const url = new URL(location.href);
    if (url.searchParams.has("scene")) {
      url.searchParams.delete("scene");
      history.replaceState(history.state, "", url);
      setPreview(null);
    }
    // Picking the scene that is already live is the same as following live time.
    const value = next === live ? null : next;
    setChosen(value);
    try {
      if (value) sessionStorage.setItem(CHOICE_KEY, value);
      else sessionStorage.removeItem(CHOICE_KEY);
    } catch {
      // Ignore storage failures; the choice still applies now.
    }
  };
  const scene: Scene | null = now
    ? (preview ?? chosen ?? live)
    : null;
  const CurrentSceneIcon = sceneIcons.find(([value]) => value === scene)?.[1] ?? Sun;
  const select = (next: Scene | null) => {
    choose(next);
    setHovered(null);
    if (pickerOpen) {
      setPickerOpen(false);
      toggle.current?.focus();
    }
  };
  useEffect(() => {
    if (scene) document.documentElement.dataset.scene = scene;
  }, [scene]);

  const clock = now ? pacificClock(now) : null;
  // Continuous angles, so the hands never sweep backwards at the top of the dial.
  const seconds = clock
    ? clock.hour * 3600 + clock.minute * 60 + clock.second
    : 0;

  return (
    <div className="hero-clock-rail header-rail">
      <div
        ref={root}
        className="hero-clock"
        data-picker-open={pickerOpen}
        onBlur={(event) => {
          if (event.relatedTarget instanceof Node && !event.currentTarget.contains(event.relatedTarget))
            setPickerOpen(false);
        }}
      >
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <circle className="dial-face" cx="50" cy="50" r="47" />
          {ticks.map((i) => (
            <line
              key={i}
              className={i % 5 ? "tick" : "tick is-hour"}
              x1="50"
              y1={i % 5 ? 6.5 : 6}
              x2="50"
              y2={i % 5 ? 9 : 11}
              transform={`rotate(${i * 6} 50 50)`}
            />
          ))}
          {numerals.map((n) => (
            <text key={n.label} x={n.x} y={n.y}>
              {n.label}
            </text>
          ))}
          {clock ? (
            <g className="hands">
              <line
                className="hand-hour"
                x1="50"
                y1="54"
                x2="50"
                y2="30"
                style={{ transform: `rotate(${seconds / 120}deg)` }}
              />
              <line
                className="hand-minute"
                x1="50"
                y1="56"
                x2="50"
                y2="17"
                style={{ transform: `rotate(${seconds / 10}deg)` }}
              />
              <line
                className="hand-second"
                x1="50"
                y1="58"
                x2="50"
                y2="13"
                style={{ transform: `rotate(${seconds * 6}deg)` }}
              />
              <circle className="hand-pin" cx="50" cy="50" r="1.6" />
            </g>
          ) : null}
        </svg>
        <div className="hero-clock-copy">
          <p className="hero-clock-time" role="timer" aria-label={
            clock ? `${clock.time} ${clock.meridiem} ${clock.zone}` : undefined
          }>
            {clock ? (
              <>
                {clock.time} <span>{clock.meridiem}</span>{" "}
                <span>{clock.zone}</span>
              </>
            ) : (
              " "
            )}
          </p>
          <button
            ref={toggle}
            className="scene-picker-toggle"
            type="button"
            aria-label={`Change time of day${scene ? `, ${sceneLabels[scene]} selected` : ""}`}
            aria-expanded={pickerOpen}
            aria-controls="hero-scene-picker"
            onClick={() => setPickerOpen((open) => !open)}
          >
            <CurrentSceneIcon size={17} strokeWidth={1.5} />
          </button>
          <p className="hero-clock-tagline">Business never sleeps</p>
          <div className="scene-picker-panel" id="hero-scene-picker">
          <div
            className="scene-switch"
            role="radiogroup"
            aria-label="Time of day"
            onMouseLeave={() => setHovered(null)}
          >
            {sceneIcons.map(([value, Icon]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={scene === value}
                aria-label={sceneLabels[value]}
                tabIndex={scene === value ? 0 : -1}
                onKeyDown={(event) => {
                  const index = sceneIcons.findIndex(([mode]) => mode === value);
                  const next = event.key === "ArrowRight" || event.key === "ArrowDown"
                    ? (index + 1) % sceneIcons.length
                    : event.key === "ArrowLeft" || event.key === "ArrowUp"
                      ? (index + sceneIcons.length - 1) % sceneIcons.length
                      : event.key === "Home" ? 0 : event.key === "End" ? sceneIcons.length - 1 : -1;
                  if (next < 0) return;
                  event.preventDefault();
                  choose(sceneIcons[next][0]);
                  event.currentTarget.parentElement?.querySelectorAll("button")[next]?.focus();
                }}
                onClick={() => select(value)}
                onMouseEnter={() => setHovered(value)}
                onFocus={() => setHovered(value)}
                onBlur={() => setHovered(null)}
              >
                <Icon size={16} strokeWidth={1.6} />
              </button>
            ))}
          </div>
          <p className="hero-clock-scene" aria-live="polite">
            {hovered
              ? sceneLabels[hovered]
              : scene
                ? sceneLabels[scene]
                : "\u00a0"}
            {chosen && !hovered ? (
              <button
                type="button"
                className="scene-live"
                onClick={() => select(null)}
              >
                Live time
              </button>
            ) : null}
          </p>
          </div>
        </div>
      </div>
    </div>
  );
}
