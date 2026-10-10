import { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  Globe,
  LayoutDashboard,
  MessageSquare,
  Mic,
  Monitor,
  CalendarDays,
  Search,
  Star,
  Workflow,
  Phone,
  Play,
  RotateCcw,
} from "lucide-react";
import { openContactModal } from "../../lib/siteActions";

const capabilities = [
  {
    name: "AI Chatbots",
    icon: MessageSquare,
    title: "A useful answer. A better first impression.",
    copy: "Help customers find what they need, qualify inquiries, and hand the right context to your team.",
  },
  {
    name: "AI Voice Agents",
    icon: Mic,
    title: "A good conversation, even after hours.",
    copy: "Answer routine questions, capture the details, and route sensitive or complex requests to a person.",
  },
  {
    name: "Business Applications",
    icon: LayoutDashboard,
    title: "Your business. Working from one place.",
    copy: "Bring jobs, customers, scheduling, and billing into a practical system built around your operation.",
  },
  {
    name: "Premium Websites",
    icon: Monitor,
    title: "Make your first impression count.",
    copy: "Thoughtful design, clear messaging, and fast experiences that turn interest into a conversation.",
  },
  {
    name: "Search Visibility",
    icon: Search,
    title: "Be there when your customers look.",
    copy: "Build a stronger local presence with useful content, sound technical foundations, and meaningful reporting.",
  },
  {
    name: "Calendar & Scheduling",
    icon: CalendarDays,
    title: "Less back-and-forth. More booked.",
    copy: "Connect availability, appointments, and reminders so customers and your team know what happens next.",
  },
  {
    name: "Workflow Automation",
    icon: Workflow,
    title: "Keep the work moving.",
    copy: "Connect the handoffs between systems, with clear rules, human review, and visibility when something needs attention.",
  },
  {
    name: "Reputation & Reviews",
    icon: Star,
    title: "Let good work speak for itself.",
    copy: "Request honest feedback, make responding easier, and understand what your customers are telling you.",
  },
];

function ChatDemo() {
  const [question, setQuestion] = useState("");
  return (
    <div className="chat-demo">
      <div className="demo-identity">
        <span className="mini-avatar">
          <MessageSquare size={18} />
        </span>
        <div>
          <strong>Your front desk</strong>
          <small>Illustrative assistant</small>
        </div>
        <span className="status-dot" />
      </div>
      <div className="chat-bubble">
        Hello. How can we help with your home today?
      </div>
      {question ? (
        <>
          <div className="chat-bubble customer">{question}</div>
          <div className="chat-bubble">
            {question.includes("repair")
              ? "We can help with that. Is your system not cooling, or has it stopped running? Your service team will confirm availability before a visit."
              : "We can collect a few details for your team. What kind of project are you planning?"}
          </div>
          <button className="demo-reset" onClick={() => setQuestion("")}>
            <RotateCcw size={13} /> Start again
          </button>
        </>
      ) : (
        <div className="quick-replies">
          <button onClick={() => setQuestion("I need an AC repair.")}>
            I need an AC repair <ArrowUpRight size={13} />
          </button>
          <button onClick={() => setQuestion("Can I request an estimate?")}>
            Request an estimate <ArrowUpRight size={13} />
          </button>
        </div>
      )}
      <div className="demo-input">
        A helpful start to every conversation <ArrowRight size={16} />
      </div>
    </div>
  );
}
function VoiceDemo() {
  const [step, setStep] = useState(0);
  const lines = [
    "A customer calls after closing.",
    "“My AC stopped cooling. Can someone come tomorrow?”",
    "“I can take your details and ask the service team to confirm a time. Is there anything else they should know?”",
    "Call summary ready for a person to review. No appointment is confirmed automatically.",
  ];
  return (
    <div className="voice-demo">
      <div className="phone-orbit">
        <Phone size={27} />
      </div>
      <div className="waveform" aria-hidden="true">
        {Array.from({ length: 33 }, (_, i) => (
          <i
            key={i}
            style={{ height: `${12 + (Math.sin(i * 1.7) + 1) * 25}px` }}
          />
        ))}
      </div>
      <p aria-live="polite">{lines[step]}</p>
      <button
        className="demo-action"
        onClick={() => setStep((step + 1) % lines.length)}
      >
        {step === 0 ? <Play size={15} /> : <ArrowRight size={15} />}{" "}
        {step === 0
          ? "Walk through a call"
          : step === 3
            ? "Start again"
            : "Continue conversation"}
      </button>
      <small>Sample call flow · No microphone or live call</small>
    </div>
  );
}
function OperationsDemo() {
  const [done, setDone] = useState(false);
  return (
    <div className="operations-demo">
      <div className="demo-heading">
        <span>Good morning, Alex.</span>
        <small>Sample service day</small>
      </div>
      <div className="sample-metrics">
        <div>
          <strong>3</strong>
          <span>Scheduled jobs</span>
        </div>
        <div>
          <strong>{done ? "2" : "1"}</strong>
          <span>Completed</span>
        </div>
        <div>
          <strong>1</strong>
          <span>Needs review</span>
        </div>
      </div>
      <div className="job-row">
        <span className="job-time">9:00</span>
        <div>
          <strong>System maintenance</strong>
          <small>Oak Street · Residential</small>
        </div>
        <span className="job-status">Complete</span>
      </div>
      <div className="job-row">
        <span className="job-time">11:30</span>
        <div>
          <strong>Cooling repair</strong>
          <small>Pine Avenue · Residential</small>
        </div>
        <button
          className="job-status actionable"
          onClick={() => setDone(!done)}
        >
          {done ? "Completed ✓" : "Mark complete"}
        </button>
      </div>
      <div className="job-row">
        <span className="job-time">2:00</span>
        <div>
          <strong>Installation estimate</strong>
          <small>Maple Court · Residential</small>
        </div>
        <span className="job-status neutral">Scheduled</span>
      </div>
      <p className="demo-footnote" aria-live="polite">
        {done
          ? "Job updated. A draft invoice is ready for review."
          : "One view of the day. Clear next steps for the team."}
      </p>
    </div>
  );
}
function WebsiteDemo() {
  const [mobile, setMobile] = useState(false);
  return (
    <div className="website-demo">
      <div className="device-options">
        <button aria-pressed={!mobile} onClick={() => setMobile(false)}>
          Desktop
        </button>
        <button aria-pressed={mobile} onClick={() => setMobile(true)}>
          Mobile
        </button>
      </div>
      <div className={`sample-site ${mobile ? "phone-size" : ""}`}>
        <div className="sample-site-nav">
          Hearth & Home <span>EST. 2026</span>
        </div>
        <div className="sample-site-content">
          <small>A SAMPLE SERVICE BUSINESS</small>
          <h3>
            Comfort begins
            <br />
            with good care.
          </h3>
          <span>Thoughtful service for the place you call home.</span>
          <div className="sample-site-cta">
            Your next step, made clear <ArrowUpRight size={13} />
          </div>
        </div>
      </div>
    </div>
  );
}
function SearchDemo() {
  const [view, setView] = useState("Presence");
  return (
    <div className="search-demo">
      <div className="search-preview">
        <Search size={16} /> home services in Auburn
      </div>
      <div className="device-options">
        {["Presence", "Foundations"].map((v) => (
          <button key={v} aria-pressed={view === v} onClick={() => setView(v)}>
            {v}
          </button>
        ))}
      </div>
      {view === "Presence" ? (
        <div className="search-result">
          <small>YOUR BUSINESS · AUBURN, CA</small>
          <h3>Local expertise. Service you can count on.</h3>
          <p>
            A clear, relevant introduction to your business, built around the
            questions your customers actually ask.
          </p>
          <span>
            Services &nbsp; · &nbsp; About &nbsp; · &nbsp; Get in touch
          </span>
        </div>
      ) : (
        <div className="seo-checks">
          {[
            "Fast, accessible pages",
            "Accurate business information",
            "Useful service-area content",
            "Search performance reporting",
          ].map((s) => (
            <p key={s}>
              <CheckCircle2 size={17} />
              {s}
            </p>
          ))}
        </div>
      )}
      <p className="demo-footnote">
        Illustrative search preview. No ranking guarantee.
      </p>
    </div>
  );
}
function CalendarDemo() {
  const [day, setDay] = useState(14),
    [slot, setSlot] = useState("");
  return (
    <div className="calendar-demo">
      <div className="demo-heading">
        <span>Find a time that works.</span>
        <small>Sample availability · Pacific time</small>
      </div>
      <div className="demo-calendar-days">
        {[14, 15, 16, 17, 18].map((n, i) => (
          <button
            aria-pressed={day === n}
            key={n}
            onClick={() => {
              setDay(n);
              setSlot("");
            }}
          >
            <small>{["Mon", "Tue", "Wed", "Thu", "Fri"][i]}</small>
            <strong>{n}</strong>
          </button>
        ))}
      </div>
      <div className="demo-slots">
        {["10:00 AM", "11:30 AM", "2:00 PM"].map((s) => (
          <button key={s} aria-pressed={slot === s} onClick={() => setSlot(s)}>
            {s}
          </button>
        ))}
      </div>
      <p className="calendar-confirm" aria-live="polite">
        {slot ? (
          <>
            <Check size={15} /> Sample selection: {day}, {slot}. Nothing has
            been booked.
          </>
        ) : (
          "Choose a sample day and time to explore."
        )}
      </p>
    </div>
  );
}
function WorkflowDemo() {
  const [running, setRunning] = useState(false);
  return (
    <div className="workflow-demo">
      <div className="demo-heading">
        <span>From inquiry to next step.</span>
        <small>A connected workflow</small>
      </div>
      <div className="mini-flow">
        {[
          "Inquiry received",
          "Customer record created",
          "Team notified",
          "Follow-up prepared",
        ].map((s, i) => (
          <div key={s} className={running ? "complete" : ""}>
            <span>{running ? <Check size={13} /> : i + 1}</span>
            {s}
          </div>
        ))}
      </div>
      <button className="demo-action" onClick={() => setRunning(!running)}>
        {running ? <RotateCcw size={15} /> : <Play size={15} />}{" "}
        {running ? "Reset example" : "Run sample workflow"}
      </button>
      <p className="demo-footnote">
        {running
          ? "A person reviews the follow-up before it is sent."
          : "Clear handoffs. Human oversight where it matters."}
      </p>
    </div>
  );
}
function ReviewsDemo() {
  const [draft, setDraft] = useState(false);
  return (
    <div className="reviews-demo">
      <div className="demo-heading">
        <span>A conversation worth continuing.</span>
        <small>Fictional review for demonstration</small>
      </div>
      <div className="sample-review">
        <div className="review-stars" role="img" aria-label="Five stars">
          {[1, 2, 3, 4, 5].map((n) => (
            <Star key={n} size={16} fill="currentColor" />
          ))}
        </div>
        <p>
          “The team explained the work clearly and kept us informed from start
          to finish.”
        </p>
        <small>Sample customer · Sample service business</small>
      </div>
      {draft ? (
        <div className="review-draft">
          <small>DRAFT · AWAITING YOUR REVIEW</small>
          <p>
            Thank you for the thoughtful feedback. We're glad the communication
            made a difference.
          </p>
          <button className="demo-reset" onClick={() => setDraft(false)}>
            Clear draft
          </button>
        </div>
      ) : (
        <button className="demo-action" onClick={() => setDraft(true)}>
          Preview a thoughtful response <ArrowRight size={15} />
        </button>
      )}
      <p className="demo-footnote">
        Responses stay in your hands. Nothing is posted.
      </p>
    </div>
  );
}
const demos = [
  ChatDemo,
  VoiceDemo,
  OperationsDemo,
  WebsiteDemo,
  SearchDemo,
  CalendarDemo,
  WorkflowDemo,
  ReviewsDemo,
];
export function Capabilities() {
  const [active, setActive] = useState(0);
  const selected = capabilities[active],
    Demo = demos[active];
  return (
    <section id="capabilities" className="capabilities-section section-space">
      <div className="page-width">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Capabilities in motion</p>
            <h2>
              Powerful possibilities.
              <br />
              <em>Practical by design.</em>
            </h2>
          </div>
          <p>
            Explore what better can look like.
            <br />
            Built around your business, connected to the way you work.
          </p>
        </div>
        <div className="capability-atelier">
          <div className="capability-nav" aria-label="Explore capabilities">
            {capabilities.map((c, i) => (
              <button
                key={c.name}
                aria-pressed={active === i}
                aria-controls="capability-panel"
                onClick={() => setActive(i)}
              >
                <c.icon size={17} />
                <span>{c.name}</span>
                <ArrowUpRight size={15} />
              </button>
            ))}
          </div>
          <div className="capability-panel" id="capability-panel">
            <div className="window-chrome">
              <span>
                <i />
                <i />
                <i />
              </span>
              <span>
                <Globe size={11} /> SENTIENT / POSSIBILITIES
              </span>
              <small>Interactive illustration</small>
            </div>
            <div className="capability-demo" key={active}>
              <Demo />
            </div>
            <div className="capability-caption">
              <div>
                <h3>{selected.title}</h3>
                <p>{selected.copy}</p>
              </div>
              <button
                aria-label={`Discuss ${selected.name}`}
                onClick={() =>
                  openContactModal({
                    source: "Capability showcase",
                    inquiry: `I'd like to explore ${selected.name.toLowerCase()} for my business.`,
                  })
                }
              >
                <ArrowUpRight size={23} />
              </button>
            </div>
          </div>
        </div>
        <noscript>
          <p>
            Our capabilities include AI chatbots, AI voice agents, business
            applications, premium websites, search visibility, calendar and
            scheduling, workflow automation, and reputation and review
            management.
          </p>
        </noscript>
        <p className="illustration-note">
          Illustrative experiences with sample data. These windows are not
          connected to live business systems.
        </p>
      </div>
    </section>
  );
}
