import { Component, lazy, Suspense, useState, type ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { BOOKING_URL } from "../../content/siteContent";
import { openBookingModal } from "../../lib/siteActions";
import "./interactive-demos.css";

const RelayWalkthrough = lazy(() => import("./demos/RelayWalkthrough"));
const VoiceExample = lazy(() => import("./demos/VoiceExample"));

class DemoBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <p role="alert" className="demo-load-message">This demo could not load. <a href="#interactive-demos" onClick={() => window.location.reload()}>Reload the page to try again.</a></p>;
    return this.props.children;
  }
}

export default function InteractiveDemos() {
  const [active, setActive] = useState<"relay" | "voice" | null>(null);
  return (
    <section id="interactive-demos" className="interactive-demos" aria-labelledby="demos-title">
      <div className="page-width">
        <header className="demos-heading">
          <h2 id="demos-title">See the systems <em>at work.</em></h2>
          <p>Explore Sentient Relay or step through an example of this site's voice assistant. A closer look at the systems behind our consultancy work.</p>
        </header>
        <div className="demo-choices" role="group" aria-label="Choose an interactive demo">
          <button type="button" aria-pressed={active === "relay"} aria-controls="interactive-demo-panel" onClick={() => setActive("relay")}>
            <span><strong>Explore Sentient Relay</strong><small>Nine app screens · In pilot</small></span><ArrowRight size={20} aria-hidden="true" />
          </button>
          <button type="button" aria-pressed={active === "voice"} aria-controls="interactive-demo-panel" onClick={() => setActive("voice")}>
            <span><strong>Read the voice example</strong><small>Website assistant · Scripted conversation</small></span><ArrowRight size={20} aria-hidden="true" />
          </button>
        </div>
        <div id="interactive-demo-panel" className="interactive-demo-panel" role="region" aria-label={active === "voice" ? "Website voice assistant example" : "Sentient Relay walkthrough"}>
          {active ? (
            <DemoBoundary key={active}>
              <Suspense fallback={<p role="status" className="demo-load-message">Loading {active === "relay" ? "Relay walkthrough" : "voice example"}…</p>}>
                {active === "relay" ? <RelayWalkthrough /> : <VoiceExample />}
              </Suspense>
            </DemoBoundary>
          ) : <p className="demo-idle">Choose a demo above. Explore at your own pace.</p>}
        </div>
        <div className="demos-footer">
          <p>Let's talk about what would help your business.</p>
          <a className="text-link" href={BOOKING_URL} onClick={(event) => {
            event.preventDefault();
            openBookingModal({ source: "Capabilities demos", ctaLabel: "Book a 20-minute intro call" });
          }}>Book a 20-minute intro call <ArrowRight size={16} aria-hidden="true" /></a>
        </div>
      </div>
    </section>
  );
}
