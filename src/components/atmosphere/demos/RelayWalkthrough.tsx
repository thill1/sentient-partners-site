import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { openContactModal } from "../../../lib/siteActions";
import { RELAY_SCREENS, RELAY_STATUS, relaySrc } from "./relayScreens";

const last = RELAY_SCREENS.length - 1;

/**
 * One screen at a time. The next image is prefetched after the current
 * one is on screen, so the page does not download all nine up front.
 */
export function RelayWalkthrough() {
  const [index, setIndex] = useState(0);
  const steps = useRef<HTMLOListElement>(null);
  const stepButtons = useRef<Array<HTMLButtonElement | null>>([]);
  const screen = RELAY_SCREENS[index];

  useEffect(() => {
    const next = RELAY_SCREENS[index + 1];
    if (!next) return;
    const img = new Image();
    img.src = relaySrc(next.file);
  }, [index]);

  useEffect(() => {
    const row = steps.current;
    const item = row?.children[index] as HTMLElement | undefined;
    if (!row || !item) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    row.scrollTo({
      left: item.offsetLeft - (row.clientWidth - item.clientWidth) / 2,
      behavior: reduced ? "auto" : "smooth",
    });
  }, [index]);

  const go = (next: number, focus = false) => {
    const i = Math.max(0, Math.min(last, next));
    setIndex(i);
    if (focus) stepButtons.current[i]?.focus();
  };

  const onKeys = (event: KeyboardEvent<HTMLOListElement>) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      go(index + 1, true);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      go(index - 1, true);
    } else if (event.key === "Home") {
      event.preventDefault();
      go(0, true);
    } else if (event.key === "End") {
      event.preventDefault();
      go(last, true);
    }
  };

  return (
    <article className="demo-card" id="relay" aria-labelledby="relay-demo-title">
      <div className="demo-copy">
        <p className="eyebrow">Sentient Relay · {RELAY_STATUS}</p>
        <h2 id="relay-demo-title">The service day, one screen at a time.</h2>
        <p className="demo-kicker" aria-live="polite">
          Screen {index + 1} of {RELAY_SCREENS.length}. {screen.title}. {screen.caption}
        </p>
        <div className="demo-nav">
          <button type="button" aria-label="Previous screen" onClick={() => go(index - 1)} disabled={index === 0}>
            <ArrowLeft size={16} aria-hidden="true" /> Previous
          </button>
          <button
            type="button"
            className="is-next"
            aria-label="Next screen"
            onClick={() => go(index + 1)}
            disabled={index === last}
          >
            Next <ArrowRight size={16} aria-hidden="true" />
          </button>
        </div>
        <ol
          ref={steps}
          className="demo-steps"
          aria-label="Relay screens"
          onKeyDown={onKeys}
        >
          {RELAY_SCREENS.map((item, i) => (
            <li key={item.id}>
              <button
                type="button"
                ref={(node) => {
                  stepButtons.current[i] = node;
                }}
                aria-current={i === index ? "step" : undefined}
                aria-label={`Screen ${i + 1} of ${RELAY_SCREENS.length}, ${item.title}`}
                onClick={() => go(i)}
              >
                <span>{i + 1}</span> {item.title}
              </button>
            </li>
          ))}
        </ol>
        <p className="demo-note">Real app screens with sample data.</p>
        <button
          type="button"
          className="demo-link"
          onClick={() =>
            openContactModal({
              source: "Sentient Relay demo",
              inquiry: "I would like to learn about Sentient Relay, currently in pilot.",
            })
          }
        >
          Ask about Sentient Relay <ArrowRight size={15} aria-hidden="true" />
        </button>
      </div>
      <figure className="demo-phone">
        <img
          key={screen.file}
          src={relaySrc(screen.file)}
          alt={screen.alt}
          width={screen.width}
          height={screen.height}
          decoding="async"
        />
      </figure>
    </article>
  );
}
