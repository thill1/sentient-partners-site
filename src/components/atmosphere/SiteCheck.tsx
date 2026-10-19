import { useId, useRef, useState } from "react";
import { ArrowRight, Check, AlertCircle, XCircle, Loader2 } from "lucide-react";
import { BOOKING_URL } from "../../content/siteContent";
import { openBookingModal } from "../../lib/siteActions";
import { submitLead } from "../../services/geminiService";
import "./site-check.css";

type Status = "pass" | "warn" | "fail";
interface Check {
  id: string;
  label: string;
  status: Status;
  detail: string;
}
interface Report {
  host: string;
  url: string;
  score: number;
  checks: Check[];
  summary: string;
}
type Phase = "idle" | "checking" | "done" | "error";

const STEPS = [
  "Opening your homepage",
  "Checking mobile and search basics",
  "Looking for ways to call and book",
  "Writing your summary",
];

const icon = (s: Status) =>
  s === "pass" ? (
    <Check size={16} aria-hidden="true" />
  ) : s === "warn" ? (
    <AlertCircle size={16} aria-hidden="true" />
  ) : (
    <XCircle size={16} aria-hidden="true" />
  );
const statusText = { pass: "Looks good", warn: "Could be better", fail: "Needs attention" };

/**
 * A free, instant check of a local business website: the basics that win
 * customers (mobile, search snippet, tap-to-call, booking, local signals,
 * after-hours answers, speed). Runs server-side in /api/site-check.
 */
export default function SiteCheck() {
  const [address, setAddress] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [report, setReport] = useState<Report | null>(null);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState<"" | "sending" | "sent" | "failed">("");
  const results = useRef<HTMLDivElement>(null);
  const inputId = useId();

  const run = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!address.trim() || phase === "checking") return;
    setPhase("checking");
    setError("");
    setReport(null);
    setSent("");
    setStep(0);
    const ticker = window.setInterval(
      () => setStep((s) => Math.min(STEPS.length - 1, s + 1)),
      2200,
    );
    try {
      const response = await fetch("/api/site-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: address }),
      });
      const data = (await response.json().catch(() => ({}))) as Partial<Report> & {
        ok?: boolean;
        error?: string;
      };
      if (!response.ok || !data.ok || !data.checks) {
        throw new Error(data.error || "The check didn't finish. Please try again.");
      }
      setReport(data as Report);
      setPhase("done");
      requestAnimationFrame(() => results.current?.focus());
    } catch (e) {
      setError(e instanceof Error ? e.message : "The check didn't finish. Please try again.");
      setPhase("error");
    } finally {
      window.clearInterval(ticker);
    }
  };

  const emailReport = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!report || !/^\S+@\S+\.\S+$/.test(email.trim())) return;
    setSent("sending");
    const lines = report.checks
      .map((c) => `${statusText[c.status]}: ${c.label}. ${c.detail}`)
      .join("\n");
    const reportText = `Website check for ${report.host} (score ${report.score}/100).\n\n${report.summary}\n\n${lines}`;
    const result = await submitLead(
      {
        name: email.trim(),
        email: email.trim(),
        inquiry: reportText,
        intent: "blueprint",
        source: "Website check",
        ctaLabel: "Send me this report",
      },
      "",
      {
        autoresponse: `${reportText}\n\nWant a walkthrough of what's worth fixing? Book a 20-minute intro call at https://sentientpartners.ai or reply to this email.\n\n— Troy, Sentient Partners`,
      },
    );
    setSent(result.success ? "sent" : "failed");
  };

  const misses = report?.checks.filter((c) => c.status !== "pass").length ?? 0;

  return (
    <section id="website-check" className="site-check section-space" aria-labelledby="site-check-title">
      <div className="page-width sc-layout">
        <div className="sc-intro">
          <p className="eyebrow">Free website check</p>
          <h2 id="site-check-title">
            How does your website
            <br />
            <em>hold up?</em>
          </h2>
          <p>
            Enter your address. In about 20 seconds you'll get a plain-English
            check of the basics that win local customers: phones, search, speed,
            and how easy you are to call or book.
          </p>
          <form className="sc-form" onSubmit={run}>
            <label htmlFor={inputId}>Your website</label>
            <div className="sc-row">
              <input
                id={inputId}
                type="text"
                inputMode="url"
                autoComplete="url"
                spellCheck={false}
                placeholder="yourbusiness.com"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                aria-describedby={`${inputId}-note`}
                required
              />
              <button className="cta-primary" type="submit" disabled={phase === "checking"}>
                {phase === "checking" ? (
                  <>
                    <Loader2 size={17} className="sc-spin" aria-hidden="true" /> Checking
                  </>
                ) : (
                  <>
                    Check my site <ArrowRight size={17} aria-hidden="true" />
                  </>
                )}
              </button>
            </div>
            <p id={`${inputId}-note`} className="sc-note">
              We look at your public homepage only. Nothing is stored unless you
              ask us to email the report.
            </p>
          </form>
        </div>

        <div
          className={`sc-panel is-${phase}`}
          ref={results}
          tabIndex={-1}
          aria-live="polite"
          aria-busy={phase === "checking"}
        >
          {phase === "idle" && (
            <div className="sc-empty">
              <ul aria-label="What we check">
                {[
                  "Built for phones",
                  "Search result preview",
                  "Easy to call",
                  "A clear next step",
                  "Local search signals",
                  "After-hours answers",
                  "Server response",
                ].map((label) => (
                  <li key={label}>
                    <span aria-hidden="true" />
                    {label}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {phase === "checking" && (
            <ol className="sc-steps" aria-label="Progress">
              {STEPS.map((label, i) => (
                <li key={label} className={i < step ? "is-done" : i === step ? "is-active" : ""}>
                  {i < step ? <Check size={15} aria-hidden="true" /> : <span aria-hidden="true" />}
                  {label}
                </li>
              ))}
            </ol>
          )}

          {phase === "error" && (
            <div className="sc-error" role="alert">
              <AlertCircle size={20} aria-hidden="true" />
              <p>{error}</p>
            </div>
          )}

          {phase === "done" && report && (
            <div className="sc-report">
              <div className="sc-head">
                <div
                  className="sc-score"
                  style={{ "--score": report.score } as React.CSSProperties}
                  role="img"
                  aria-label={`Score ${report.score} out of 100`}
                >
                  <strong>{report.score}</strong>
                  <small>of 100</small>
                </div>
                <div>
                  <p className="sc-host">{report.host}</p>
                  <p className="sc-summary">{report.summary}</p>
                </div>
              </div>
              <ul className="sc-checks">
                {report.checks.map((c) => (
                  <li key={c.id} className={`is-${c.status}`}>
                    <span className="sc-icon" title={statusText[c.status]}>
                      {icon(c.status)}
                      <span className="sr-only">{statusText[c.status]}: </span>
                    </span>
                    <div>
                      <strong>{c.label}</strong>
                      <p>{c.detail}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="sc-next">
                <p>
                  {misses
                    ? `Want a walkthrough of the ${misses === 1 ? "one thing" : `${misses} things`} worth fixing?`
                    : "Want to talk about what's next for your site?"}
                </p>
                <a
                  className="cta-primary"
                  href={BOOKING_URL}
                  onClick={(e) => {
                    e.preventDefault();
                    openBookingModal({
                      source: "Website check",
                      ctaLabel: "Book a 20-minute intro call",
                    });
                  }}
                >
                  Book a 20-minute intro call <ArrowRight size={16} aria-hidden="true" />
                </a>
                {sent === "sent" ? (
                  <p className="sc-sent" role="status">
                    Sent. Check your inbox for the report (and spam, just in case).
                  </p>
                ) : (
                  <form className="sc-email" onSubmit={emailReport}>
                    <label htmlFor={`${inputId}-email`}>Or email me this report</label>
                    <div className="sc-row">
                      <input
                        id={`${inputId}-email`}
                        type="email"
                        autoComplete="email"
                        placeholder="you@yourbusiness.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                      <button type="submit" disabled={sent === "sending"}>
                        {sent === "sending" ? "Sending…" : "Send"}
                      </button>
                    </div>
                    {sent === "failed" && (
                      <p className="sc-fail" role="alert">
                        That didn't send. Email hello@sentientpartners.ai and we'll take it from there.
                      </p>
                    )}
                  </form>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
