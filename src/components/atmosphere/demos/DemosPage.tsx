import { ArrowLeft } from "lucide-react";
import ToolCta from "../tools/ToolCta";
import { RelayWalkthrough } from "./RelayWalkthrough";
import { SiteVoiceExample } from "./SiteVoiceExample";
import "./demos.css";

export function DemosPage() {
  return (
    <section className="tool-page demos-page section-space" aria-labelledby="demos-title">
      <nav className="tool-backbar" aria-label="Back">
        <div className="page-width">
          <a className="tool-back" href="/#capabilities">
            <ArrowLeft size={15} aria-hidden="true" /> Capabilities
          </a>
        </div>
      </nav>
      <div className="page-width">
        <header className="tool-intro">
          <p className="eyebrow">Interactive demos</p>
          <h1 id="demos-title">
            A closer look
            <br />
            <em>at the work.</em>
          </h1>
          <p>
            Click through Sentient Relay, in pilot, on sample data. Then play a scripted
            example of the voice assistant on this site. The example does not start a live
            conversation.
          </p>
        </header>
        <RelayWalkthrough />
        <SiteVoiceExample />
        <div className="demos-close">
          <p>
            Sentient Relay is in pilot. The voice example is a script. When you want to
            talk about your business, book a 20-minute introductory call.
          </p>
          <ToolCta source="Demos page" />
        </div>
      </div>
    </section>
  );
}
