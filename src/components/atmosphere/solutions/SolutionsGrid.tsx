import { CAPABILITY_SOLUTIONS } from "../../../content/siteNav";
import SolutionCard from "./SolutionCard";
import SolutionLinks from "./SolutionLinks";
import { RELAY_CARD, solutionCard } from "./solutionCards";
import "../tools.css";
import "./solutions.css";

/**
 * Homepage "Solutions at a glance": a static grid (no pinning, no carousel)
 * naming every capability plus Sentient Relay, each linking to its own page.
 */
export default function SolutionsGrid() {
  const cards = [...CAPABILITY_SOLUTIONS.map(solutionCard), RELAY_CARD];
  return (
    <section id="solutions" className="solutions-glance section-space" aria-labelledby="solutions-glance-title">
      <div className="page-width">
        <p className="eyebrow">Solutions</p>
        <h2 id="solutions-glance-title">
          Solutions <em>at a glance.</em>
        </h2>
        <ul className="tools-grid solutions-grid">
          {cards.map((card) => (
            <li key={card.href}>
              <SolutionCard {...card} />
            </li>
          ))}
        </ul>
        <SolutionLinks />
      </div>
    </section>
  );
}
