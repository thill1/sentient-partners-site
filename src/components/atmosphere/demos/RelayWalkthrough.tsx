import { useState } from "react";
import { ArrowLeft, ArrowRight, RotateCcw } from "lucide-react";
import { relayScreens } from "./relayScreens";

export default function RelayWalkthrough() {
  const [step, setStep] = useState(0);
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const screen = relayScreens[step];

  return (
    <div className="demo-relay">
      <div className="demo-relay-copy">
        <h3>Sentient Relay <span className="demo-status">In pilot</span></h3>
        <p className="demo-summary">A service day, from the next visit to the customer's signature.</p>
        <p className="demo-disclosure">Real app screens with sample data. Use the screen list or the next and previous buttons to explore.</p>
        <ol className="demo-screen-list" aria-label="Relay walkthrough screens">
          {relayScreens.map((item, index) => (
            <li key={item.file}>
              <button type="button" aria-current={step === index ? "step" : undefined} aria-controls="relay-screen" onClick={() => setStep(index)}>
                <span>{String(index + 1).padStart(2, "0")}</span>{item.title}
                {step === index && <ArrowRight size={16} aria-hidden="true" />}
              </button>
            </li>
          ))}
        </ol>
      </div>
      <div className="demo-relay-view" id="relay-screen" role="region" aria-label="Selected Relay screen">
        <div className="demo-step-copy" aria-live="polite" aria-atomic="true">
          <p className="demo-count">Screen {step + 1} of {relayScreens.length}</p>
          <h4>{screen.title}</h4>
          <p>{screen.description}</p>
        </div>
        <figure className="demo-phone">
          {failedImage === screen.file ? (
            <div className="demo-image-error" role="status">
              <p>This screen could not load. Try opening the image, or choose another screen.</p>
              <a href={`/showcase/relay/${screen.file}.webp`}>Open {screen.title} image</a>
            </div>
          ) : (
            <img key={screen.file} src={`/showcase/relay/${screen.file}.webp?v=9`} width={640} height={screen.height} alt={screen.alt} loading="lazy" decoding="async" onError={() => setFailedImage(screen.file)} />
          )}
          <figcaption>Screen preview · sample data</figcaption>
        </figure>
        <div className="demo-controls" role="group" aria-label="Navigate Relay screens">
          <button type="button" disabled={step === 0} onClick={() => setStep(step - 1)}><ArrowLeft size={16} aria-hidden="true" /> Previous</button>
          {step < relayScreens.length - 1 ? (
            <button type="button" onClick={() => setStep(step + 1)}>Next screen <ArrowRight size={16} aria-hidden="true" /></button>
          ) : (
            <button type="button" onClick={() => setStep(0)}>Start again <RotateCcw size={16} aria-hidden="true" /></button>
          )}
        </div>
      </div>
    </div>
  );
}
