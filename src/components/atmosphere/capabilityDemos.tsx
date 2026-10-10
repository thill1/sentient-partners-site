import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  ArrowRight,
  Check,
  FileText,
  Mail,
  MapPin,
  MessageSquare,
  Monitor,
  Pause,
  Phone,
  Play,
  RotateCcw,
  Send,
  ShieldCheck,
  Smartphone,
  Star,
  Tablet,
  User,
} from "lucide-react";

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function useTimers() {
  const ids = useRef<number[]>([]);
  useEffect(() => () => ids.current.forEach(clearTimeout), []);
  return useMemo(
    () => ({
      after(ms: number, fn: () => void) {
        ids.current.push(
          window.setTimeout(fn, prefersReducedMotion() ? 0 : ms),
        );
      },
      clear() {
        ids.current.forEach(clearTimeout);
        ids.current = [];
      },
    }),
    [],
  );
}

function useTypewriter(text: string, charsPerSecond = 70) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (prefersReducedMotion()) {
      setCount(text.length);
      return;
    }
    setCount(0);
    const id = window.setInterval(() => {
      setCount((n) => {
        if (n >= text.length) {
          clearInterval(id);
          return n;
        }
        return n + 1;
      });
    }, 1000 / charsPerSecond);
    return () => clearInterval(id);
  }, [text, charsPerSecond]);
  return text.slice(0, count);
}

function useCountUp(target: number, ms = 700) {
  const [value, setValue] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    const start = from.current;
    if (start === target || prefersReducedMotion()) {
      from.current = target;
      setValue(target);
      return;
    }
    const began = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - began) / ms);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(start + (target - start) * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
      else from.current = target;
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, ms]);
  return value;
}

function Backstage({
  title,
  children,
  note,
}: {
  title: string;
  children: ReactNode;
  note?: ReactNode;
}) {
  return (
    <aside className="cx-back" aria-label="Behind the scenes">
      <p className="cx-back-label">
        <i aria-hidden="true" /> Behind the scenes
      </p>
      <h4>{title}</h4>
      <div className="cx-back-body">{children}</div>
      {note ? <p className="cx-back-note">{note}</p> : null}
    </aside>
  );
}

function Field({
  label,
  value,
  empty = "Listening…",
}: {
  label: string;
  value?: string;
  empty?: string;
}) {
  return (
    <div className={`cx-field${value ? " is-filled" : ""}`}>
      <span>{label}</span>
      <strong key={value ?? "empty"}>{value ?? empty}</strong>
    </div>
  );
}

function Stars({ count, size = 12 }: { count: number; size?: number }) {
  return (
    <span className="cx-stars" role="img" aria-label={`${count} of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          fill={n <= count ? "currentColor" : "none"}
          strokeWidth={1.5}
        />
      ))}
    </span>
  );
}

/* ——— AI Chatbots ——— */

type Lead = {
  intent?: string;
  need?: string;
  location?: string;
  timing?: string;
  routed?: string;
};
type ChatOption = { label: string; next: string; set?: Lead };
type ChatNode = { bot: string; options?: ChatOption[]; set?: Lead };

const repairOption: ChatOption = {
  label: "My AC stopped cooling",
  next: "repair",
  set: { intent: "Service request" },
};
const estimateOption: ChatOption = {
  label: "I'd like an estimate",
  next: "estimate",
  set: { intent: "New project" },
};
const chatScript: Record<string, ChatNode> = {
  start: {
    bot: "Hi, thanks for reaching out to Hearth & Home. What can we help with today?",
    options: [
      repairOption,
      estimateOption,
      {
        label: "What are your hours?",
        next: "hours",
        set: { intent: "General question" },
      },
    ],
  },
  repair: {
    bot: "Sorry to hear that. Is it running but blowing warm air, or not turning on at all?",
    options: [
      {
        label: "Blowing warm air",
        next: "zip",
        set: { need: "AC repair · warm air" },
      },
      {
        label: "Won't turn on",
        next: "zip",
        set: { need: "AC repair · no power" },
      },
    ],
  },
  estimate: {
    bot: "Happy to help. What kind of project are you planning?",
    options: [
      {
        label: "New system install",
        next: "zip",
        set: { need: "Estimate · new system" },
      },
      {
        label: "Ductwork upgrade",
        next: "zip",
        set: { need: "Estimate · ductwork" },
      },
    ],
  },
  hours: {
    bot: "We're open 7 to 6 on weekdays, and this chat is here any time. Anything else I can help with?",
    set: { need: "Answered instantly" },
    options: [repairOption, estimateOption],
  },
  zip: {
    bot: "Got it. What ZIP code is the home in?",
    options: [
      {
        label: "95603",
        next: "timing",
        set: { location: "95603 · in service area" },
      },
      {
        label: "95602",
        next: "timing",
        set: { location: "95602 · in service area" },
      },
    ],
  },
  timing: {
    bot: "Thanks, we cover that area. Do mornings or afternoons work better for a visit?",
    options: [
      {
        label: "Mornings",
        next: "handoff",
        set: { timing: "Weekday mornings" },
      },
      {
        label: "Afternoons",
        next: "handoff",
        set: { timing: "Weekday afternoons" },
      },
    ],
  },
  handoff: {
    bot: "Perfect. I've passed this to our service team with everything you shared. They'll confirm a time with you shortly.",
    set: { routed: "Service team · summary sent" },
  },
};

type ChatMessage = { from: "bot" | "customer"; text: string };

export function ChatDemo() {
  const timers = useTimers();
  const thread = useRef<HTMLDivElement>(null);
  const [nodeId, setNodeId] = useState("start");
  const [typing, setTyping] = useState(false);
  const [lead, setLead] = useState<Lead>({});
  const [messages, setMessages] = useState<ChatMessage[]>([
    { from: "bot", text: chatScript.start.bot },
  ]);
  const node = chatScript[nodeId];

  useEffect(() => {
    const el = thread.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  const choose = (option: ChatOption) => {
    const next = chatScript[option.next];
    setMessages((m) => [...m, { from: "customer", text: option.label }]);
    setLead((l) => ({ ...l, ...option.set }));
    setTyping(true);
    timers.after(900, () => {
      setTyping(false);
      setMessages((m) => [...m, { from: "bot", text: next.bot }]);
      setLead((l) => ({ ...l, ...next.set }));
      setNodeId(option.next);
    });
  };
  const reset = () => {
    timers.clear();
    setTyping(false);
    setLead({});
    setNodeId("start");
    setMessages([{ from: "bot", text: chatScript.start.bot }]);
  };

  return (
    <div className="cx-split">
      <div className="cx-front cx-chat">
        <header className="cx-app-head">
          <span className="cx-avatar">
            <MessageSquare size={15} />
          </span>
          <div>
            <strong>Hearth &amp; Home</strong>
            <small>
              <i className="cx-live" aria-hidden="true" /> Replies instantly,
              any hour
            </small>
          </div>
        </header>
        <div className="cx-thread" ref={thread} aria-live="polite">
          {messages.map((m, i) => (
            <p key={i} className={`cx-msg is-${m.from}`}>
              {m.text}
            </p>
          ))}
          {typing ? (
            <p className="cx-msg is-bot cx-typing" aria-label="Typing">
              <i />
              <i />
              <i />
            </p>
          ) : null}
        </div>
        <div className="cx-replies">
          {typing ? null : node.options ? (
            node.options.map((o) => (
              <button key={o.label} onClick={() => choose(o)}>
                {o.label}
              </button>
            ))
          ) : (
            <button className="cx-quiet" onClick={reset}>
              <RotateCcw size={13} /> Start a new conversation
            </button>
          )}
        </div>
      </div>
      <Backstage
        title="A qualified lead, written up for you."
        note="Anything sensitive or unusual is handed to a person, with the full conversation attached."
      >
        <Field label="Intent" value={lead.intent} />
        <Field label="Need" value={lead.need} />
        <Field label="Location" value={lead.location} />
        <Field label="Preferred time" value={lead.timing} />
        <Field label="Routed to" value={lead.routed} />
      </Backstage>
    </div>
  );
}

/* ——— AI Voice Agents ——— */

type CallNotes = {
  reason?: string;
  safety?: string;
  preferred?: string;
  next?: string;
};
const callScript: {
  who: "agent" | "caller";
  text: string;
  ms: number;
  set?: CallNotes;
}[] = [
  {
    who: "agent",
    text: "Thanks for calling Hearth & Home. You've reached our after-hours assistant. How can I help?",
    ms: 3400,
  },
  {
    who: "caller",
    text: "Our AC stopped cooling tonight. Can someone come out tomorrow?",
    ms: 3000,
    set: { reason: "AC not cooling · next-day request" },
  },
  {
    who: "agent",
    text: "I can get that started. Is anyone in the home at higher risk from the heat, like an infant or an older adult?",
    ms: 3800,
  },
  {
    who: "caller",
    text: "No, it's just the two of us. Mornings are best.",
    ms: 2800,
    set: { safety: "No elevated risk", preferred: "Tomorrow morning" },
  },
  {
    who: "agent",
    text: "Thank you. I've noted a morning visit. The service team will call you by 8 AM to confirm a time.",
    ms: 3600,
    set: { next: "Team calls back by 8:00 AM" },
  },
];

export function VoiceDemo() {
  const [step, setStep] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const finished = step === callScript.length - 1 && !playing;

  useEffect(() => {
    if (!playing) return;
    if (step >= callScript.length - 1) {
      const id = window.setTimeout(() => setPlaying(false), 1600);
      return () => clearTimeout(id);
    }
    const delay = step < 0 ? 400 : callScript[step].ms;
    const id = window.setTimeout(
      () => setStep((s) => s + 1),
      prefersReducedMotion() ? 900 : delay,
    );
    return () => clearTimeout(id);
  }, [playing, step]);

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [playing]);

  const notes = callScript
    .slice(0, step + 1)
    .reduce<CallNotes>((acc, line) => ({ ...acc, ...line.set }), {});
  const speaker = step >= 0 && playing ? callScript[step].who : null;
  const toggle = () => {
    if (finished) {
      setStep(-1);
      setSeconds(0);
      setPlaying(true);
    } else setPlaying(!playing);
  };
  const clock = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

  return (
    <div className="cx-split">
      <div className="cx-front cx-voice">
        <header className="cx-call-head">
          <span className={`cx-call-ring${playing ? " is-live" : ""}`}>
            <Phone size={17} />
          </span>
          <div>
            <strong>(530) 555-0148</strong>
            <small>
              {step < 0 && !playing
                ? "Incoming · 11:42 PM · After hours"
                : finished
                  ? `Call ended · ${clock}`
                  : `Answered · ${clock}`}
            </small>
          </div>
        </header>
        <div
          className={`cx-wave${speaker ? ` is-${speaker}` : ""}`}
          aria-hidden="true"
        >
          {Array.from({ length: 36 }, (_, i) => (
            <i
              key={i}
              style={
                {
                  "--h": `${0.25 + Math.abs(Math.sin(i * 1.3)) * 0.75}`,
                  "--d": `${(i % 7) * 0.09}s`,
                } as CSSProperties
              }
            />
          ))}
        </div>
        <ol className="cx-transcript" aria-live="polite">
          {step < 0 ? (
            <li className="cx-transcript-empty">
              Play the sample to hear how an after-hours call is handled.
            </li>
          ) : (
            callScript.slice(0, step + 1).map((line, i) => (
              <li key={i} className={`is-${line.who}`}>
                <span>{line.who === "agent" ? "Assistant" : "Caller"}</span>
                {line.text}
              </li>
            ))
          )}
        </ol>
        <button className="cx-play" onClick={toggle}>
          <span>
            {finished ? (
              <RotateCcw size={15} />
            ) : playing ? (
              <Pause size={15} />
            ) : (
              <Play size={15} />
            )}
          </span>
          {finished
            ? "Replay the call"
            : playing
              ? "Pause"
              : step < 0
                ? "Play a sample call"
                : "Resume"}
        </button>
      </div>
      <Backstage
        title="A call summary waiting for the morning."
        note="Urgent situations, like a gas smell or no heat with an infant at home, transfer to a person straight away."
      >
        <Field label="Reason" value={notes.reason} />
        <Field label="Safety screen" value={notes.safety} />
        <Field label="Preferred time" value={notes.preferred} />
        <Field label="Next step" value={notes.next} />
        <Field
          label="Delivered to"
          value={finished ? "On-call lead · text + email" : undefined}
        />
      </Backstage>
    </div>
  );
}

/* ——— Business Applications ——— */

const jobStages = ["Scheduled", "En route", "On site", "Complete", "Invoiced"];
const nextAction = ["Dispatch", "Check in", "Complete", "Send invoice"];
type Job = {
  id: number;
  time: string;
  title: string;
  place: string;
  tech: string;
  amount: number;
  stage: number;
};
const initialJobs: Job[] = [
  {
    id: 1,
    time: "8:30",
    title: "Seasonal tune-up",
    place: "Oak Street",
    tech: "Maria",
    amount: 149,
    stage: 3,
  },
  {
    id: 2,
    time: "11:00",
    title: "Cooling repair",
    place: "Pine Avenue",
    tech: "Devon",
    amount: 386,
    stage: 0,
  },
  {
    id: 3,
    time: "2:30",
    title: "Install estimate",
    place: "Maple Court",
    tech: "Maria",
    amount: 0,
    stage: 0,
  },
];

function activityFor(job: Job, stage: number) {
  if (stage === 1)
    return `Text sent: ${job.tech} is on the way to ${job.place}`;
  if (stage === 2) return `${job.tech} checked in at ${job.place}`;
  if (stage === 3)
    return job.amount
      ? `Notes and photos saved · ${job.title.toLowerCase()}`
      : "Estimate drafted from site notes, ready to review";
  return `Invoice #10${job.id}4 sent · $${job.amount} · payment link included`;
}

export function OperationsDemo() {
  const [jobs, setJobs] = useState(initialJobs);
  const [activity, setActivity] = useState<{ id: number; text: string }[]>([
    { id: 0, text: "Tune-up completed at Oak Street" },
  ]);
  const completed = jobs.filter((j) => j.stage >= 3).length;
  const invoiced = useCountUp(
    jobs.reduce((sum, j) => sum + (j.stage === 4 ? j.amount : 0), 0),
  );
  const advance = (job: Job) => {
    const stage = job.stage + 1;
    setJobs((all) => all.map((j) => (j.id === job.id ? { ...j, stage } : j)));
    setActivity((a) =>
      [{ id: Date.now(), text: activityFor(job, stage) }, ...a].slice(0, 5),
    );
  };
  const reset = () => {
    setJobs(initialJobs);
    setActivity([{ id: 0, text: "Tune-up completed at Oak Street" }]);
  };
  const lastStage = (job: Job) => (job.amount ? 4 : 3);
  const allDone = jobs.every((j) => j.stage === lastStage(j));

  return (
    <div className="cx-split">
      <div className="cx-front cx-ops">
        <header className="cx-ops-head">
          <div>
            <small>Tuesday · Sample service day</small>
            <strong>Good morning, Alex.</strong>
          </div>
          {allDone ? (
            <button className="cx-quiet" onClick={reset}>
              <RotateCcw size={13} /> Reset day
            </button>
          ) : null}
        </header>
        <div className="cx-metrics">
          <div>
            <strong>{jobs.length}</strong>
            <span>Jobs today</span>
          </div>
          <div>
            <strong>{completed}</strong>
            <span>Completed</span>
          </div>
          <div>
            <strong>${invoiced}</strong>
            <span>Invoiced</span>
          </div>
        </div>
        <ul className="cx-jobs">
          {jobs.map((job) => (
            <li key={job.id}>
              <span className="cx-job-time">{job.time}</span>
              <div className="cx-job-main">
                <strong>{job.title}</strong>
                <small>
                  {job.place} · {job.tech}
                </small>
                <span className="cx-pips" aria-hidden="true">
                  {jobStages.slice(0, lastStage(job) + 1).map((s, i) => (
                    <i key={s} className={i <= job.stage ? "is-on" : ""} />
                  ))}
                </span>
              </div>
              {job.stage < lastStage(job) ? (
                <button className="cx-advance" onClick={() => advance(job)}>
                  {nextAction[job.stage]} <ArrowRight size={12} />
                </button>
              ) : (
                <span className="cx-job-done">
                  <Check size={12} />{" "}
                  {job.amount ? jobStages[job.stage] : "Estimate ready"}
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
      <Backstage
        title="One click. Everything downstream updates."
        note="Customers, crews, and the books stay in step without anyone re-entering anything."
      >
        <ul className="cx-feed" aria-live="polite">
          {activity.map((a) => (
            <li key={a.id}>{a.text}</li>
          ))}
        </ul>
      </Backstage>
    </div>
  );
}

/* ——— Premium Websites ——— */

const devices = [
  { id: "desktop", label: "Desktop", icon: Monitor },
  { id: "tablet", label: "Tablet", icon: Tablet },
  { id: "phone", label: "Phone", icon: Smartphone },
] as const;
const vitals = [
  { label: "Performance", score: 98 },
  { label: "Accessibility", score: 100 },
  { label: "Best practices", score: 100 },
  { label: "SEO", score: 100 },
];

export function WebsiteDemo() {
  const [device, setDevice] =
    useState<(typeof devices)[number]["id"]>("desktop");
  const site = useRef<HTMLDivElement>(null);
  const [drawn, setDrawn] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setDrawn(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const go = (section: string) => {
    const root = site.current;
    const target = root?.querySelector<HTMLElement>(`[data-part="${section}"]`);
    if (root && target)
      root.scrollTo({ top: target.offsetTop - 44, behavior: "smooth" });
  };

  return (
    <div className="cx-split">
      <div className="cx-front cx-web">
        <div className="cx-segment" role="group" aria-label="Preview size">
          {devices.map((d) => (
            <button
              key={d.id}
              aria-pressed={device === d.id}
              onClick={() => setDevice(d.id)}
            >
              <d.icon size={13} /> {d.label}
            </button>
          ))}
        </div>
        <div className={`cx-device is-${device}`}>
          <div className="cx-site" ref={site}>
            <nav className="cx-site-nav">
              <strong>Hearth &amp; Home</strong>
              <span>
                <button onClick={() => go("services")}>Services</button>
                <button onClick={() => go("reviews")}>Reviews</button>
                <button onClick={() => go("contact")}>Contact</button>
              </span>
            </nav>
            <section className="cx-site-hero">
              <small>Heating &amp; air · Auburn, CA</small>
              <h5>
                Comfort begins
                <br />
                <em>with good care.</em>
              </h5>
              <p>Honest service for the place you call home.</p>
              <button onClick={() => go("contact")}>
                Book a visit <ArrowRight size={11} />
              </button>
            </section>
            <section className="cx-site-services" data-part="services">
              {["Cooling", "Heating", "Air quality"].map((s, i) => (
                <div key={s}>
                  <span>0{i + 1}</span>
                  <strong>{s}</strong>
                  <small>Same-week visits, upfront pricing.</small>
                </div>
              ))}
            </section>
            <section className="cx-site-quote" data-part="reviews">
              <Stars count={5} size={10} />
              <p>“They explained everything and left the place spotless.”</p>
              <small>Sample review</small>
            </section>
            <section className="cx-site-contact" data-part="contact">
              <strong>Tell us what's going on.</strong>
              <span>Name</span>
              <span>Phone</span>
              <span className="is-send">Request a visit</span>
            </section>
          </div>
        </div>
      </div>
      <Backstage
        title="Fast, accessible, and measured."
        note="Sample build targets. Every inquiry is tracked back to the page that earned it."
      >
        <div className="cx-rings">
          {vitals.map((v) => (
            <div key={v.label}>
              <svg viewBox="0 0 44 44" aria-hidden="true">
                <circle cx="22" cy="22" r="19" />
                <circle
                  cx="22"
                  cy="22"
                  r="19"
                  className="is-value"
                  style={{
                    strokeDashoffset: drawn
                      ? 119.4 * (1 - v.score / 100)
                      : 119.4,
                  }}
                />
              </svg>
              <strong>{v.score}</strong>
              <span>{v.label}</span>
            </div>
          ))}
        </div>
        <Field label="Largest paint" value="1.1s on mobile" />
        <Field label="Layout" value={`Adapts to ${device}`} />
      </Backstage>
    </div>
  );
}

/* ——— Search Visibility ——— */

const foundations = [
  { id: "profile", label: "Accurate business profile" },
  { id: "reviews", label: "Steady, honest reviews" },
  { id: "photos", label: "Real photos of your work" },
  { id: "pages", label: "Pages for each service" },
  { id: "speed", label: "Fast, accessible website" },
] as const;
type FoundationId = (typeof foundations)[number]["id"];

export function SearchDemo() {
  const query = useTypewriter("ac repair near auburn", 16);
  const [on, setOn] = useState<Set<FoundationId>>(
    () => new Set<FoundationId>(["profile"]),
  );
  const has = (id: FoundationId) => on.has(id);
  const toggle = (id: FoundationId) =>
    setOn((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const strength = Math.round((on.size / foundations.length) * 100);

  return (
    <div className="cx-split">
      <div className="cx-front cx-search">
        <div className="cx-searchbar">
          <MapPin size={14} />
          <span>
            {query}
            <i className="cx-caret" aria-hidden="true" />
          </span>
        </div>
        <div className="cx-map" aria-hidden="true">
          <svg viewBox="0 0 400 110" preserveAspectRatio="none">
            <path d="M0 70 C80 40 140 95 220 60 S340 30 400 55" />
            <path d="M120 0 C130 40 110 80 140 110" />
            <path d="M290 0 C270 50 300 70 280 110" />
          </svg>
          <span className="cx-pin is-you" style={{ left: "38%", top: "34%" }}>
            A
          </span>
          <span className="cx-pin" style={{ left: "64%", top: "58%" }}>
            B
          </span>
          <span className="cx-pin" style={{ left: "18%", top: "62%" }}>
            C
          </span>
        </div>
        <article className="cx-listing">
          <div className="cx-listing-main">
            <strong>Hearth &amp; Home Heating &amp; Air</strong>
            {has("reviews") ? (
              <p className="cx-reveal">
                4.9 <Stars count={5} size={11} /> (128) · HVAC contractor
              </p>
            ) : (
              <p className="is-thin">HVAC contractor</p>
            )}
            {has("profile") ? (
              <p className="cx-reveal">
                <b>Open</b> · Closes 6 PM · (530) 555-0148
              </p>
            ) : null}
            {has("pages") ? (
              <p className="cx-links cx-reveal">
                <span>AC repair</span>
                <span>Furnace service</span>
                <span>Free estimates</span>
              </p>
            ) : null}
            {has("speed") ? (
              <p className="cx-tag cx-reveal">Mobile-friendly · loads fast</p>
            ) : null}
          </div>
          {has("photos") ? (
            <span className="cx-thumb cx-reveal" aria-hidden="true" />
          ) : null}
        </article>
        <div className="cx-listing is-other" aria-hidden="true">
          <strong>Another local business</strong>
          <p>HVAC contractor</p>
        </div>
      </div>
      <Backstage
        title="The foundations behind the listing."
        note="Illustrative. Good foundations make you easier to find and easier to choose. Rankings are never guaranteed."
      >
        <div className="cx-meter">
          <span>Listing strength</span>
          <strong>{strength}%</strong>
          <i style={{ transform: `scaleX(${strength / 100})` }} />
        </div>
        <ul className="cx-checks">
          {foundations.map((f) => (
            <li key={f.id}>
              <button
                role="switch"
                aria-checked={has(f.id)}
                onClick={() => toggle(f.id)}
              >
                <span>{has(f.id) ? <Check size={11} /> : null}</span>
                {f.label}
              </button>
            </li>
          ))}
        </ul>
      </Backstage>
    </div>
  );
}

/* ——— Calendar & Scheduling ——— */

const bookable = [
  { name: "Tune-up", length: "60 min" },
  { name: "Repair visit", length: "90 min" },
  { name: "Free estimate", length: "45 min" },
];
const bookingDays = [
  { day: "Mon", date: 12 },
  { day: "Tue", date: 13 },
  { day: "Wed", date: 14 },
  { day: "Thu", date: 15 },
  { day: "Fri", date: 16 },
];
const times = ["8:00 AM", "10:00 AM", "12:30 PM", "3:00 PM"];
const followThrough = [
  "Confirmation sent by text and email",
  "Added to Maria's calendar",
  "Reminder the day before",
  "Reminder two hours before",
  "Review request after the visit",
];

export function CalendarDemo() {
  const [service, setService] = useState(0);
  const [day, setDay] = useState(1);
  const [time, setTime] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const booked = (t: number) => (day + t + service) % 3 === 0;
  const change = () => {
    setConfirmed(false);
    setTime(null);
  };

  return (
    <div className="cx-split">
      <div className="cx-front cx-cal">
        {confirmed ? (
          <div className="cx-confirmed">
            <span className="cx-confirm-mark">
              <Check size={20} />
            </span>
            <small>Sample booking · nothing was scheduled</small>
            <h5>You're all set.</h5>
            <p>
              {bookable[service].name} · {bookingDays[day].day}, Oct{" "}
              {bookingDays[day].date} at {time}
              <br />
              with Maria · {bookable[service].length}
            </p>
            <button className="cx-quiet" onClick={change}>
              <RotateCcw size={13} /> Choose another time
            </button>
          </div>
        ) : (
          <>
            <div className="cx-segment" role="group" aria-label="Service">
              {bookable.map((b, i) => (
                <button
                  key={b.name}
                  aria-pressed={service === i}
                  onClick={() => {
                    setService(i);
                    setTime(null);
                  }}
                >
                  {b.name}
                </button>
              ))}
            </div>
            <div className="cx-days" role="group" aria-label="Day">
              {bookingDays.map((d, i) => (
                <button
                  key={d.date}
                  aria-pressed={day === i}
                  onClick={() => {
                    setDay(i);
                    setTime(null);
                  }}
                >
                  <small>{d.day}</small>
                  <strong>{d.date}</strong>
                </button>
              ))}
            </div>
            <div className="cx-times" role="group" aria-label="Time">
              {times.map((t, i) => (
                <button
                  key={t}
                  disabled={booked(i)}
                  aria-pressed={time === t}
                  onClick={() => setTime(t)}
                >
                  {booked(i) ? "Taken" : t}
                </button>
              ))}
            </div>
            <button
              className="cx-play"
              disabled={!time}
              onClick={() => setConfirmed(true)}
            >
              <span>
                <Check size={15} />
              </span>
              {time
                ? `Confirm ${bookingDays[day].day} at ${time}`
                : "Pick an open time"}
            </button>
          </>
        )}
      </div>
      <Backstage
        title="The follow-through, handled."
        note="Works with the calendars your team already uses. Customers can reschedule without a phone call."
      >
        <ol className={`cx-timeline${confirmed ? " is-running" : ""}`}>
          {followThrough.map((step, i) => (
            <li key={step} style={{ transitionDelay: `${i * 0.35}s` }}>
              <span>{i + 1}</span>
              {step}
            </li>
          ))}
        </ol>
      </Backstage>
    </div>
  );
}

/* ——— Workflow Automation ——— */

const flowSteps = [
  { title: "New inquiry", detail: "Website form", icon: Mail },
  { title: "Customer record", detail: "Created automatically", icon: User },
  { title: "Follow-up", detail: "Drafted from job notes", icon: FileText },
  { title: "Your approval", detail: "A person decides", icon: ShieldCheck },
  { title: "Sent", detail: "Check-in set for 3 days", icon: Send },
];
const flowLog = [
  "Inquiry from Jordan P. · new system estimate",
  "Customer record created · source: website",
  "Follow-up drafted with estimate attached",
  "Paused for your approval",
  "Email sent · check-in scheduled for Friday",
];
const gateStep = 3;

export function WorkflowDemo() {
  const timers = useTimers();
  const [reached, setReached] = useState(-1);
  const [approved, setApproved] = useState(false);
  const waiting = reached === gateStep && !approved;
  const done = reached === flowSteps.length - 1;

  const runFrom = (from: number, to: number) => {
    for (let i = from; i <= to; i++)
      timers.after((i - from + 1) * 850, () => setReached(i));
  };
  const run = () => {
    timers.clear();
    setApproved(false);
    setReached(-1);
    runFrom(0, gateStep);
  };
  const approve = () => {
    setApproved(true);
    runFrom(gateStep + 1, flowSteps.length - 1);
  };
  const nodeState = (i: number) => {
    if (i < reached || (i === reached && (i !== gateStep || approved)))
      return "is-done";
    if (waiting && i === gateStep) return "is-waiting";
    if (reached >= 0 && !waiting && !done && i === reached + 1)
      return "is-active";
    return "";
  };
  const stamp = (i: number) => `00:0${i === 4 ? 9 : i * 2}.${(i * 37) % 10}`;

  return (
    <div className="cx-split">
      <div className="cx-front cx-flow">
        <ol className="cx-rail">
          {flowSteps.map((s, i) => (
            <li key={s.title} className={nodeState(i)}>
              <span className="cx-node">
                <s.icon size={15} />
              </span>
              <strong>{s.title}</strong>
              <small>{s.detail}</small>
            </li>
          ))}
        </ol>
        <div className="cx-flow-stage" aria-live="polite">
          {waiting ? (
            <div className="cx-draft cx-reveal">
              <small>Draft · waiting for you</small>
              <p>
                Hi Jordan, thanks for having us out on Tuesday. Your estimate
                for the new system is attached, and I'm happy to walk through
                options whenever suits you.
              </p>
              <div>
                <button className="cx-play" onClick={approve}>
                  <span>
                    <Check size={15} />
                  </span>
                  Approve and send
                </button>
              </div>
            </div>
          ) : done ? (
            <p className="cx-flow-note cx-reveal">
              <Check size={14} /> Five steps, one decision from you. Nothing was
              actually sent.
              <button className="cx-quiet" onClick={run}>
                <RotateCcw size={13} /> Run again
              </button>
            </p>
          ) : reached >= 0 ? (
            <p className="cx-flow-note">Working…</p>
          ) : (
            <button className="cx-play" onClick={run}>
              <span>
                <Play size={15} />
              </span>
              Run the sample workflow
            </button>
          )}
        </div>
      </div>
      <Backstage
        title="A clear record of every handoff."
        note="Rules are written in plain language. If something stalls, the right person is alerted."
      >
        <ol className="cx-log" aria-live="polite">
          {reached < 0 ? (
            <li className="is-empty">No runs yet.</li>
          ) : (
            flowLog.slice(0, reached + 1).map((line, i) => (
              <li key={line}>
                <code>{stamp(i)}</code>
                {line}
              </li>
            ))
          )}
        </ol>
        <Field
          label="Manual steps removed"
          value={done ? "4 of 5 · about 12 minutes" : undefined}
          empty="After the run"
        />
      </Backstage>
    </div>
  );
}

/* ——— Reputation & Reviews ——— */

const reviews = [
  {
    name: "Jordan P.",
    stars: 5,
    text: "Clear explanation, fair price, and they cleaned up after themselves.",
    warm: "Thank you, Jordan. Leaving a home better than we found it matters to us, and we're glad it showed. We're here whenever you need us.",
    brief:
      "Thanks, Jordan. Glad the visit went smoothly. See you at the next tune-up.",
  },
  {
    name: "Sam R.",
    stars: 4,
    text: "Thorough work. It took a little longer than I hoped to get on the schedule.",
    warm: "Thank you, Sam. We hear you on scheduling. We've added more weekday openings this month so the wait is shorter next time.",
    brief:
      "Thanks, Sam. Fair point on timing. We've opened more weekday slots.",
  },
  {
    name: "Lee K.",
    stars: 3,
    text: "The technician was great, but the arrival window was off by an hour.",
    warm: "Lee, thank you for telling us. An hour is too long to wait without an update. Our team now sends a text when they're on the way, and I'd welcome a call to make it right.",
    brief:
      "Lee, you're right, and we're sorry. We now text when we're on the way.",
  },
];
const themes = [
  { label: "Communication", share: 82 },
  { label: "Cleanliness", share: 64 },
  { label: "Punctuality", share: 38 },
];

export function ReviewsDemo() {
  const [selected, setSelected] = useState(0);
  const [tone, setTone] = useState<"warm" | "brief">("warm");
  const [approved, setApproved] = useState<Set<number>>(() => new Set());
  const review = reviews[selected];
  const draft = useTypewriter(review[tone], 90);
  const typing = draft.length < review[tone].length;

  return (
    <div className="cx-split">
      <div className="cx-front cx-reviews">
        <div className="cx-inbox" role="group" aria-label="Sample reviews">
          {reviews.map((r, i) => (
            <button
              key={r.name}
              aria-pressed={selected === i}
              onClick={() => setSelected(i)}
            >
              <Stars count={r.stars} size={10} />
              <span>{r.name}</span>
              {approved.has(i) ? <Check size={12} /> : null}
            </button>
          ))}
        </div>
        <blockquote key={selected} className="cx-review cx-reveal">
          “{review.text}”
        </blockquote>
        <div className="cx-response">
          <div className="cx-response-head">
            <small>Drafted response</small>
            <div className="cx-segment is-small" role="group" aria-label="Tone">
              {(["warm", "brief"] as const).map((t) => (
                <button
                  key={t}
                  aria-pressed={tone === t}
                  onClick={() => setTone(t)}
                >
                  {t === "warm" ? "Warm" : "Brief"}
                </button>
              ))}
            </div>
          </div>
          <p>
            {draft}
            {typing ? <i className="cx-caret" aria-hidden="true" /> : null}
          </p>
          {approved.has(selected) ? (
            <span className="cx-approved">
              <Check size={13} /> Approved · sample only, nothing posted
            </span>
          ) : (
            <button
              className="cx-play"
              disabled={typing}
              onClick={() => setApproved((s) => new Set(s).add(selected))}
            >
              <span>
                <Check size={15} />
              </span>
              Approve response
            </button>
          )}
        </div>
      </div>
      <Backstage
        title="What customers keep telling you."
        note="Review requests go out after completed jobs. You approve every public reply."
      >
        <div className="cx-rating">
          <strong>4.8</strong>
          <svg viewBox="0 0 120 36" aria-hidden="true">
            <polyline points="0,30 20,26 40,27 60,18 80,14 100,9 120,6" />
          </svg>
          <span>Average rating, up from 4.4 over six months · sample</span>
        </div>
        <ul className="cx-themes">
          {themes.map((t) => (
            <li key={t.label}>
              <span>{t.label}</span>
              <i style={{ transform: `scaleX(${t.share / 100})` }} />
              <small>{t.share}%</small>
            </li>
          ))}
        </ul>
      </Backstage>
    </div>
  );
}
