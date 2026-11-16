import { ArrowLeft, ArrowUpRight } from "lucide-react";
import {
  PROCESS,
  SOLUTIONS_HUB,
  groupOfSolution,
  relatedSolutions,
} from "../../../content/siteNav";
import type { Solution } from "../../../content/siteNav";
import { openContactModal } from "../../../lib/siteActions";
import BookIntroCall from "./BookIntroCall";
import SolutionCard from "./SolutionCard";
import SolutionLinks from "./SolutionLinks";
import { solutionCard } from "./solutionCards";
import { SOLUTION_DEMOS } from "./solutionDemos";
import "../capabilities.css";
import "../tools.css";
import "./solutions.css";

/**
 * /solutions/<slug>/: name, summary, the live demo (or, for advisory, how we
 * partner), what's included, the two next steps, related solutions, the PDF.
 */
export default function SolutionPage({ solution }: { solution: Solution }) {
  const Demo = SOLUTION_DEMOS[solution.slug];
  const related = relatedSolutions(solution);
  const titleId = `solution-${solution.slug}-title`;
  return (
    <section className="tool-page solution-page section-space" aria-labelledby={titleId}>
      <nav className="tool-backbar" aria-label="Solutions">
        <div className="page-width">
          <a className="tool-back" href={SOLUTIONS_HUB.path}>
            <ArrowLeft size={15} aria-hidden="true" /> {SOLUTIONS_HUB.allLabel}
          </a>
        </div>
      </nav>
      <div className="page-width solution-layout">
        <div className="tool-intro">
          <p className="eyebrow">{groupOfSolution(solution).label}</p>
          <h1 id={titleId}>{solution.title}</h1>
          <p className="solution-headline">{solution.page.headline}</p>
          <p>{solution.page.lede}</p>
        </div>

        {Demo && (
          <div className="solution-demo">
            <div className="jf-screen solution-demo-screen">
              <Demo />
            </div>
            <p className="tool-note">Sample screen with sample data.</p>
          </div>
        )}

        {solution.kind === "advisory" && (
          <div className="solution-block">
            <h2>{PROCESS.eyebrow}</h2>
            <ol className="solution-steps">
              {PROCESS.steps.map((step) => (
                <li key={step.title}>
                  <strong>{step.title}</strong>
                  <span>{step.copy}</span>
                </li>
              ))}
            </ol>
            <p className="solution-promise">{PROCESS.promise}</p>
          </div>
        )}

        {solution.page.includes.length > 0 && (
          <div className="solution-block">
            <h2>What's included</h2>
            <ul className="solution-includes">
              {solution.page.includes.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="solution-actions">
          <BookIntroCall source={`Solution: ${solution.title}`} />
          <button
            type="button"
            className="tool-ask"
            onClick={() =>
              openContactModal({
                source: `Solution: ${solution.title}`,
                inquiry: `I'd like to explore ${solution.title.toLowerCase()} for my business.`,
              })
            }
          >
            Discuss {solution.title} <ArrowUpRight size={16} aria-hidden="true" />
          </button>
        </div>

        {related.length > 0 && (
          <div className="solution-block">
            <h2>Related solutions</h2>
            <ul className="tools-grid">
              {related.map((other) => (
                <li key={other.slug}>
                  <SolutionCard {...solutionCard(other)} />
                </li>
              ))}
            </ul>
          </div>
        )}

        <SolutionLinks />
      </div>
    </section>
  );
}
