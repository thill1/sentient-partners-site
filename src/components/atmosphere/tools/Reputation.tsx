import { useId, useState } from "react";
import { ArrowRight } from "lucide-react";
import { openContactModal } from "../../../lib/siteActions";
import ToolCta from "./ToolCta";
import ToolBack from "./ToolBack";

/**
 * A guided self-check: the visitor reads their own numbers off their
 * Google or Yelp profile. Nothing is looked up. Each area scores 0-3.
 */
export const AREAS = {
  rating: "Fix what low reviews mention most, then ask happy customers to share their experience.",
  count: "Ask every customer for a review with a direct link, right after the job.",
  recency: "Keep reviews coming every month so the newest ones are recent.",
  replies: "Reply to every review, good and bad, within a few days.",
  asking: "Make the review request automatic, by text or email, after each job.",
} as const;
type Area = keyof typeof AREAS;

export const CHOICES = {
  recency: ["None in the last 3 months", "1-2 in the last 3 months", "Several in the last 3 months", "Some every month"],
  replies: ["We don't reply", "Only to bad reviews", "To most reviews", "To every review"],
  asking: ["We don't ask", "Now and then, in person", "After most jobs", "Automatically after every job"],
} as const;

export const ratingScore = (r: number) => (!Number.isFinite(r) || r <= 0 ? 0 : r < 3.5 ? 0 : r < 4 ? 1 : r < 4.5 ? 2 : 3);
export const countScore = (n: number) => (!Number.isFinite(n) || n < 10 ? 0 : n < 50 ? 1 : n < 150 ? 2 : 3);

export function reputation(s: Record<Area, number>) {
  const areas = Object.keys(AREAS) as Area[];
  const score = Math.round((areas.reduce((t, a) => t + (s[a] ?? 0), 0) / (areas.length * 3)) * 100);
  const steps = areas
    .map((a, i) => ({ a, v: s[a] ?? 0, i }))
    .sort((x, y) => x.v - y.v || x.i - y.i)
    .slice(0, 3)
    .map((x) => AREAS[x.a]);
  return { score, steps };
}

export default function Reputation() {
  const id = useId();
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [rating, setRating] = useState("");
  const [count, setCount] = useState("");
  const [picks, setPicks] = useState<Partial<Record<keyof typeof CHOICES, number>>>({});
  const [done, setDone] = useState(false);
  const result = reputation({
    rating: ratingScore(Number(rating)),
    count: countScore(Number(count)),
    recency: picks.recency ?? 0,
    replies: picks.replies ?? 0,
    asking: picks.asking ?? 0,
  });
  const who = [name.trim(), city.trim()].filter(Boolean).join(", ");
  const ready = rating !== "" && count !== "" && Object.keys(CHOICES).every((k) => picks[k as keyof typeof CHOICES] !== undefined);

  return (
    <section className="tool-page section-space" aria-labelledby="rp-title">
      <nav className="tool-backbar" aria-label="Tools">
        <div className="page-width">
          <ToolBack />
        </div>
      </nav>
      <div className="page-width tool-layout is-single">
        <div className="tool-intro">
          <p className="eyebrow">Free tool</p>
          <h1 id="rp-title">
            How strong is
            <br />
            <em>your reputation?</em>
          </h1>
          <p>Open your Google or Yelp profile and answer from what you see. Nothing is looked up or stored.</p>
        </div>
        {!done ? (
          <form
            className="ar-form"
            onSubmit={(e) => {
              e.preventDefault();
              setDone(true);
              requestAnimationFrame(() => document.getElementById("rp-result")?.scrollIntoView({ block: "start" }));
            }}
          >
            <div className="tool-pair">
              <label className="tool-field" htmlFor={`${id}-name`}>
                <span>Business name</span>
                <span className="tool-input">
                  <input id={`${id}-name`} type="text" autoComplete="organization" value={name} onChange={(e) => setName(e.target.value)} />
                </span>
              </label>
              <label className="tool-field" htmlFor={`${id}-city`}>
                <span>City</span>
                <span className="tool-input">
                  <input id={`${id}-city`} type="text" autoComplete="address-level2" value={city} onChange={(e) => setCity(e.target.value)} />
                </span>
              </label>
              <label className="tool-field" htmlFor={`${id}-rating`}>
                <span>Star rating</span>
                <span className="tool-input">
                  <input id={`${id}-rating`} type="number" inputMode="decimal" min={1} max={5} step={0.1} placeholder="e.g. 4.6" value={rating} onChange={(e) => setRating(e.target.value)} required />
                </span>
              </label>
              <label className="tool-field" htmlFor={`${id}-count`}>
                <span>Number of reviews</span>
                <span className="tool-input">
                  <input id={`${id}-count`} type="number" inputMode="numeric" min={0} step={1} placeholder="e.g. 85" value={count} onChange={(e) => setCount(e.target.value)} required />
                </span>
              </label>
            </div>
            {(
              [
                ["recency", "How many new reviews lately?"],
                ["replies", "Do you reply to reviews?"],
                ["asking", "How do you ask for reviews?"],
              ] as const
            ).map(([key, q], qi) => (
              <fieldset key={key} className="ar-q">
                <legend>
                  <span>{qi + 1}</span> {q}
                </legend>
                <div className="ar-options">
                  {CHOICES[key].map((label, value) => (
                    <label key={label} className={picks[key] === value ? "is-on" : ""}>
                      <input type="radio" name={key} value={value} checked={picks[key] === value} onChange={() => setPicks({ ...picks, [key]: value })} required />
                      {label}
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
            <button className="cta-primary" type="submit" disabled={!ready}>
              See my snapshot <ArrowRight size={16} aria-hidden="true" />
            </button>
          </form>
        ) : (
          <div id="rp-result" className="tool-result" aria-live="polite">
            <p className="tool-result-label">Reputation snapshot{who ? ` · ${who}` : ""}</p>
            <p className="tool-figure">
              {result.score}
              <small> / 100</small>
            </p>
            <p className="tool-result-label">Three next steps</p>
            <ol className="ar-steps">
              {result.steps.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
            <p className="tool-note">Based only on what you entered, using our own scoring guide. Not a review of your business.</p>
            <ToolCta source="Reputation snapshot" context={`Reputation snapshot${who ? ` for ${who}` : ""}: ${result.score}/100.`} />
            <div className="ar-more">
              <button
                type="button"
                className="text-link"
                onClick={() =>
                  openContactModal({
                    source: "Reputation snapshot",
                    inquiry: `Reputation snapshot${who ? ` for ${who}` : ""}: ${result.score}/100 (rating ${rating}, ${count} reviews).\nNext steps suggested:\n- ${result.steps.join("\n- ")}`,
                  })
                }
              >
                Send my results to Troy
              </button>
              <button type="button" className="text-link" onClick={() => setDone(false)}>
                Change answers
              </button>
            </div>
            <ToolBack label="Back to all tools" end />
          </div>
        )}
      </div>
    </section>
  );
}
