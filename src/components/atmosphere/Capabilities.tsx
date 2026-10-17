import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import {
  ArrowUpRight,
  CalendarDays,
  LayoutDashboard,
  MessageSquare,
  Mic,
  Monitor,
  Search,
  Star,
  Workflow,
} from "lucide-react";
import { openContactModal } from "../../lib/siteActions";
import {
  duration,
  ease,
  loadFabric,
  revealText,
  type Fabric,
} from "../../fabric/motion";
import {
  CalendarDemo,
  ChatDemo,
  OperationsDemo,
  ReviewsDemo,
  SearchDemo,
  VoiceDemo,
  WebsiteDemo,
  WorkflowDemo,
} from "./capabilityDemos";
// Load after the shared sheet so these rules win over its global button reset.
import "./atmosphere.css";
import "./capabilities.css";
import "./capabilities-stage.css";

const capabilities = [
  {
    name: "Premium Websites",
    slug: "websites",
    icon: Monitor,
    summary: "Fast, clear, and built to convert.",
    hint: "Try it · switch devices",
    title: "Make your first impression count.",
    copy: "Thoughtful design, clear messaging, and fast experiences that turn interest into a conversation.",
    includes: [
      "Custom design",
      "Mobile-first and accessible",
      "Copy that converts",
      "Analytics tied to inquiries",
    ],
    Demo: WebsiteDemo,
  },
  {
    name: "Search Visibility",
    slug: "search",
    icon: Search,
    summary: "Show up where customers look.",
    hint: "Try it · toggle the foundations",
    title: "Be there when your customers look.",
    copy: "Build a stronger local presence with useful content, sound technical foundations, and meaningful reporting.",
    includes: [
      "Business profile care",
      "Local service pages",
      "Technical foundations",
      "Plain-language reporting",
    ],
    Demo: SearchDemo,
  },
  {
    name: "Calendar & Scheduling",
    slug: "scheduling",
    icon: CalendarDays,
    summary: "Booking without the back-and-forth.",
    hint: "Try it · book a time",
    title: "Less back-and-forth. More booked.",
    copy: "Connect availability, appointments, and reminders so customers and your team know what happens next.",
    includes: [
      "Online booking",
      "Team calendar sync",
      "Text and email reminders",
      "Easy rescheduling",
    ],
    Demo: CalendarDemo,
  },
  {
    name: "Business Applications",
    slug: "business-apps",
    icon: LayoutDashboard,
    summary: "Jobs, crews, and billing in one place.",
    hint: "Try it · move a job forward",
    title: "Your business. Working from one place.",
    copy: "Bring jobs, customers, scheduling, and billing into a practical system built around your operation.",
    includes: [
      "Scheduling and dispatch",
      "Job notes and photos",
      "Invoices and payment links",
      "Owner dashboards",
    ],
    Demo: OperationsDemo,
  },
  {
    name: "Workflow Automation",
    slug: "automation",
    icon: Workflow,
    summary: "Handoffs that happen on their own.",
    hint: "Try it · run the workflow",
    title: "Keep the work moving.",
    copy: "Connect the handoffs between systems, with clear rules, human review, and visibility when something needs attention.",
    includes: [
      "Connections to your existing tools",
      "Rules you can read",
      "Human approval steps",
      "Alerts when something stalls",
    ],
    Demo: WorkflowDemo,
  },
  {
    name: "Reputation & Reviews",
    slug: "reviews",
    icon: Star,
    summary: "Earn, answer, and learn from feedback.",
    hint: "Try it · change the tone",
    title: "Let good work speak for itself.",
    copy: "Request honest feedback, make responding easier, and understand what your customers are telling you.",
    includes: [
      "Automatic review requests",
      "Drafted responses you approve",
      "Themes and sentiment",
      "A monthly reputation summary",
    ],
    Demo: ReviewsDemo,
  },
  {
    name: "AI Chatbots",
    slug: "ai-chatbots",
    icon: MessageSquare,
    summary: "Answers, qualifies, and hands off.",
    hint: "Try it · choose a reply",
    title: "A useful answer. A better first impression.",
    copy: "Help customers find what they need, qualify inquiries, and hand the right context to your team.",
    includes: [
      "Trained on your services and pricing",
      "Website, text, and social",
      "Lead qualification",
      "Human handoff with context",
    ],
    Demo: ChatDemo,
  },
  {
    name: "AI Voice Agents",
    slug: "voice-agents",
    icon: Mic,
    summary: "Picks up every call, day or night.",
    hint: "Try it · play the call",
    title: "A good conversation, even after hours.",
    copy: "Answer routine questions, capture the details, and route sensitive or complex requests to a person.",
    includes: [
      "After-hours and overflow calls",
      "A natural, on-brand voice",
      "Safety and urgency screening",
      "Summaries sent to your team",
    ],
    Demo: VoiceDemo,
  },
];

const STAGED = "(min-width: 1024px) and (min-height: 700px)";

export function Capabilities() {
  const [active, setActive] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const section = useRef<HTMLElement>(null);
  const fabricRef = useRef<Fabric | null>(null);
  const triggerRef = useRef<{ start: number; end: number } | null>(null);
  const activeRef = useRef(0);
  const selected = capabilities[active];
  const { Demo } = selected;

  // In the pinned layout, scroll position is the source of truth: choosing a
  // tab scrolls to that capability's slot so the two never disagree.
  const choose = (index: number) => {
    const st = triggerRef.current;
    const lenis = fabricRef.current?.lenis;
    if (st && lenis && matchMedia(STAGED).matches) {
      const slot = (st.end - st.start) / capabilities.length;
      lenis.scrollTo(st.start + slot * (index + 0.5), { duration: 1.1 });
    }
    setActive(index);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step =
      event.key === "ArrowDown" || event.key === "ArrowRight"
        ? 1
        : event.key === "ArrowUp" || event.key === "ArrowLeft"
          ? -1
          : 0;
    if (!step) return;
    event.preventDefault();
    const next = (active + step + capabilities.length) % capabilities.length;
    choose(next);
    tabs.current[next]?.focus();
  };

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    const el = section.current;
    if (!el) return;
    let ctx: { revert: () => void } | undefined;
    let alive = true;
    loadFabric().then((f) => {
      if (!f || !alive) return;
      fabricRef.current = f;
      ctx = f.gsap.context(() => {
        const q = f.gsap.utils.selector(el);
        const mm = f.gsap.matchMedia();
        revealText(f, q(".cv-heading")[0], { type: "words", start: "top 80%" });
        f.gsap.from(q(".section-heading > p, .cx-nav button"), {
          autoAlpha: 0,
          y: 18,
          stagger: 0.05,
          duration: duration.slow,
          scrollTrigger: { trigger: el, start: "top 65%", once: true },
        });

        mm.add(STAGED, () => {
          const st = f.ScrollTrigger.create({
            trigger: el,
            start: "top top",
            end: "bottom bottom",
            onUpdate: (self) => {
              const next = Math.min(
                capabilities.length - 1,
                Math.floor(self.progress * capabilities.length * 1.0001),
              );
              if (next !== activeRef.current) setActive(next);
            },
            onRefresh: (self) => {
              triggerRef.current = { start: self.start, end: self.end };
            },
          });
          triggerRef.current = { start: st.start, end: st.end };
          const tl = f.gsap.timeline({
            defaults: { ease: "none" },
            scrollTrigger: {
              trigger: el,
              start: "top top",
              end: "bottom bottom",
              scrub: 0.6,
            },
          });
          tl.fromTo(
            q(".cv-rail-fill"),
            { scaleY: 0 },
            { scaleY: 1, duration: 1 },
            0,
          )
            .fromTo(
              q(".cv-fog-a"),
              { xPercent: -12 },
              { xPercent: 10, duration: 1 },
              0,
            )
            .fromTo(
              q(".cv-fog-b"),
              { xPercent: 10 },
              { xPercent: -12, duration: 1 },
              0,
            )
            .fromTo(
              q(".cv-glow"),
              { yPercent: 12, xPercent: -6 },
              { yPercent: -14, xPercent: 6, duration: 1 },
              0,
            )
            .fromTo(
              q(".cx-panel"),
              { rotateX: 4, y: 24 },
              { rotateX: 0, y: 0, duration: 0.08, ease: ease.soft },
              0,
            )
            .to(q(".cv-dusk"), { autoAlpha: 1, duration: 0.07 }, 0.93)
            .to(
              q(".cv-content"),
              { autoAlpha: 0.4, yPercent: -3, duration: 0.07 },
              0.93,
            );
          return () => {
            st.kill();
            triggerRef.current = null;
          };
        });
      }, el);
    });
    return () => {
      alive = false;
      ctx?.revert();
    };
  }, []);

  // The demo window morphs between capabilities: the screen re-lights from
  // behind a soft blur while the caption's words rise into place.
  useEffect(() => {
    const f = fabricRef.current;
    const el = section.current;
    if (!f || !el) return;
    const q = f.gsap.utils.selector(el);
    const split = f.SplitText.create(q(".cx-caption h3")[0], {
      type: "words",
      mask: "words",
    });
    const tl = f.gsap
      .timeline({ defaults: { ease: ease.out } })
      .fromTo(
        q(".cx-stage"),
        {
          autoAlpha: 0,
          scale: 0.965,
          filter: "blur(8px)",
          clipPath: "inset(6% 4% 6% 4% round 10px)",
        },
        {
          autoAlpha: 1,
          scale: 1,
          filter: "blur(0px)",
          clipPath: "inset(0% 0% 0% 0% round 0px)",
          duration: 0.9,
        },
      )
      .from(split.words, { yPercent: 110, stagger: 0.04, duration: 0.8 }, 0.1)
      .from(
        q(".cx-caption p, .cx-caption li, .cx-discuss"),
        { autoAlpha: 0, y: 10, stagger: 0.04, duration: 0.6 },
        0.2,
      )
      .fromTo(
        q(".cx-path"),
        { autoAlpha: 0.3 },
        { autoAlpha: 1, duration: 0.5 },
        0,
      );
    return () => {
      tl.kill();
      split.revert();
      f.gsap.set(q(".cx-stage, .cx-caption p, .cx-caption li, .cx-discuss"), {
        clearProps: "all",
      });
    };
  }, [active]);

  return (
    <section
      ref={section}
      id="capabilities"
      className="capabilities-section capabilities-v2"
    >
      <div className="cv-stage">
        <div className="cv-layers" aria-hidden="true">
          <div className="cv-glow" />
          <div className="cv-fog-a" />
          <div className="cv-fog-b" />
          <div className="cv-dusk" />
        </div>
        <div className="page-width cv-content">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Capabilities in motion</p>
              <h2 className="cv-heading">
                Powerful possibilities.
                <br />
                <em>Practical by design.</em>
              </h2>
            </div>
            <p>
              Explore what better can look like. Each window shows what your
              customers experience, and what your team receives behind the
              scenes.
            </p>
          </div>
          <div className="cx-atelier">
            <div
              className="cx-nav"
              role="tablist"
              aria-label="Capabilities"
              aria-orientation="vertical"
              onKeyDown={onKeyDown}
            >
              <span className="cv-rail" aria-hidden="true">
                <span className="cv-rail-fill" />
              </span>
              {capabilities.map((c, i) => (
                <button
                  key={c.slug}
                  ref={(el) => {
                    tabs.current[i] = el;
                  }}
                  role="tab"
                  id={`cx-tab-${c.slug}`}
                  aria-selected={active === i}
                  aria-controls="cx-panel"
                  tabIndex={active === i ? 0 : -1}
                  onClick={() => choose(i)}
                >
                  <span className="cx-index">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="cx-nav-name">
                    {c.name}
                    <small>{c.summary}</small>
                  </span>
                  <c.icon size={16} aria-hidden="true" />
                </button>
              ))}
            </div>
            <div
              className="cx-panel"
              id="cx-panel"
              role="tabpanel"
              aria-labelledby={`cx-tab-${selected.slug}`}
            >
              <div className="cx-chrome">
                <span aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
                <span className="cx-path">
                  Sentient <b>/</b> possibilities <b>/</b> {selected.slug}
                </span>
                <small>
                  <i className="cx-live" aria-hidden="true" /> {selected.hint}
                </small>
              </div>
              <div className="cx-stage" key={selected.slug}>
                <Demo />
              </div>
              <div className="cx-caption">
                <div>
                  <h3 key={selected.slug}>{selected.title}</h3>
                  <p>{selected.copy}</p>
                  <ul aria-label="Included">
                    {selected.includes.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                <button
                  className="cx-discuss"
                  onClick={() =>
                    openContactModal({
                      source: "Capability showcase",
                      inquiry: `I'd like to explore ${selected.name.toLowerCase()} for my business.`,
                    })
                  }
                >
                  <span>Discuss {selected.name}</span>
                  <i>
                    <ArrowUpRight size={20} />
                  </i>
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
      </div>
    </section>
  );
}
