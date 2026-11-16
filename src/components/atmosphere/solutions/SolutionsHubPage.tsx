import { SOLUTIONS, SOLUTIONS_HUB, SOLUTION_GROUPS } from "../../../content/siteNav";
import BookIntroCall from "./BookIntroCall";
import SolutionCard from "./SolutionCard";
import SolutionLinks from "./SolutionLinks";
import { RELAY_CARD, solutionCard } from "./solutionCards";
import "../tools.css";
import "./solutions.css";

/** /solutions/: every solution by group, then Sentient Relay and the PDF. */
export default function SolutionsHubPage() {
  return (
    <section className="tools-hero solutions-hub" aria-labelledby="solutions-title">
      <div className="page-width">
        <p className="eyebrow">{SOLUTIONS_HUB.label}</p>
        <h1 id="solutions-title">{SOLUTIONS_HUB.headline}</h1>
        <p className="tools-lede">{SOLUTIONS_HUB.lede}</p>
        {SOLUTION_GROUPS.map((group) => (
          <div key={group.id} className="solutions-group">
            <h2 id={`solutions-${group.id}`}>{group.label}</h2>
            <p className="solutions-group-summary">{group.summary}</p>
            <ul className="tools-grid" aria-labelledby={`solutions-${group.id}`}>
              {SOLUTIONS.filter((solution) => solution.group === group.id).map((solution) => (
                <li key={solution.slug}>
                  <SolutionCard {...solutionCard(solution)} eyebrow={group.label} />
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div className="solutions-group">
          <h2 id="solutions-products">Products</h2>
          <ul className="tools-grid" aria-labelledby="solutions-products">
            <li>
              <SolutionCard {...RELAY_CARD} />
            </li>
          </ul>
        </div>
        <div className="solution-actions">
          <BookIntroCall source="Solutions hub" />
        </div>
        <SolutionLinks showHubLink={false} />
      </div>
    </section>
  );
}
