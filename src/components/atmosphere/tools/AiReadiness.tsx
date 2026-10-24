import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { openContactModal } from "../../../lib/siteActions";
import ToolCta from "./ToolCta";
import ToolBack from "./ToolBack";

/** Each answer scores 0-3. Low-scoring areas become the next steps. */
export const QUESTIONS = [
  {
    id: "calls",
    q: "When you can't pick up, what happens to the call?",
    options: ["It rings out", "Voicemail, returned when we can", "Someone else answers", "It's answered or texted back right away"],
    step: "Make sure every call is answered or followed up, including after hours.",
  },
  {
    id: "booking",
    q: "How do customers book with you?",
    options: ["Phone or email back-and-forth", "A form we reply to", "Online booking for some services", "Online booking with reminders"],
    step: "Let customers book online and send reminders automatically.",
  },
  {
    id: "followup",
    q: "How do you follow up on quotes and leads?",
    options: ["We often don't", "When we remember", "A list or calendar reminder", "Automatic, with someone checking"],
    step: "Set up follow-up on every quote so none go cold.",
  },
  {
    id: "invoicing",
    q: "How do you invoice and get paid?",
    options: ["Paper or manual", "Spreadsheet or Word templates", "Accounting software", "Invoices go out automatically with online payment"],
    step: "Send invoices from the job record and take payment online.",
  },
  {
    id: "data",
    q: "Where does customer information live?",
    options: ["Mostly in people's heads", "Spread across phones, email and paper", "One spreadsheet", "One system everyone uses"],
    step: "Bring customer details into one place everyone uses.",
  },
  {
    id: "entry",
    q: "How much retyping do you do between tools?",
    options: ["Hours every week", "Some most days", "A little", "Almost none, our tools are connected"],
    step: "Connect the tools you have so details are entered once.",
  },
  {
    id: "website",
    q: "How well does your website work on a phone?",
    options: ["We don't have one", "It's dated or hard to use", "It works, but it's not easy to call or book", "Fast, clear, with tap-to-call and booking"],
    step: "Make the website easy to call and book from a phone.",
  },
  {
    id: "reviews",
    q: "How do you ask for reviews?",
    options: ["We don't", "Now and then", "After most jobs", "Automatically, and we reply to them"],
    step: "Ask every happy customer for a review and reply to each one.",
  },
  {
    id: "team",
    q: "How comfortable is your team with new software?",
    options: ["Reluctant", "Willing with help", "Comfortable", "Keen to try new tools"],
    step: "Start with one small, well-supported change the team can see working.",
  },
] as const;

export function readiness(answers: Record<string, number>) {
  const max = QUESTIONS.length * 3;
  const total = QUESTIONS.reduce((sum, q) => sum + (answers[q.id] ?? 0), 0);
  const steps = [...QUESTIONS]
    .map((q, i) => ({ step: q.step, score: answers[q.id] ?? 0, i }))
    .sort((a, b) => a.score - b.score || a.i - b.i)
    .slice(0, 3)
    .map((s) => s.step);
  return { score: Math.round((total / max) * 100), steps };
}

const band = (score: number) =>
  score >= 75 ? "Well set up. The gains now are in connecting what you have." : score >= 45 ? "A solid base, with clear room to save time." : "Plenty of room to save time, starting with the basics.";

export default function AiReadiness() {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [done, setDone] = useState(false);
  const answered = QUESTIONS.filter((q) => answers[q.id] !== undefined).length;
  const result = readiness(answers);

  return (
    <section className="tool-page section-space" aria-labelledby="ar-title">
      <nav className="tool-backbar" aria-label="Tools">
        <div className="page-width">
          <ToolBack />
        </div>
      </nav>
      <div className="page-width tool-layout is-single">
        <div className="tool-intro">
          <p className="eyebrow">Free tool</p>
          <h1 id="ar-title">
            How ready is your business
            <br />
            <em>for AI?</em>
          </h1>
          <p>Nine quick questions. Your answers stay in your browser.</p>
        </div>
        {!done ? (
          <form
            className="ar-form"
            onSubmit={(e) => {
              e.preventDefault();
              setDone(true);
              requestAnimationFrame(() => document.getElementById("ar-result")?.scrollIntoView({ block: "start" }));
            }}
          >
            {QUESTIONS.map((q, qi) => (
              <fieldset key={q.id} className="ar-q">
                <legend>
                  <span>{qi + 1}</span> {q.q}
                </legend>
                <div className="ar-options">
                  {q.options.map((label, value) => (
                    <label key={label} className={answers[q.id] === value ? "is-on" : ""}>
                      <input
                        type="radio"
                        name={q.id}
                        value={value}
                        checked={answers[q.id] === value}
                        onChange={() => setAnswers({ ...answers, [q.id]: value })}
                        required
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
            <button className="cta-primary" type="submit" disabled={answered < QUESTIONS.length}>
              See my score <ArrowRight size={16} aria-hidden="true" />
            </button>
            <p className="tool-note">{answered} of {QUESTIONS.length} answered</p>
          </form>
        ) : (
          <div id="ar-result" className="tool-result" aria-live="polite">
            <p className="tool-result-label">Your readiness score</p>
            <p className="tool-figure">
              {result.score}
              <small> / 100</small>
            </p>
            <p className="tool-band">{band(result.score)}</p>
            <p className="tool-result-label">Three next steps</p>
            <ol className="ar-steps">
              {result.steps.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
            <p className="tool-note">A guide based on your answers, not an assessment of your business.</p>
            <ToolCta source="AI readiness check" context={`AI readiness check: ${result.score}/100. Next steps: ${result.steps.join(" ")}`} />
            <div className="ar-more">
              <button
                type="button"
                className="text-link"
                onClick={() =>
                  openContactModal({
                    source: "AI readiness check",
                    inquiry: `My AI readiness score: ${result.score}/100.\nNext steps suggested:\n- ${result.steps.join("\n- ")}`,
                  })
                }
              >
                Send my results to Troy
              </button>
              <button type="button" className="text-link" onClick={() => { setDone(false); setAnswers({}); }}>
                Start again
              </button>
            </div>
            <p className="tool-related">
              Free templates: <a href="/templates/automation-starter-checklist.pdf" download>Automation starter checklist (PDF)</a>
              {" · "}
              <a href="/templates/ai-use-policy.docx" download>AI use policy (Word)</a>
            </p>
            <ToolBack label="Back to all tools" end />
          </div>
        )}
      </div>
    </section>
  );
}
