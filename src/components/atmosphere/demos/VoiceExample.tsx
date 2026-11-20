import { useState } from "react";
import { ArrowRight, RotateCcw } from "lucide-react";
import { openSentientChat } from "../../../lib/siteActions";

// Authored example of the website concierge, not a customer recording or live response.
const conversation = [
  { speaker: "Sentient assistant", text: "Hello. I'm the Sentient Partners assistant, an AI. Ask me how we help growing businesses, or about a 20-minute intro call." },
  { speaker: "Example visitor", text: "We spend too much time moving job details between our calendar and invoices. Can you help?" },
  { speaker: "Sentient assistant", text: "We help businesses connect those handoffs and build practical tools around how they work. Where does your team have to enter the same information twice?" },
  { speaker: "Example visitor", text: "After each visit, the office copies the job notes into an invoice. What would working together look like?" },
  { speaker: "Sentient assistant", text: "Sentient Partners is a business consultancy. We start with your business and the way your team works, then shape the systems around that. A 20-minute intro call is a good place to talk through the handoff." },
  { speaker: "Example visitor", text: "How do I arrange that?" },
  { speaker: "Sentient assistant", text: "Use the intro-call link on this page to choose a time with Troy." },
] as const;

export default function VoiceExample() {
  const [visible, setVisible] = useState(1);
  const complete = visible === conversation.length;
  return (
    <div className="demo-voice">
      <div className="demo-voice-copy">
        <h3>A conversation with <em>Ask Sentient.</em></h3>
        <p className="demo-summary">Get a sense of how this site's voice assistant answers questions and helps you find the next step.</p>
        <p className="demo-disclosure"><strong>Scripted example · text only.</strong> These are illustrative lines, not a recording or a live response. No microphone or audio is used.</p>
        <a className="text-link" href="#concierge-title" onClick={(event) => {
          event.preventDefault();
          openSentientChat({ source: "Capabilities voice example" });
        }}>Try the real voice assistant <ArrowRight size={16} aria-hidden="true" /></a>
        <p className="demo-disclosure">In Ask Sentient, choose “Start with voice”. A conversation starts only when you choose to begin.</p>
      </div>
      <div className="demo-conversation">
        <p className="demo-count" role="status">{complete ? "Example complete" : `Line ${visible} of ${conversation.length}`} · Scripted example</p>
        <ol className="demo-transcript" aria-label="Scripted website voice conversation">
          {conversation.slice(0, visible).map((line, index) => (
            <li key={index} className={line.speaker === "Example visitor" ? "is-visitor" : "is-assistant"}>
              <span>{line.speaker}</span><p>{line.text}</p>
            </li>
          ))}
        </ol>
        <div className="sr-only" aria-live="polite" aria-atomic="true">{conversation[visible - 1].speaker}: {conversation[visible - 1].text}</div>
        <div className="demo-controls" role="group" aria-label="Explore the scripted example">
          <button type="button" onClick={() => setVisible(complete ? 1 : visible + 1)}>
            {complete ? <>Read again <RotateCcw size={16} aria-hidden="true" /></> : <>Next line <ArrowRight size={16} aria-hidden="true" /></>}
          </button>
          {!complete && <button type="button" onClick={() => setVisible(conversation.length)}>Read full example</button>}
        </div>
        <p className="demo-disclosure">No meeting is booked or message sent by this example.</p>
      </div>
    </div>
  );
}
