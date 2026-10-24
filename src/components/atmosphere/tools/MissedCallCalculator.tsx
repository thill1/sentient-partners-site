import { useId, useState } from "react";
import ToolCta from "./ToolCta";

/** Revenue at risk from missed calls, from the visitor's own numbers only. */
export function missedCallEstimate(input: { callsPerWeek: number; missedPct: number; bookPct: number; jobValue: number }) {
  const clamp = (n: number, max = Infinity) => (Number.isFinite(n) ? Math.min(Math.max(n, 0), max) : 0);
  const missedPerWeek = clamp(input.callsPerWeek) * (clamp(input.missedPct, 100) / 100);
  const lostJobsPerWeek = missedPerWeek * (clamp(input.bookPct, 100) / 100);
  const weekly = lostJobsPerWeek * clamp(input.jobValue);
  return {
    missedPerMonth: (missedPerWeek * 52) / 12,
    monthly: (weekly * 52) / 12,
    yearly: weekly * 52,
  };
}

const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const FIELDS = [
  { key: "callsPerWeek", label: "Calls per week", suffix: "", max: 10000, step: 1 },
  { key: "missedPct", label: "Calls missed", suffix: "%", max: 100, step: 1 },
  { key: "bookPct", label: "Missed callers who would have booked", suffix: "%", max: 100, step: 1 },
  { key: "jobValue", label: "Average job value", suffix: "$", max: 1000000, step: 10 },
] as const;
type Key = (typeof FIELDS)[number]["key"];

export default function MissedCallCalculator() {
  const id = useId();
  // Example values only, for the visitor to replace with their own.
  const [values, setValues] = useState<Record<Key, string>>({
    callsPerWeek: "40",
    missedPct: "20",
    bookPct: "30",
    jobValue: "400",
  });
  const n = (k: Key) => Number(values[k]);
  const r = missedCallEstimate({ callsPerWeek: n("callsPerWeek"), missedPct: n("missedPct"), bookPct: n("bookPct"), jobValue: n("jobValue") });

  return (
    <section className="tool-page section-space" aria-labelledby="mc-title">
      <div className="page-width tool-layout">
        <div className="tool-intro">
          <p className="eyebrow">Free tool</p>
          <h1 id="mc-title">
            What do missed calls
            <br />
            <em>cost you?</em>
          </h1>
          <p>Enter your own numbers. The starting values are examples only.</p>
        </div>
        <form className="tool-form" onSubmit={(e) => e.preventDefault()}>
          {FIELDS.map((f) => (
            <label key={f.key} htmlFor={`${id}-${f.key}`} className="tool-field">
              <span>{f.label}</span>
              <span className={`tool-input${f.suffix === "$" ? " is-money" : f.suffix ? " is-pct" : ""}`}>
                <input
                  id={`${id}-${f.key}`}
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={f.max}
                  step={f.step}
                  value={values[f.key]}
                  onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                />
              </span>
            </label>
          ))}
        </form>
        <div className="tool-result" aria-live="polite">
          <p className="tool-result-label">Estimated revenue at risk</p>
          <p className="tool-figure">
            {money(r.monthly)}
            <small> a month</small>
          </p>
          <p className="tool-figure is-secondary">
            {money(r.yearly)}
            <small> a year</small>
          </p>
          <p className="tool-note">
            An estimate from your inputs: about {Math.round(r.missedPerMonth)} missed calls a month, times the share
            who would have booked, times your average job value. Not a forecast.
          </p>
          <ToolCta
            source="Missed-call calculator"
            context={`Missed-call calculator: about ${money(r.monthly)} a month at risk (visitor's inputs).`}
          />
        </div>
      </div>
    </section>
  );
}
