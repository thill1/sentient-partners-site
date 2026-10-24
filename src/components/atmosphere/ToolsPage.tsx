import { ArrowRight } from "lucide-react";
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
      <SiteCheck />
    </>
  );
}
