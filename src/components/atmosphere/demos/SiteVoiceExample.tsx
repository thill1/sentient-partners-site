import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { openSentientChat } from "../../../lib/siteActions";
import { VOICE_EXAMPLE, voiceStepMs, type VoiceSpeaker } from "./voiceExample";
import { useReducedMotion } from "./useReducedMotion";

const lines = VOICE_EXAMPLE.lines;
const last = lines.length - 1;

function speakerName(who: VoiceSpeaker): string {
  switch (who) {
    case "assistant":
      return "Assistant";
    case "visitor":
      return "Visitor";
    default: {
      const unexpected: never = who;
      return unexpected;
    }
  }
}

/**
 * Plays a local script. It never calls the live voice service.
 * "Open the live assistant" uses the assistant already on the site.
 */
export function SiteVoiceExample() {
  const [step, setStep] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const reduced = useReducedMotion();
  const log = useRef<HTMLOListElement>(null);
  const finished = step >= last && !playing;
  const shown = step < 0 ? [] : lines.slice(0, step + 1);

  useEffect(() => {
    if (!playing) return;
    if (reduced) {
      setStep(last);
      setPlaying(false);
      return;
    }
    if (step >= last) {
      setPlaying(false);
      return;
    }
    const wait = step < 0 ? 280 : voiceStepMs(lines[step].text);
    const id = window.setTimeout(() => setStep((current) => current + 1), wait);
    return () => window.clearTimeout(id);
  }, [playing, step, reduced]);

  useEffect(() => {
    const el = log.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: reduced ? "auto" : "smooth" });
  }, [shown.length, reduced]);

  const toggle = () => {
    if (finished) {
      setStep(-1);
      setPlaying(true);
      return;
    }
    setPlaying((on) => !on);
  };

  const playLabel = finished
    ? "Replay the example"
    : playing
      ? "Pause the example"
      : "Play the example";

  return (
    <article className="demo-card is-voice" id="voice" aria-labelledby="voice-demo-title">
      <div className="demo-copy">
        <p className="example-flag">{VOICE_EXAMPLE.label}</p>
        <h2 id="voice-demo-title">The assistant on this site.</h2>
        <p className="demo-kicker">{VOICE_EXAMPLE.disclosure}</p>
        <p className="demo-note">
          The live assistant is the one already on this site. Opening it does not start a
          conversation. Choose chat or voice there, then begin when you want to.
        </p>
        <button
          type="button"
          className="demo-live"
          onClick={() => openSentientChat({ source: "Voice example" })}
        >
          Open the live assistant
        </button>
      </div>
      <div className="voice-panel">
        <header className="voice-head">
          <div
            className={`voice-wave${playing ? " is-playing" : ""}`}
            aria-hidden="true"
          >
            {Array.from({ length: 14 }, (_, i) => (
              <i
                key={i}
                style={
                  {
                    "--h": [0.4, 0.85, 0.6, 0.45, 0.95, 0.7, 0.55][i % 7],
                    "--d": `${(i % 5) * 0.08}s`,
                  } as CSSProperties
                }
              />
            ))}
          </div>
          <div>
            <strong>Sentient assistant</strong>
            <small>{playing ? "Example playing" : finished ? "Example finished" : "Example, not a live call"}</small>
          </div>
        </header>
        <ol ref={log} className="voice-log" aria-live="polite" aria-relevant="additions text">
          {shown.length === 0 ? (
            <li className="is-empty">Press play to read the example. Nothing is sent.</li>
          ) : (
            shown.map((line, i) => (
              <li key={i} className={`is-${line.who}`}>
                <span>{speakerName(line.who)}</span>
                {line.text}
              </li>
            ))
          )}
        </ol>
        <button type="button" className="demo-play" aria-pressed={playing} onClick={toggle}>
          {finished ? (
            <RotateCcw size={16} aria-hidden="true" />
          ) : playing ? (
            <Pause size={16} aria-hidden="true" />
          ) : (
            <Play size={16} aria-hidden="true" />
          )}
          {playLabel}
        </button>
      </div>
    </article>
  );
}
