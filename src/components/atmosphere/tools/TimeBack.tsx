import { useId, useState } from "react";
import ToolCta from "./ToolCta";
import ToolBack from "./ToolBack";

/** Hours freed, from the visitor's own time and the share they think could be automated. */
export function timeBack(input: { hours: number[]; sharePct: number; hourly: number }) {
  const ok = (n: number, max = Infinity) => (Number.isFinite(n) ? Math.min(Math.max(n, 0), max) : 0);
  const weeklyNow = input.hours.reduce((s, h) => s + ok(h, 168), 0);
  const weekly = weeklyNow * (ok(input.sharePct, 100) / 100);
  return { weeklyNow, weekly, yearly: weekly * 52, value: weekly * 52 * ok(input.hourly) };
}

const TASKS = [
  { key: "scheduling", label: "Scheduling and rescheduling" },
  { key: "invoicing", label: "Invoicing and chasing payment" },
  { key: "followups", label: "Follow-ups on quotes and leads" },
  { key: "reentry", label: "Retyping data between tools" },
] as const;
type Key = (typeof TASKS)[number]["key"] | "share" | "hourly";

const fmt = (n: number) => (Math.round(n * 10) / 10).toLocaleString("en-US");
const money = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export default function TimeBack() {
  const id = useId();
  // Example values only, for the visitor to replace.
  const [v, setV] = useState<Record<Key, string>>({
    scheduling: "3",
    invoicing: "2",
    followups: "2",
    reentry: "3",
    share: "50",
    hourly: "",
  });
  const r = timeBack({ hours: TASKS.map((t) => Number(v[t.key])), sharePct: Number(v.share), hourly: Number(v.hourly) });
  const field = (key: Key, label: string, kind: "" | "pct" | "money", hint?: string) => (
    <label key={key} htmlFor={`${id}-${key}`} className="tool-field">
      <span>{label}</span>
      <span className={`tool-input${kind === "money" ? " is-money" : kind === "pct" ? " is-pct" : " is-hours"}`}>
        <input
          id={`${id}-${key}`}
          type="number"
          inputMode="decimal"
          min={0}
          max={kind === "pct" ? 100 : undefined}
          step={kind === "money" ? 5 : 0.5}
          placeholder={kind === "money" ? "Optional" : undefined}
          value={v[key]}
          onChange={(e) => setV({ ...v, [key]: e.target.value })}
        />
      </span>
      {hint && <small className="tool-hint">{hint}</small>}
    </label>
  );

  return (
    <section className="tool-page section-space" aria-labelledby="tb-title">
      <nav className="tool-backbar" aria-label="Tools">
        <div className="page-width">
          <ToolBack />
        </div>
      </nav>
      <div className="page-width tool-layout">
        <div className="tool-intro">
          <p className="eyebrow">Free tool</p>
          <h1 id="tb-title">
            How much time
            <br />
            <em>could you get back?</em>
          </h1>
          <p>Hours per week on each task. The starting values are examples only.</p>
        </div>
        <form className="tool-form" onSubmit={(e) => e.preventDefault()}>
          {TASKS.map((t) => field(t.key, t.label, ""))}
          {field("share", "Share that could be automated", "pct", "Your assumption. 50% is only a starting point; change it.")}
          {field("hourly", "Value of an hour (optional)", "money")}
        </form>
        <div className="tool-result" aria-live="polite">
          <p className="tool-result-label">Estimated time back</p>
          <p className="tool-figure">
            {fmt(r.weekly)}
            <small> hours a week</small>
          </p>
          <p className="tool-figure is-secondary">
            {fmt(r.yearly)}
            <small> hours a year</small>
          </p>
          {r.value > 0 && (
            <p className="tool-band">About {money(r.value)} a year at your hourly value.</p>
          )}
          <p className="tool-note">
            An estimate from your inputs: {fmt(r.weeklyNow)} hours a week on these tasks, times the {fmt(Number(v.share) || 0)}% you
            set. Not a forecast.
          </p>
          <ToolCta source="Time-back estimator" context={`Time-back estimator: about ${fmt(r.weekly)} hours a week (visitor's inputs).`} />
          <ToolBack label="Back to all tools" end />
        </div>
      </div>
    </section>
  );
}
