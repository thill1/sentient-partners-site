import { ArrowLeft } from "lucide-react";
import { RELAY, SOLUTIONS_HUB } from "../../../content/siteNav";
import { RelayShowcase } from "../RelayShowcase";
import BookIntroCall from "./BookIntroCall";
import SolutionLinks from "./SolutionLinks";
import "../tools.css";
import "./solutions.css";

/** /relay/: Sentient Relay, always marked as in pilot. */
export default function RelayPage() {
  return (
    <section className="tool-page relay-page section-space" aria-labelledby="relay-page-title">
      <nav className="tool-backbar" aria-label="Solutions">
        <div className="page-width">
          <a className="tool-back" href={SOLUTIONS_HUB.path}>
            <ArrowLeft size={15} aria-hidden="true" /> {SOLUTIONS_HUB.allLabel}
          </a>
        </div>
      </nav>
      <div className="page-width solution-layout">
        <div className="tool-intro">
          <p className="eyebrow">Products</p>
          <h1 id="relay-page-title">
            {RELAY.name} <span className="pilot-badge">{RELAY.status}</span>
          </h1>
        </div>
        <RelayShowcase headingLevel="h2" />
        <div className="solution-actions">
          <BookIntroCall source="Sentient Relay page" />
        </div>
        <SolutionLinks />
      </div>
    </section>
  );
}
