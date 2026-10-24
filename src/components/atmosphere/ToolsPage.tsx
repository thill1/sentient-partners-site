import { ArrowRight, Download } from "lucide-react";
import SiteCheck from "./SiteCheck";
import "./tools.css";

/**
 * Free tools for business owners. One card per live tool; add a card here
 * when a new tool ships (no placeholders).
 */
const tools = [
  {
    href: "#website-check",
    eyebrow: "Website",
    title: "Website check",
    copy: "A plain-English check of phones, search, speed and booking, in about 20 seconds.",
  },
  {
    href: "/tools/missed-call-calculator/",
    eyebrow: "Calls",
    title: "Missed-call calculator",
    copy: "What unanswered calls may cost you a month, from your own numbers.",
  },
  {
    href: "/tools/ai-readiness/",
    eyebrow: "Operations",
    title: "AI readiness check",
    copy: "Nine quick questions, a score out of 100 and three next steps.",
  },
  {
    href: "/tools/time-back/",
    eyebrow: "Time",
    title: "Time-back estimator",
    copy: "Hours a week you might get back from admin, from your own numbers.",
  },
  {
    href: "/tools/reputation/",
    eyebrow: "Reviews",
    title: "Reputation snapshot",
    copy: "A quick self-check of your reviews, with three next steps.",
  },
];

/** Free downloads. Files are built by scripts/templates/build.py. */
export const templates = [
  {
    title: "Review request kit",
    copy: "Texts and emails to ask for reviews, and replies for good, mixed and bad ones.",
    files: [{ label: "PDF", href: "/templates/review-request-kit.pdf" }],
  },
  {
    title: "Missed-call text-back scripts",
    copy: "Ready-to-edit texts for after hours, busy moments, voicemails and next-day follow-up.",
    files: [{ label: "PDF", href: "/templates/missed-call-text-back-scripts.pdf" }],
  },
  {
    title: "Weekly owner scorecard",
    copy: "Nine numbers to track each week, from calls missed to cash collected.",
    files: [
      { label: "Excel", href: "/templates/weekly-owner-scorecard.xlsx" },
      { label: "CSV", href: "/templates/weekly-owner-scorecard.csv" },
      { label: "PDF", href: "/templates/weekly-owner-scorecard.pdf" },
    ],
  },
  {
    title: "Estimate and quote template",
    copy: "Line items with totals worked out, a terms section and a follow-up schedule.",
    files: [
      { label: "Excel", href: "/templates/estimate-quote-template.xlsx" },
      { label: "PDF", href: "/templates/estimate-quote-template.pdf" },
    ],
  },
  {
    title: "Automation starter checklist",
    copy: "The first ten things to automate, in order, and what each one replaces.",
    files: [{ label: "PDF", href: "/templates/automation-starter-checklist.pdf" }],
  },
  {
    title: "AI use policy for small teams",
    copy: "A one-page, editable policy on what staff can and can't put into AI tools.",
    files: [
      { label: "Word", href: "/templates/ai-use-policy.docx" },
      { label: "PDF", href: "/templates/ai-use-policy.pdf" },
    ],
  },
];

export default function ToolsPage() {
  return (
    <>
      <section className="tools-hero" aria-labelledby="tools-title">
        <div className="page-width">
          <p className="eyebrow">Free tools</p>
          <h1 id="tools-title">
            Tools for
            <br />
            <em>growing businesses.</em>
          </h1>
          <p className="tools-lede">
            Free, quick, and yours to keep.
          </p>
          <ul className="tools-grid">
            {tools.map((tool) => (
              <li key={tool.href}>
                <a className="tool-card" href={tool.href}>
                  <span className="tool-eyebrow">{tool.eyebrow}</span>
                  <strong>{tool.title}</strong>
                  <span className="tool-copy">{tool.copy}</span>
                  <span className="tool-go">
                    Start <ArrowRight size={15} aria-hidden="true" />
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <section id="templates" className="templates-section" aria-labelledby="templates-title">
        <div className="page-width">
          <p className="eyebrow">Free templates</p>
          <h2 id="templates-title">Take these with you.</h2>
          <ul className="templates-list">
            {templates.map((t) => (
              <li key={t.title} className="template-row">
                <div>
                  <strong>{t.title}</strong>
                  <span>{t.copy}</span>
                </div>
                <div className="template-files">
                  {t.files.map((f) => (
                    <a key={f.href} className="template-download" href={f.href} download>
                      <Download size={15} aria-hidden="true" /> {f.label}
                      <span className="sr-only"> download of {t.title}</span>
                    </a>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <SiteCheck />
    </>
  );
}
